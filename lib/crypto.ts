/**
 * E2EE helpers for Friendspot
 *
 * Strategy:
 *  - Each circle has a symmetric AES-256-GCM key derived from a shared secret.
 *  - Keys are generated on circle creation, stored encrypted in SecureStore,
 *    and shared with new members via an encrypted handshake (future: use a key
 *    server or member-to-member exchange).
 *  - Voice note blobs and photos are encrypted before upload and decrypted
 *    after download. Metadata (duration, waveform) is stored plaintext.
 *
 * This file provides the low-level encrypt/decrypt primitives.
 * Key management (generation, storage, sharing) lives in hooks/useCircleKey.ts.
 */

import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncryptedPayload {
  iv: string;   // base64 — 12 bytes for AES-GCM
  data: string; // base64 — ciphertext
}

// ---------------------------------------------------------------------------
// Key utilities
// ---------------------------------------------------------------------------

/** Generate a new 256-bit AES key as a hex string */
export async function generateCircleKey(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Buffer.from(bytes).toString("hex");
}

/** Derive a CryptoKey from a hex key string */
async function importKey(hexKey: string): Promise<CryptoKey> {
  const keyBytes = Buffer.from(hexKey, "hex");
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

/** Encrypt a Uint8Array with AES-256-GCM. Returns iv + ciphertext as base64. */
export async function encryptBytes(
  plaintext: Uint8Array,
  hexKey: string
): Promise<EncryptedPayload> {
  const key = await importKey(hexKey);
  const iv = await Crypto.getRandomBytesAsync(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    plaintext as unknown as BufferSource
  );
  return {
    iv: Buffer.from(iv).toString("base64"),
    data: Buffer.from(ciphertext).toString("base64"),
  };
}

/** Decrypt an EncryptedPayload back to Uint8Array. */
export async function decryptBytes(
  payload: EncryptedPayload,
  hexKey: string
): Promise<Uint8Array> {
  const key = await importKey(hexKey);
  const iv = Buffer.from(payload.iv, "base64");
  const ciphertext = Buffer.from(payload.data, "base64");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new Uint8Array(plaintext);
}

/** Convenience: encrypt a file URI's content. Returns a Blob ready for upload. */
export async function encryptFileUri(
  uri: string,
  hexKey: string
): Promise<Blob> {
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  const payload = await encryptBytes(new Uint8Array(buffer), hexKey);
  // Store as JSON envelope — small overhead, easy to parse on download
  return new Blob([JSON.stringify(payload)], { type: "application/octet-stream" });
}

/**
 * Convenience: decrypt a blob downloaded from Storage.
 * Writes the decrypted bytes to a temporary local file and returns its URI.
 * Uses expo-file-system instead of URL.createObjectURL (not available in React Native).
 */
export async function decryptBlobToUri(
  blob: Blob,
  hexKey: string,
  mimeType: string
): Promise<string> {
  const text = await blob.text();
  const payload: EncryptedPayload = JSON.parse(text);
  const bytes = await decryptBytes(payload, hexKey);
  const ext = mimeType.split("/")[1]?.replace("mpeg", "mp3") ?? "bin";
  const tempPath = `${FileSystem.cacheDirectory}friendspot_dec_${Date.now()}.${ext}`;
  const base64 = Buffer.from(bytes).toString("base64");
  await FileSystem.writeAsStringAsync(tempPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return tempPath;
}
