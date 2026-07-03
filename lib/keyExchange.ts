/**
 * keyExchange.ts
 *
 * ECDH P-256 key exchange for wrapping/unwrapping per-circle AES-256 keys.
 *
 * Uses @noble/curves, @noble/hashes, @noble/ciphers (pure JS) instead of
 * Web Crypto API because Hermes in React Native 0.74 does not support the
 * full ECDH + HKDF + AES-KW algorithm chain via crypto.subtle, causing
 * silent failures and leaving circle_keys / user_public_keys tables empty.
 *
 * Protocol:
 *   Wrap (sender stores key for recipient):
 *     1. Generate ephemeral P-256 key pair.
 *     2. ECDH(ephemeral_private, recipient_public) → shared x-coordinate.
 *     3. HKDF-SHA-256(shared_x, salt="friendspot-circle-key-v1") → 32-byte wrap key.
 *     4. AES-KW(wrap_key).encrypt(32-byte circle key) → 40-byte wrapped key.
 *     5. Store { encrypted_key: base64(wrapped), ephemeral_pub: base64(ephPub65) }.
 *
 *   Unwrap (recipient recovers key):
 *     1. Load own P-256 private key from SecureStore.
 *     2. ECDH(own_private, ephemeral_pub) → same shared x-coordinate.
 *     3. HKDF → same wrap key.
 *     4. AES-KW(wrap_key).decrypt(wrapped) → 32-byte circle key.
 *
 * Key storage in SecureStore (raw, not PKCS8/SPKI):
 *   "friendspot.ecdh.private.v2" → base64(32-byte scalar)
 *   "friendspot.ecdh.public.v2"  → base64(65-byte uncompressed P-256 point)
 */

import * as SecureStore from "expo-secure-store";
import { p256 } from "@noble/curves/nist.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { aeskw } from "@noble/ciphers/aes.js";

// ─── SecureStore keys ─────────────────────────────────────────────────────────
// v2 suffix distinguishes from any old PKCS8/SPKI format keys that may exist
const PRIV_KEY_STORE = "friendspot.ecdh.private.v2";
const PUB_KEY_STORE  = "friendspot.ecdh.public.v2";

// Shared salt for HKDF — changing this invalidates all existing wrapped keys
const HKDF_SALT = new TextEncoder().encode("friendspot-circle-key-v1");

// ─── Key generation ───────────────────────────────────────────────────────────

/** Generate a new ECDH P-256 key pair and persist it in SecureStore. */
export async function generateUserKeyPair(): Promise<{ publicKeyB64: string }> {
  const privKey = p256.utils.randomSecretKey();          // 32-byte scalar
  const pubKey  = p256.getPublicKey(privKey, false);     // 65-byte uncompressed

  const privB64 = Buffer.from(privKey).toString("base64");
  const pubB64  = Buffer.from(pubKey).toString("base64");

  await SecureStore.setItemAsync(PRIV_KEY_STORE, privB64);
  await SecureStore.setItemAsync(PUB_KEY_STORE,  pubB64);

  return { publicKeyB64: pubB64 };
}

/** Returns the stored public key (base64 uncompressed P-256), generating one if absent. */
export async function getOrCreatePublicKey(): Promise<string> {
  const stored = await SecureStore.getItemAsync(PUB_KEY_STORE);
  if (stored) return stored;
  const { publicKeyB64 } = await generateUserKeyPair();
  return publicKeyB64;
}

// ─── ECDH + HKDF shared key derivation ───────────────────────────────────────

/**
 * Derives a 32-byte AES-KW wrapping key from an ECDH exchange.
 * Uses the x-coordinate of the shared point as HKDF input key material.
 */
function deriveWrapKey(privateKeyBytes: Uint8Array, publicKeyBytes: Uint8Array): Uint8Array {
  // ECDH: shared point in compressed form (33 bytes: prefix + x)
  const sharedPoint = p256.getSharedSecret(privateKeyBytes, publicKeyBytes, true);
  // Use x-coordinate only (32 bytes, skip the 0x02/0x03 prefix byte)
  const xCoord = sharedPoint.slice(1);
  // HKDF-SHA-256: info=empty, length=32
  return hkdf(sha256, xCoord, HKDF_SALT, undefined, 32);
}

// ─── Wrap (encrypt circle key for a recipient) ────────────────────────────────

export interface WrappedKey {
  encryptedKey: string; // base64 — 40-byte AES-KW output (32-byte key + 8-byte integrity check)
  ephemeralPub: string; // base64 — 65-byte uncompressed P-256 ephemeral public key
}

/**
 * Wraps a 32-byte hex circle key for a recipient identified by their
 * base64-encoded uncompressed P-256 public key.
 */
export async function wrapCircleKey(
  circleKeyHex: string,
  recipientPublicKeyB64: string
): Promise<WrappedKey> {
  const recipientPub = Buffer.from(recipientPublicKeyB64, "base64");

  // Fresh ephemeral key pair for this wrap operation
  const ephPriv = p256.utils.randomSecretKey();
  const ephPub  = p256.getPublicKey(ephPriv, false); // 65 bytes

  const wrapKey  = deriveWrapKey(ephPriv, recipientPub);
  const circleKeyBytes = Buffer.from(circleKeyHex, "hex");

  // AES-KW encrypt: output is 40 bytes (32 + 8 integrity check)
  const wrapped = aeskw(wrapKey).encrypt(circleKeyBytes);

  return {
    encryptedKey: Buffer.from(wrapped).toString("base64"),
    ephemeralPub: Buffer.from(ephPub).toString("base64"),
  };
}

// ─── Unwrap (recover circle key from wrapped data) ────────────────────────────

/**
 * Unwraps an encrypted circle key using this device's ECDH private key.
 * Returns the circle key as a hex string.
 */
export async function unwrapCircleKey(
  encryptedKeyB64: string,
  ephemeralPubB64: string
): Promise<string> {
  const privB64 = await SecureStore.getItemAsync(PRIV_KEY_STORE);
  if (!privB64) throw new Error("No private key on device — key pair missing");

  const myPriv    = Buffer.from(privB64, "base64");
  const ephPub    = Buffer.from(ephemeralPubB64, "base64");
  const wrapped   = Buffer.from(encryptedKeyB64, "base64");

  const wrapKey = deriveWrapKey(myPriv, ephPub);

  // AES-KW decrypt: output is 32 bytes
  const circleKeyBytes = aeskw(wrapKey).decrypt(wrapped);
  return Buffer.from(circleKeyBytes).toString("hex");
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

const circleKeyCache: Record<string, string> = {};

export function getCachedCircleKey(circleId: string): string | null {
  return circleKeyCache[circleId] ?? null;
}

export function setCachedCircleKey(circleId: string, hexKey: string) {
  circleKeyCache[circleId] = hexKey;
}

/** Clear all cached circle keys — call on sign-out to prevent key leakage between sessions. */
export function clearCircleKeyCache() {
  for (const key of Object.keys(circleKeyCache)) {
    delete circleKeyCache[key];
  }
}
