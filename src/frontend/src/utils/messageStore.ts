/**
 * DTN Local Message Store
 * IndexedDB-backed local log for messages, outbox, and sync cursors.
 * This is the source of truth for the UI — the IC canister is just a relay.
 */

export interface LocalMessage {
  messageUuid: string;
  id: bigint;
  conversationId: bigint;
  sender: string;
  content: string;
  messageType: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: bigint;
  replyToId?: bigint;
  timestamp: bigint;
  deleted: boolean;
  reactions: Array<[string, string]>;
  sequenceNum?: bigint;
  protocolVersion?: bigint;
  senderDeviceId?: string;
  recipientHint?: string;
  ttl?: bigint;
  hopCount?: bigint;
  contentHash?: string;
  // Local-only send state
  sendStatus?: "queued" | "sending" | "delivered";
}

export interface OutboxItem {
  messageUuid: string;
  conversationId: bigint;
  content: string;
  messageType: string;
  mediaBlob?: unknown;
  mediaName?: string | null;
  mediaSize?: bigint | null;
  replyToId?: bigint | null;
  mentionedPrincipals?: string[] | null;
  recipientHint?: string;
  ttl?: bigint;
  senderDeviceId?: string;
  retryCount: number;
  createdAt: number;
  // Optimistic local copy to display immediately
  localMessage: LocalMessage;
}

export interface SyncCursor {
  conversationId: bigint;
  lastMessageId: number;
  lastSyncedAt: number;
}

const DB_NAME = "securechat-dtn";
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

async function openDb(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("messages")) {
        const msgStore = db.createObjectStore("messages", {
          keyPath: "messageUuid",
        });
        msgStore.createIndex("byConversation", "conversationId");
        msgStore.createIndex("byTimestamp", "timestamp");
      }
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "messageUuid" });
      }
      if (!db.objectStoreNames.contains("syncCursors")) {
        db.createObjectStore("syncCursors", { keyPath: "conversationId" });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
): IDBTransaction {
  return db.transaction(stores, mode);
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Messages ---

export async function putMessage(msg: LocalMessage): Promise<void> {
  try {
    const db = await openDb();
    await wrap(
      tx(db, "messages", "readwrite").objectStore("messages").put(msg),
    );
  } catch (e) {
    console.warn("[messageStore] putMessage failed", e);
  }
}

export async function getLocalMessages(
  conversationId: bigint,
): Promise<LocalMessage[]> {
  try {
    const db = await openDb();
    const store = tx(db, "messages", "readonly").objectStore("messages");
    const all = await wrap<LocalMessage[]>(store.getAll());
    return all
      .filter((m) => m.conversationId.toString() === conversationId.toString())
      .sort((a, b) => {
        const at =
          typeof a.timestamp === "bigint" ? a.timestamp : BigInt(a.timestamp);
        const bt =
          typeof b.timestamp === "bigint" ? b.timestamp : BigInt(b.timestamp);
        return at < bt ? -1 : at > bt ? 1 : 0;
      });
  } catch (e) {
    console.warn("[messageStore] getLocalMessages failed", e);
    return [];
  }
}

export async function hasMessage(uuid: string): Promise<boolean> {
  try {
    const db = await openDb();
    const result = await wrap(
      tx(db, "messages", "readonly").objectStore("messages").get(uuid),
    );
    return result !== undefined;
  } catch {
    return false;
  }
}

// --- Outbox ---

export async function addToOutbox(item: OutboxItem): Promise<void> {
  try {
    const db = await openDb();
    await wrap(tx(db, "outbox", "readwrite").objectStore("outbox").put(item));
  } catch (e) {
    console.warn("[messageStore] addToOutbox failed", e);
  }
}

export async function getOutbox(): Promise<OutboxItem[]> {
  try {
    const db = await openDb();
    return wrap<OutboxItem[]>(
      tx(db, "outbox", "readonly").objectStore("outbox").getAll(),
    );
  } catch {
    return [];
  }
}

export async function removeFromOutbox(uuid: string): Promise<void> {
  try {
    const db = await openDb();
    await wrap(
      tx(db, "outbox", "readwrite").objectStore("outbox").delete(uuid),
    );
  } catch (e) {
    console.warn("[messageStore] removeFromOutbox failed", e);
  }
}

export async function updateOutboxRetry(
  uuid: string,
  retryCount: number,
): Promise<void> {
  try {
    const db = await openDb();
    const store = tx(db, "outbox", "readwrite").objectStore("outbox");
    const existing = await wrap<OutboxItem>(store.get(uuid));
    if (existing) {
      await wrap(store.put({ ...existing, retryCount }));
    }
  } catch (e) {
    console.warn("[messageStore] updateOutboxRetry failed", e);
  }
}

// --- Sync Cursors ---

export async function getCursor(
  conversationId: bigint,
): Promise<SyncCursor | null> {
  try {
    const db = await openDb();
    const result = await wrap<SyncCursor>(
      tx(db, "syncCursors", "readonly")
        .objectStore("syncCursors")
        .get(conversationId.toString()),
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export async function setCursor(
  conversationId: bigint,
  lastMessageId: number,
): Promise<void> {
  try {
    const db = await openDb();
    await wrap(
      tx(db, "syncCursors", "readwrite").objectStore("syncCursors").put({
        conversationId: conversationId.toString(),
        lastMessageId,
        lastSyncedAt: Date.now(),
      }),
    );
  } catch (e) {
    console.warn("[messageStore] setCursor failed", e);
  }
}
