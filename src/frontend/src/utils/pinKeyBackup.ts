/**
 * PIN-based encryption/decryption for E2EE key backup.
 * Uses PBKDF2 (100k iterations, SHA-256) + AES-256-GCM.
 * Wire format: [salt(16)][iv(12)][ciphertext]
 */

export async function encryptKeysWithPin(
  keys: object,
  pin: string,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const plaintext = encoder.encode(JSON.stringify(keys));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    plaintext,
  );

  const result = new Uint8Array(16 + 12 + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, 16);
  result.set(new Uint8Array(ciphertext), 28);
  return result;
}

export async function decryptKeysWithPin(
  blob: Uint8Array,
  pin: string,
): Promise<object> {
  if (blob.length < 28) throw new Error("Invalid backup blob");

  const encoder = new TextEncoder();
  const salt = blob.slice(0, 16);
  const iv = blob.slice(16, 28);
  const ciphertext = blob.slice(28);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext,
    );
  } catch {
    throw new Error("Incorrect PIN");
  }

  const decoded = new TextDecoder().decode(plaintext);
  return JSON.parse(decoded);
}

/** Encrypt with a raw passphrase string (for recovery codes) */
export async function encryptKeysWithPassphrase(
  keys: object,
  passphrase: string,
): Promise<Uint8Array> {
  return encryptKeysWithPin(keys, passphrase);
}

export async function decryptKeysWithPassphrase(
  blob: Uint8Array,
  passphrase: string,
): Promise<object> {
  return decryptKeysWithPin(blob, passphrase);
}
