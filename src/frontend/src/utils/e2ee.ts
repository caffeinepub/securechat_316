const E2E_PREFIX = "e2e:";
const IV_LENGTH = 12;

// ECDH key pair generation (P-256)
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
}

// Export public key as raw bytes
export async function exportPublicKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

// Import public key from raw bytes
export async function importPublicKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
}

// Export key pair as JWK for IndexedDB storage
export async function exportKeyPairAsJwk(
  keyPair: CryptoKeyPair,
): Promise<{ publicKey: JsonWebKey; privateKey: JsonWebKey }> {
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.exportKey("jwk", keyPair.publicKey),
    crypto.subtle.exportKey("jwk", keyPair.privateKey),
  ]);
  return { publicKey, privateKey };
}

// Import key pair from JWK
export async function importKeyPairFromJwk(jwk: {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}): Promise<CryptoKeyPair> {
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.importKey(
      "jwk",
      jwk.publicKey,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      [],
    ),
    crypto.subtle.importKey(
      "jwk",
      jwk.privateKey,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"],
    ),
  ]);
  return { publicKey, privateKey };
}

// Derive AES-256-GCM key for direct chat using ECDH + HKDF
export async function deriveDirectChatKey(
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<CryptoKey> {
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublicKey },
    myPrivateKey,
    256,
  );
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: new TextEncoder().encode("securechat-e2ee-v1"),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

// Generate random AES-256-GCM key for group chats
export async function generateGroupKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// Export AES key as raw bytes
export async function exportAesKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

// Import AES key from raw bytes
export async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

// Wrap a group key for a specific member using their pairwise ECDH-derived key
export async function wrapGroupKey(
  groupKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<Uint8Array> {
  const rawGroupKey = await exportAesKey(groupKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    rawGroupKey as BufferSource,
  );
  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), IV_LENGTH);
  return result;
}

// Unwrap a group key using the pairwise ECDH-derived key
export async function unwrapGroupKey(
  wrapped: Uint8Array,
  unwrappingKey: CryptoKey,
): Promise<CryptoKey> {
  const iv = wrapped.slice(0, IV_LENGTH);
  const ciphertext = wrapped.slice(IV_LENGTH);
  const rawGroupKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    unwrappingKey,
    ciphertext,
  );
  return importAesKey(new Uint8Array(rawGroupKey));
}

// Encrypt a message: returns "e2e:" + base64([iv(12)][ciphertext])
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return E2E_PREFIX + uint8ToBase64(combined);
}

// Decrypt a message from "e2e:" prefixed format
export async function decryptMessage(
  encrypted: string,
  key: CryptoKey,
): Promise<string> {
  if (!encrypted.startsWith(E2E_PREFIX)) {
    return encrypted;
  }
  const data = base64ToUint8(encrypted.slice(E2E_PREFIX.length));
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

// Check if a message is encrypted
export function isEncryptedMessage(content: string): boolean {
  return content.startsWith(E2E_PREFIX);
}

// Compute safety number from two public keys (12-digit numeric code)
export async function computeSafetyNumber(
  pubKeyA: Uint8Array,
  pubKeyB: Uint8Array,
): Promise<string> {
  // Sort keys deterministically so both sides compute the same number
  const comparison = compareUint8Arrays(pubKeyA, pubKeyB);
  const first = comparison <= 0 ? pubKeyA : pubKeyB;
  const second = comparison <= 0 ? pubKeyB : pubKeyA;
  const combined = new Uint8Array(first.length + second.length);
  combined.set(first, 0);
  combined.set(second, first.length);
  const hash = await crypto.subtle.digest("SHA-256", combined);
  const hashArray = new Uint8Array(hash);
  // Convert first 6 bytes into 12-digit number
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += (hashArray[i] % 100).toString().padStart(2, "0");
  }
  return result;
}

function compareUint8Arrays(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
