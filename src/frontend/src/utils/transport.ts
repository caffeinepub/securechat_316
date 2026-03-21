/**
 * DTN Transport Interface
 * Defines the plug-in contract for all message transports.
 * The IC canister is the first implementation.
 * WebRTC (Phase 2) and Bluetooth (Phase 3) will implement the same interface.
 */

import type { backendInterface } from "../backend";
import type { LocalMessage, OutboxItem } from "./messageStore";

// ---- Transport interface ----

export interface Transport {
  /**
   * Send an outbox item to this relay.
   * Must be idempotent — retrying the same messageUuid must not duplicate.
   */
  send(item: OutboxItem): Promise<void>;

  /**
   * Fetch messages for a conversation newer than fromMessageId.
   * Returns an ordered array from oldest to newest.
   */
  fetchSince(
    conversationId: bigint,
    fromMessageId: number,
  ): Promise<LocalMessage[]>;
}

// ---- IC Canister Transport (first relay implementation) ----

export class IcpTransport implements Transport {
  constructor(private actor: backendInterface) {}

  async send(item: OutboxItem): Promise<void> {
    // Use sendMessageWithDtn if available, fall back to sendMessage
    if (typeof (this.actor as any).sendMessageWithDtn === "function") {
      await (this.actor as any).sendMessageWithDtn(
        item.conversationId,
        item.content,
        this.encodeMessageType(item.messageType),
        item.mediaBlob ?? null,
        item.mediaName ?? null,
        item.mediaSize ?? null,
        item.replyToId ?? null,
        item.mentionedPrincipals
          ? item.mentionedPrincipals.map((p: string) => {
              const { Principal } = require("@dfinity/principal");
              return Principal.fromText(p);
            })
          : null,
        [item.messageUuid], // ?Text  -> [] | [string]
        item.senderDeviceId ? [item.senderDeviceId] : [],
        item.recipientHint ? [item.recipientHint] : [],
        item.ttl ? [item.ttl] : [],
      );
    } else {
      // Fallback to legacy sendMessage (no DTN metadata)
      await this.actor.sendMessage(
        item.conversationId,
        item.content,
        this.encodeMessageType(item.messageType),
        (item.mediaBlob as any) ?? null,
        item.mediaName ?? null,
        item.mediaSize ?? null,
        item.replyToId ?? null,
        null,
      );
    }
  }

  async fetchSince(
    conversationId: bigint,
    fromMessageId: number,
  ): Promise<LocalMessage[]> {
    let raw: unknown[];

    if (typeof (this.actor as any).getMessagesSince === "function") {
      raw = await (this.actor as any).getMessagesSince(
        conversationId,
        BigInt(fromMessageId),
        BigInt(50),
      );
    } else {
      // Fallback: fetch last 50 messages from legacy endpoint
      raw = await this.actor.getMessages(conversationId, null, BigInt(50));
    }

    return (raw as any[]).map(this.toLocalMessage);
  }

  private toLocalMessage(raw: any): LocalMessage {
    // The canister Message type does not carry DTN fields (stored separately in dtnMetadata).
    // We derive a stable UUID from the canister-assigned message id for deduplication.
    const uuid = `ic-${raw.conversationId.toString()}-${raw.id.toString()}`;
    return {
      messageUuid: uuid,
      id: raw.id,
      conversationId: raw.conversationId,
      sender: raw.sender.toString(),
      content: raw.content,
      messageType: Object.keys(raw.messageType)[0],
      mediaName: raw.mediaName?.[0],
      mediaSize: raw.mediaSize?.[0],
      replyToId: raw.replyToId?.[0],
      timestamp: raw.timestamp,
      deleted: raw.deleted,
      reactions: raw.reactions.map(([p, e]: [any, string]) => [
        p.toString(),
        e,
      ]),
      protocolVersion: 0n, // legacy messages have no DTN metadata
      sendStatus: "delivered",
    };
  }

  private encodeMessageType(type: string): any {
    switch (type) {
      case "Image":
        return { Image: null };
      case "File":
        return { File: null };
      case "Audio":
        return { Audio: null };
      case "Video":
        return { Video: null };
      default:
        return { Text: null };
    }
  }
}

// ---- Factory ----
// Additional transports (WebRtcTransport, BluetoothTransport) will be
// added here in Phase 2 and Phase 3 without touching any other code.

export function createIcpTransport(actor: backendInterface): IcpTransport {
  return new IcpTransport(actor);
}
