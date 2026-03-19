import type { Principal } from "@dfinity/principal";
import type { backendInterface } from "../backend";

// Type declarations for @dfinity/vetkeys loaded via CDN (esm.run)

interface VetKeysTransportSecretKey {
  publicKeyBytes(): Uint8Array;
}

interface VetKeysEncryptedVetKey {
  decryptAndVerify(
    tsk: VetKeysTransportSecretKey,
    dpk: VetKeysDerivedPublicKey,
    input: Uint8Array,
  ): VetKeysVetKey;
}

interface VetKeysDerivedPublicKey {
  publicKeyBytes(): Uint8Array;
}

interface VetKeysVetKey {
  deriveSymmetricKey(domainSep: string, outputLength: number): Uint8Array;
}

interface VetKeysLib {
  TransportSecretKey: {
    random(): VetKeysTransportSecretKey;
  };
  EncryptedVetKey: {
    deserialize(bytes: Uint8Array): VetKeysEncryptedVetKey;
  };
  DerivedPublicKey: {
    deserialize(bytes: Uint8Array): VetKeysDerivedPublicKey;
  };
}

declare global {
  interface Window {
    VetKeys?: VetKeysLib;
  }
}

function getVetKeysLib(): VetKeysLib {
  if (!window.VetKeys) {
    throw new Error(
      "VetKeys library not loaded — check CDN script in index.html",
    );
  }
  return window.VetKeys;
}

// Derives a symmetric AES-GCM key via the vetKD transport key ceremony
export async function deriveSymmetricKey(
  actor: backendInterface,
  principal: Principal,
): Promise<CryptoKey> {
  const lib = getVetKeysLib();

  // Get canister's vetKD public key
  const publicKeyBytes = await actor.getVetKdPublicKey();
  const dpk = lib.DerivedPublicKey.deserialize(new Uint8Array(publicKeyBytes));

  // Generate ephemeral transport key pair
  const tsk = lib.TransportSecretKey.random();
  const transportPublicKey = tsk.publicKeyBytes();

  // Get encrypted symmetric key from canister
  const encryptedKeyBytes = await actor.getVetKey(transportPublicKey);

  // Decrypt and verify the symmetric key
  const encryptedVetKey = lib.EncryptedVetKey.deserialize(
    new Uint8Array(encryptedKeyBytes),
  );
  const vetKey = encryptedVetKey.decryptAndVerify(
    tsk,
    dpk,
    principal.toUint8Array(),
  );

  // Derive 256-bit key material for AES-GCM
  const rawKey = vetKey.deriveSymmetricKey("aes-256-gcm-email-config", 32);

  // Copy into a fresh ArrayBuffer for Web Crypto compatibility
  const keyBuffer = new ArrayBuffer(rawKey.byteLength);
  new Uint8Array(keyBuffer).set(rawKey);

  return crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// Encrypts plaintext with AES-GCM. Returns [12-byte IV][ciphertext+tag].
export async function encryptWithKey(
  key: CryptoKey,
  plaintext: string,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);
  return result;
}

// Decrypts ciphertext produced by encryptWithKey.
export async function decryptWithKey(
  key: CryptoKey,
  ciphertext: Uint8Array,
): Promise<string> {
  const iv = ciphertext.slice(0, 12);
  const data = ciphertext.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  return new TextDecoder().decode(decrypted);
}

// Convenience: fetch encrypted config, derive key, decrypt API key
export async function getDecryptedEmailConfig(
  actor: backendInterface,
  principal: Principal,
): Promise<{ apiKey: string; senderEmail: string } | null> {
  const config = await actor.getEncryptedEmailConfig();
  if (!config) return null;
  const key = await deriveSymmetricKey(actor, principal);
  const apiKey = await decryptWithKey(
    key,
    new Uint8Array(config.encryptedApiKey),
  );
  return { apiKey, senderEmail: config.senderEmail };
}
