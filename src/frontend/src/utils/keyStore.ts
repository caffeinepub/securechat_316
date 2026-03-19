const DB_NAME = "securechat-e2ee";
const DB_VERSION = 1;
const KEY_PAIR_STORE = "keyPairs";
const CONV_KEY_STORE = "conversationKeys";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_PAIR_STORE)) {
        db.createObjectStore(KEY_PAIR_STORE);
      }
      if (!db.objectStoreNames.contains(CONV_KEY_STORE)) {
        db.createObjectStore(CONV_KEY_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txGet<T>(storeName: string, key: string): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txPut(storeName: string, key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

function txDelete(storeName: string, key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

function txGetAll<T>(storeName: string): Promise<{ key: string; value: T }[]> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const entries: { key: string; value: T }[] = [];
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            entries.push({ key: cursor.key as string, value: cursor.value });
            cursor.continue();
          } else {
            resolve(entries);
          }
        };
        req.onerror = () => reject(req.error);
      }),
  );
}

export interface StoredKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

// Key pair operations (keyed by principal)
export async function saveKeyPair(
  principal: string,
  keyPair: StoredKeyPair,
): Promise<void> {
  return txPut(KEY_PAIR_STORE, principal, keyPair);
}

export async function getKeyPair(
  principal: string,
): Promise<StoredKeyPair | null> {
  return txGet<StoredKeyPair>(KEY_PAIR_STORE, principal);
}

// Conversation key operations (keyed by "convId" or "convId:principal" for direct)
export async function saveConversationKey(
  conversationKey: string,
  rawKey: JsonWebKey,
): Promise<void> {
  return txPut(CONV_KEY_STORE, conversationKey, rawKey);
}

export async function getConversationKey(
  conversationKey: string,
): Promise<JsonWebKey | null> {
  return txGet<JsonWebKey>(CONV_KEY_STORE, conversationKey);
}

export async function deleteConversationKey(
  conversationKey: string,
): Promise<void> {
  return txDelete(CONV_KEY_STORE, conversationKey);
}

// Clear all E2EE keys (for logout)
export async function clearAllKeys(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([KEY_PAIR_STORE, CONV_KEY_STORE], "readwrite");
  tx.objectStore(KEY_PAIR_STORE).clear();
  tx.objectStore(CONV_KEY_STORE).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Export all keys for backup
export async function exportAllKeys(): Promise<{
  keyPairs: { key: string; value: StoredKeyPair }[];
  conversationKeys: { key: string; value: JsonWebKey }[];
}> {
  const keyPairs = await txGetAll<StoredKeyPair>(KEY_PAIR_STORE);
  const conversationKeys = await txGetAll<JsonWebKey>(CONV_KEY_STORE);
  return { keyPairs, conversationKeys };
}

// Import all keys from backup
export async function importAllKeys(data: {
  keyPairs: { key: string; value: StoredKeyPair }[];
  conversationKeys: { key: string; value: JsonWebKey }[];
}): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([KEY_PAIR_STORE, CONV_KEY_STORE], "readwrite");
  const kpStore = tx.objectStore(KEY_PAIR_STORE);
  const ckStore = tx.objectStore(CONV_KEY_STORE);
  for (const { key, value } of data.keyPairs) {
    kpStore.put(value, key);
  }
  for (const { key, value } of data.conversationKeys) {
    ckStore.put(value, key);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
