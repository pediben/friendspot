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
 *
 * Uses @noble/ciphers (pure JS AES-256-GCM) instead of crypto.subtle because
 * Hermes in React Native 0.74 does not reliably support the full Web Crypto API
 * chain required here (importKey + encrypt/decrypt with AES-GCM).
 */

import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import { gcm } from "@noble/ciphers/aes.js";
import { randomBytes } from "@noble/ciphers/utils.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncryptedPayload {
  iv: string;   // base64 — 12 bytes for AES-GCM
  data: string; // base64 — ciphertext + 16-byte GCM auth tag
}

// ---------------------------------------------------------------------------
// Key utilities
// ---------------------------------------------------------------------------

/** Generate a new 256-bit AES key as a hex string */
export async function generateCircleKey(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Buffer.from(bytes).toString("hex");
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt a Uint8Array with AES-256-GCM.
 * Returns { iv, data } as base64 strings.
 * The `data` field includes the 16-byte GCM authentication tag appended by
 * @noble/ciphers/aes gcm.encrypt().
 */
export async function encryptBytes(
  plaintext: Uint8Array,
  hexKey: string
): Promise<EncryptedPayload> {
  const keyBytes = Buffer.from(hexKey, "hex");
  const iv = randomBytes(12); // 12-byte nonce for AES-GCM

  // gcm(key, nonce).encrypt(plaintext) → ciphertext + 16-byte auth tag
  const ciphertext = gcm(keyBytes, iv).encrypt(plaintext);

  return {
    iv:   Buffer.from(iv).toString("base64"),
    data: Buffer.from(ciphertext).toString("base64"),
  };
}

/**
 * Decrypt an EncryptedPayload back to Uint8Array.
 * Throws if the auth tag doesn't match (tampered data).
 */
export async function decryptBytes(
  payload: EncryptedPayload,
  hexKey: string
): Promise<Uint8Array> {
  const keyBytes  = Buffer.from(hexKey, "hex");
  const iv        = Buffer.from(payload.iv, "base64");
  const ciphertext = Buffer.from(payload.data, "base64");

  // gcm(key, nonce).decrypt(ciphertext) verifies auth tag and returns plaintext
  return gcm(keyBytes, iv).decrypt(ciphertext);
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
