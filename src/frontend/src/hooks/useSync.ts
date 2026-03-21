/**
 * DTN Sync Hook
 * Orchestrates the local message store, outbox flushing, and IC cursor sync.
 * Replaces the raw refetchInterval polling in useMessages().
 *
 * ChatView (Step 7) will switch to this hook — until then it runs standalone.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { type EnvelopeParams, buildEnvelope } from "../utils/dtnEnvelope";
import {
  type LocalMessage,
  type OutboxItem,
  addToOutbox,
  getCursor,
  getLocalMessages,
  getOutbox,
  putMessage,
  removeFromOutbox,
  setCursor,
  updateOutboxRetry,
} from "../utils/messageStore";
import { createIcpTransport } from "../utils/transport";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

const POLL_INTERVAL_ACTIVE = 3_000; // ms — when messages are flowing
const POLL_INTERVAL_IDLE = 15_000; // ms — back off when quiet
const IDLE_CYCLES_THRESHOLD = 3; // cycles with no new messages before backing off
const MAX_RETRY_COUNT = 5;

export interface UseSyncReturn {
  messages: LocalMessage[];
  isOnline: boolean;
  isSyncing: boolean;
  outboxCount: number;
  sendMessage: (
    params: Omit<EnvelopeParams, "senderPrincipal">,
  ) => Promise<void>;
  refetch: () => void;
}

export function useSync(conversationId: bigint | null): UseSyncReturn {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);

  const idleCycles = useRef(0);
  const pollInterval = useRef(POLL_INTERVAL_ACTIVE);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRef = useRef(conversationId);
  conversationRef.current = conversationId;

  // Track online/offline
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Load messages from IndexedDB immediately on mount (no IC call needed)
  const loadLocal = useCallback(async () => {
    if (!conversationRef.current) return;
    const local = await getLocalMessages(conversationRef.current);
    if (local.length > 0) {
      setMessages(local);
    }
  }, []);

  // Flush outbox to IC
  const flushOutbox = useCallback(async () => {
    if (!actor || !isOnline) return;
    const outbox = await getOutbox();
    if (outbox.length === 0) {
      setOutboxCount(0);
      return;
    }
    setOutboxCount(outbox.length);
    const transport = createIcpTransport(actor);
    for (const item of outbox) {
      try {
        await transport.send(item);
        await removeFromOutbox(item.messageUuid);
        // Mark delivered in local store
        const updated: LocalMessage = {
          ...item.localMessage,
          sendStatus: "delivered",
        };
        await putMessage(updated);
      } catch (e) {
        console.warn("[useSync] outbox flush failed for", item.messageUuid, e);
        if (item.retryCount >= MAX_RETRY_COUNT) {
          // Give up — remove from outbox to prevent infinite retry
          await removeFromOutbox(item.messageUuid);
        } else {
          await updateOutboxRetry(item.messageUuid, item.retryCount + 1);
        }
      }
    }
    const remaining = await getOutbox();
    setOutboxCount(remaining.length);
  }, [actor, isOnline]);

  // Fetch new messages from IC using cursor
  const syncFromIc = useCallback(async () => {
    if (!actor || !conversationRef.current || !isOnline) return;

    setIsSyncing(true);
    try {
      const cursor = await getCursor(conversationRef.current);
      const fromId = cursor?.lastMessageId ?? 0;
      const transport = createIcpTransport(actor);
      const newMessages = await transport.fetchSince(
        conversationRef.current,
        fromId,
      );

      if (newMessages.length > 0) {
        for (const msg of newMessages) {
          await putMessage(msg);
        }
        // Update cursor to the highest message ID seen
        const maxId = newMessages.reduce(
          (acc, m) => (Number(m.id) > acc ? Number(m.id) : acc),
          fromId,
        );
        await setCursor(conversationRef.current, maxId);

        // Reload from local store
        const local = await getLocalMessages(conversationRef.current);
        setMessages(local);

        idleCycles.current = 0;
        pollInterval.current = POLL_INTERVAL_ACTIVE;
      } else {
        idleCycles.current += 1;
        if (idleCycles.current >= IDLE_CYCLES_THRESHOLD) {
          pollInterval.current = POLL_INTERVAL_IDLE;
        }
      }
    } catch (e) {
      console.warn("[useSync] IC sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, [actor, isOnline]);

  // Polling loop
  const scheduleNextPoll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await flushOutbox();
      await syncFromIc();
      scheduleNextPoll();
    }, pollInterval.current);
  }, [flushOutbox, syncFromIc]);

  // Initialise: load local, then sync, then start poll loop
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only re-run when conversation or actor changes
  useEffect(() => {
    if (!conversationId) return;

    loadLocal();
    flushOutbox();
    syncFromIc();
    scheduleNextPoll();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [conversationId, actor]);

  // Flush outbox immediately when we come back online
  useEffect(() => {
    if (isOnline) {
      flushOutbox();
      syncFromIc();
    }
  }, [isOnline, flushOutbox, syncFromIc]);

  // Send a new message: write to outbox + IndexedDB first, then flush
  const sendMessage = useCallback(
    async (params: Omit<EnvelopeParams, "senderPrincipal">) => {
      const senderPrincipal = identity?.getPrincipal().toString() ?? "";
      const envelope = await buildEnvelope({ ...params, senderPrincipal });

      // Write optimistic copy to local store immediately
      await putMessage(envelope.localMessage);
      setMessages((prev) => {
        const exists = prev.some((m) => m.messageUuid === envelope.messageUuid);
        if (exists) return prev;
        return [...prev, envelope.localMessage];
      });

      // Queue for IC delivery
      await addToOutbox(envelope);
      setOutboxCount((c) => c + 1);

      // Attempt immediate flush
      if (actor && isOnline) {
        await flushOutbox();
      }
    },
    [actor, identity, isOnline, flushOutbox],
  );

  const refetch = useCallback(() => {
    idleCycles.current = 0;
    pollInterval.current = POLL_INTERVAL_ACTIVE;
    syncFromIc();
  }, [syncFromIc]);

  return { messages, isOnline, isSyncing, outboxCount, sendMessage, refetch };
}

// ---- Standalone outbox flusher (call on app start) ----
// Flushes any messages that were queued while the app was closed.
export async function flushAllOutboxes(actor: unknown): Promise<void> {
  if (!actor || !navigator.onLine) return;
  try {
    const outbox = await getOutbox();
    if (outbox.length === 0) return;
    const transport = createIcpTransport(actor as any);
    for (const item of outbox) {
      try {
        await transport.send(item);
        await removeFromOutbox(item.messageUuid);
      } catch {
        // Silent — will be retried on next sync cycle
      }
    }
  } catch (e) {
    console.warn("[useSync] flushAllOutboxes failed", e);
  }
}
