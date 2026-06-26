/**
 * keyExchange.ts
 *
 * ECDH P-256 key exchange for wrapping/unwrapping per-circle AES-256 keys.
 *
 * Flow:
 *   Sender (inviter / circle creator):
 *     1. Load their own ECDH private key from SecureStore.
 *     2. Fetch recipient's ECDH public key from Supabase (user_public_keys).
 *     3. Generate an ephemeral ECDH key pair.
 *     4. Derive a wrapping key: ECDH(ephemeral_private, recipient_public) → HKDF → AES-KW.
 *     5. Wrap the 32-byte circle key with AES-KW.
 *     6. Store { encrypted_key, ephemeral_pub } in circle_keys table.
 *
 *   Recipient (new member):
 *     1. Fetch their circle_keys row.
 *     2. Load their ECDH private key from SecureStore.
 *     3. Reconstruct wrap key: ECDH(recipient_private, ephemeral_pub) → HKDF → AES-KW.
 *     4. Unwrap to get the 32-byte AES-256 circle key.
 *     5. Cache it in SecureStore for fast access.
 */

import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

// Web Crypto is not available in Expo Go / bare React Native.
// All functions below guard against this and throw descriptively,
// so callers (useUserKeys) can catch and disable E2EE gracefully.
const webCryptoAvailable =
  typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";

function requireWebCrypto(fn: string) {
  if (!webCryptoAvailable) {
    throw new Error(
      `[keyExchange] ${fn}: Web Crypto API not available in this environment (Expo Go). ` +
      "E2EE is disabled. Use a development build for full encryption support."
    );
  }
}

// ─── SecureStore keys ────────────────────────────────────────────
const PRIV_KEY_STORE = "friendspot.ecdh.private";
const PUB_KEY_STORE  = "friendspot.ecdh.public";

// ─── Key generation ──────────────────────────────────────────────

/** Generate a new ECDH P-256 key pair and persist it in SecureStore. */
export async function generateUserKeyPair(): Promise<{ publicKeyB64: string }> {
  requireWebCrypto("generateUserKeyPair");
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  const pubRaw  = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privRaw = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  const pubB64  = Buffer.from(pubRaw).toString("base64");
  const privB64 = Buffer.from(privRaw).toString("base64");

  await SecureStore.setItemAsync(PRIV_KEY_STORE, privB64);
  await SecureStore.setItemAsync(PUB_KEY_STORE, pubB64);

  return { publicKeyB64: pubB64 };
}

/** Returns the stored public key (base64 SPKI), generating one if absent. */
export async function getOrCreatePublicKey(): Promise<string> {
  const stored = await SecureStore.getItemAsync(PUB_KEY_STORE);
  if (stored) return stored;
  const { publicKeyB64 } = await generateUserKeyPair();
  return publicKeyB64;
}

// ─── Import helpers ──────────────────────────────────────────────

async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    Buffer.from(b64, "base64"),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
}

async function importPrivateKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(b64, "base64"),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"]
  );
}

// ─── ECDH → HKDF → AES-KW ───────────────────────────────────────

/**
 * Derives an AES-KW (256-bit) wrapping key from two ECDH keys.
 * Uses Web Crypto's deriveKey so the raw secret never enters JS.
 */
async function deriveWrapKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  // Step 1: ECDH shared secret → HKDF input
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );

  // Step 2: HKDF to stretch / domain-separate
  const hkdfKey = await crypto.subtle.importKey(
    "raw", sharedBits, { name: "HKDF" }, false, ["deriveKey"]
  );

  const salt = new TextEncoder().encode("friendspot-circle-key-v1");
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: new Uint8Array(0) },
    hkdfKey,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

// ─── Wrap (encrypt circle key for a recipient) ───────────────────

export interface WrappedKey {
  encryptedKey: string;  // base64 — AES-KW output (40 bytes for 32-byte key)
  ephemeralPub: string;  // base64 SPKI — recipient needs this to unwrap
}

/**
 * Wraps a 32-byte hex circle key for a recipient identified by their
 * SPKI base64 public key.
 */
export async function wrapCircleKey(
  circleKeyHex: string,
  recipientPublicKeyB64: string
): Promise<WrappedKey> {
  requireWebCrypto("wrapCircleKey");
  // Import recipient's static public key
  const recipientPub = await importPublicKey(recipientPublicKeyB64);

  // Generate a fresh ephemeral key pair for this wrap operation
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const ephemeralPubRaw = await crypto.subtle.exportKey("spki", ephemeral.publicKey);
  const ephemeralPubB64 = Buffer.from(ephemeralPubRaw).toString("base64");

  // Derive wrap key
  const wrapKey = await deriveWrapKey(ephemeral.privateKey, recipientPub);

  // Import the circle key as AES-GCM so we can wrap it
  const circleKeyBytes = Buffer.from(circleKeyHex, "hex");
  const circleKey = await crypto.subtle.importKey(
    "raw", circleKeyBytes, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );

  // AES-KW wrap (no IV needed — AES-KW has its own integrity check)
  const wrapped = await crypto.subtle.wrapKey("raw", circleKey, wrapKey, { name: "AES-KW" });

  return {
    encryptedKey: Buffer.from(wrapped).toString("base64"),
    ephemeralPub: ephemeralPubB64,
  };
}

// ─── Unwrap (recover circle key from wrapped data) ───────────────

/**
 * Unwraps an encrypted circle key using this device's ECDH private key
 * and the ephemeral public key stored alongside the wrapped key.
 *
 * Returns the circle key as a hex string.
 */
export async function unwrapCircleKey(
  encryptedKeyB64: string,
  ephemeralPubB64: string
): Promise<string> {
  requireWebCrypto("unwrapCircleKey");
  const privB64 = await SecureStore.getItemAsync(PRIV_KEY_STORE);
  if (!privB64) throw new Error("No private key on device — key pair missing");

  const myPrivKey   = await importPrivateKey(privB64);
  const ephemeralPub = await importPublicKey(ephemeralPubB64);

  const wrapKey = await deriveWrapKey(myPrivKey, ephemeralPub);

  const wrappedBytes = Buffer.from(encryptedKeyB64, "base64");
  const circleKey = await crypto.subtle.unwrapKey(
    "raw",
    wrappedBytes,
    wrapKey,
    { name: "AES-KW" },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const raw = await crypto.subtle.exportKey("raw", circleKey);
  return Buffer.from(raw).toString("hex");
}

// ─── Cache helpers ───────────────────────────────────────────────

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
