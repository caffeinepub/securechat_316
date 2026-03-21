/**
 * WebRTC Transport - P2P data channel for DTN peer sync
 *
 * Protocol:
 * 1. Both sides send: {type:'hello', uuids: string[]} - list of text message UUIDs
 * 2. On receiving hello: send {type:'messages', items: OutboxItem[]} for the diff
 * 3. Both sides send {type:'done'} after sending messages
 * 4. When both 'done' received: resolve with SyncResult
 *
 * Text-only relay: images/voice notes excluded for performance.
 */
import { getOutbox, putMessage } from "./messageStore";
import type { OutboxItem } from "./messageStore";

const STUN_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

const DATA_CHANNEL_LABEL = "securechat-sync";

export interface SyncResult {
  sent: number;
  received: number;
}

export interface HostSession {
  pc: RTCPeerConnection;
  promise: Promise<SyncResult>;
}

type SyncMessage =
  | { type: "hello"; uuids: string[] }
  | { type: "messages"; items: OutboxItem[] }
  | { type: "done" };

function isTextMessage(item: OutboxItem): boolean {
  const t = item.messageType ?? "";
  return t.toLowerCase() === "text";
}

async function getTextOutbox(): Promise<OutboxItem[]> {
  try {
    const all = await getOutbox();
    return all.filter(isTextMessage);
  } catch {
    return [];
  }
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", check);
    // Fallback: resolve after 5s to avoid hanging on slow ICE gathering
    setTimeout(resolve, 5000);
  });
}

function runDataExchange(
  channel: RTCDataChannel,
  localTextOutbox: OutboxItem[],
  onConnected: () => void,
  exchangeTimeoutMs = 30000,
): Promise<SyncResult> {
  return new Promise((resolve, reject) => {
    let sentCount = 0;
    let receivedCount = 0;
    let sentDone = false;
    let receivedDone = false;
    let helloSent = false;
    let settled = false;

    const localUuids = localTextOutbox.map((o) => o.messageUuid);

    const settle = (result: SyncResult | Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (result instanceof Error) {
        reject(result);
      } else {
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      settle(new Error("Exchange timed out"));
    }, exchangeTimeoutMs);

    const checkDone = () => {
      if (sentDone && receivedDone) {
        settle({ sent: sentCount, received: receivedCount });
      }
    };

    const sendHello = () => {
      if (helloSent) return;
      helloSent = true;
      channel.send(JSON.stringify({ type: "hello", uuids: localUuids }));
    };

    const handleMessage = async (event: MessageEvent) => {
      try {
        const msg: SyncMessage = JSON.parse(event.data as string);
        if (msg.type === "hello") {
          const peerSet = new Set(msg.uuids);
          const toSend = localTextOutbox.filter(
            (item) => !peerSet.has(item.messageUuid),
          );
          if (toSend.length > 0) {
            channel.send(JSON.stringify({ type: "messages", items: toSend }));
            sentCount = toSend.length;
          }
          channel.send(JSON.stringify({ type: "done" }));
          sentDone = true;
          checkDone();
        } else if (msg.type === "messages") {
          for (const item of msg.items) {
            if (item.localMessage) {
              await putMessage(item.localMessage);
              receivedCount++;
            }
          }
        } else if (msg.type === "done") {
          receivedDone = true;
          checkDone();
        }
      } catch (e) {
        console.error("[webrtcTransport] message error", e);
      }
    };

    if (channel.readyState === "open") {
      onConnected();
      sendHello();
    }

    channel.onopen = () => {
      onConnected();
      sendHello();
    };

    channel.onmessage = handleMessage;

    channel.onerror = () => {
      settle(new Error("Data channel error"));
    };

    channel.onclose = () => {
      if (!settled) {
        settle(new Error("Data channel closed before sync completed"));
      }
    };
  });
}

/**
 * Host a sync session. Creates an RTCPeerConnection and data channel,
 * generates an SDP offer, and calls onOffer once the offer is ready.
 *
 * Returns { pc, promise }. After pollForAnswer returns an answer, call
 * setRemoteAnswer(pc, answerSdp) to complete the connection, then await promise.
 */
export function hostSession(
  localOutbox: OutboxItem[],
  onOffer: (offerSdp: string) => void,
  onConnected: () => void,
  timeoutMs = 90000,
): HostSession {
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
  const channel = pc.createDataChannel(DATA_CHANNEL_LABEL);

  const textOutboxPromise = getTextOutbox();
  // localOutbox is passed but we use internal text filtering
  void localOutbox;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Host session timed out")), timeoutMs),
  );

  const runPromise = (async (): Promise<SyncResult> => {
    const localTextOutbox = await textOutboxPromise;
    const exchangePromise = runDataExchange(
      channel,
      localTextOutbox,
      onConnected,
    );

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);
    onOffer(pc.localDescription!.sdp);

    const result = await exchangePromise;
    pc.close();
    return result;
  })();

  const promise = Promise.race([runPromise, timeoutPromise]);

  return { pc, promise };
}

/**
 * Join an existing sync session by setting the remote offer SDP.
 * Generates an answer SDP and calls onAnswer once ready.
 */
export async function joinSession(
  offerSdp: string,
  onAnswer: (answerSdp: string) => Promise<void>,
  onConnected: () => void,
  timeoutMs = 90000,
): Promise<SyncResult> {
  const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

  const channelPromise = new Promise<RTCDataChannel>((resolve) => {
    pc.ondatachannel = (event) => {
      resolve(event.channel);
    };
  });

  await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceGathering(pc);
  await onAnswer(pc.localDescription!.sdp);

  const timeoutErr = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Join session timed out")), timeoutMs),
  );

  const channel = await Promise.race([
    channelPromise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Data channel not opened by host")),
        timeoutMs,
      ),
    ),
  ]);

  const localTextOutbox = await getTextOutbox();

  try {
    const result = await Promise.race([
      runDataExchange(channel, localTextOutbox, onConnected),
      timeoutErr,
    ]);
    pc.close();
    return result;
  } catch (e) {
    pc.close();
    throw e;
  }
}

/**
 * Set the remote answer SDP on a host peer connection.
 * Call this after pollForAnswer() returns the joiner's answer.
 */
export async function setRemoteAnswer(
  pc: RTCPeerConnection,
  answerSdp: string,
): Promise<void> {
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
}
