/**
 * DTN Envelope Builder
 * Generates stable UUIDs and device IDs for outgoing messages.
 * The device ID is a persistent random nonce stored in IndexedDB,
 * giving each browser/device a stable identity without server interaction.
 */

import type { LocalMessage, OutboxItem } from "./messageStore";

const DEVICE_ID_KEY = "dtn-device-id";
const DEVICE_DB = "securechat-dtn-device";
const DEVICE_DB_VERSION = 1;

let _deviceId: string | null = null;

// --- UUID v4 generator ---

function generateUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without randomUUID
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

// --- Device ID (stable per browser/device) ---

async function initDeviceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DEVICE_DB, DEVICE_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;

  try {
    const db = await initDeviceDb();
    const existing: string | undefined = await new Promise((res, rej) => {
      const req = db
        .transaction("meta", "readonly")
        .objectStore("meta")
        .get(DEVICE_ID_KEY);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });

    if (existing) {
      _deviceId = existing;
      return _deviceId;
    }

    // Generate and persist a new device ID
    const newId = generateUuid();
    await new Promise<void>((res, rej) => {
      const req = db
        .transaction("meta", "readwrite")
        .objectStore("meta")
        .put(newId, DEVICE_ID_KEY);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
    _deviceId = newId;
    return _deviceId;
  } catch (e) {
    // Fallback: session-only device ID if IndexedDB is unavailable
    console.warn(
      "[dtnEnvelope] Could not persist device ID, using session ID",
      e,
    );
    _deviceId = generateUuid();
    return _deviceId;
  }
}

// --- Envelope builder ---

export interface EnvelopeParams {
  conversationId: bigint;
  senderPrincipal: string;
  content: string;
  messageType: string;
  mediaBlob?: unknown;
  mediaName?: string | null;
  mediaSize?: bigint | null;
  replyToId?: bigint | null;
  mentionedPrincipals?: string[] | null;
  recipientHint?: string; // routing identity for relay
  ttl?: bigint; // expiry (seconds from now)
}

export async function buildEnvelope(
  params: EnvelopeParams,
): Promise<OutboxItem> {
  const uuid = generateUuid();
  const deviceId = await getDeviceId();
  const now = BigInt(Date.now()) * 1_000_000n; // nanoseconds

  const localMessage: LocalMessage = {
    messageUuid: uuid,
    id: 0n, // will be set by canister on confirm
    conversationId: params.conversationId,
    sender: params.senderPrincipal,
    content: params.content,
    messageType: params.messageType,
    mediaName: params.mediaName ?? undefined,
    mediaSize: params.mediaSize ?? undefined,
    replyToId: params.replyToId ?? undefined,
    timestamp: now,
    deleted: false,
    reactions: [],
    senderDeviceId: deviceId,
    recipientHint: params.recipientHint,
    protocolVersion: 1n,
    hopCount: 0n,
    sendStatus: "queued",
  };

  return {
    messageUuid: uuid,
    conversationId: params.conversationId,
    content: params.content,
    messageType: params.messageType,
    mediaBlob: params.mediaBlob,
    mediaName: params.mediaName,
    mediaSize: params.mediaSize,
    replyToId: params.replyToId,
    mentionedPrincipals: params.mentionedPrincipals,
    recipientHint: params.recipientHint,
    senderDeviceId: deviceId,
    retryCount: 0,
    createdAt: Date.now(),
    localMessage,
  };
}
