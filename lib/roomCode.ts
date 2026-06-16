import * as Crypto from "expo-crypto";

/**
 * Room Code utilities for Friendspot private rooms.
 *
 * A Room Code is a short, human-typeable lookup ID — it is NOT secret.
 * It uses Crockford's Base32 alphabet (32 symbols, no I/L/O/U/0/1 to avoid
 * visual confusion) and is formatted as XXXX-XXXX for easy reading/dictation.
 *
 * The code is how someone FINDS a private room; the passcode or passphrase is
 * how they AUTHENTICATE into it.
 */

// Crockford Base32: digits + uppercase letters, removing I, L, O, U, 0, 1
// Exactly 32 symbols → 5 bits per character, no modulo bias with byte & 31
const SYMBOLS = "23456789ABCDEFGHJKMNPQRSTVWXYZ47".split("") as string[];

/** Generate a crypto-random room code with the given total character length. */
export function generateRoomCode(length = 8): string {
  const bytes = Crypto.getRandomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SYMBOLS[bytes[i] & 31]; // bias-free: 256 / 32 = 8, exact multiple
  }
  // Format as XXXX-XXXX (groups of 4 separated by hyphen)
  return out.replace(/(.{4})(?=.)/g, "$1-");
}

/**
 * Normalize a user-entered room code for DB lookup.
 * Strips hyphens/spaces, uppercases. Use before calling find_private_room_by_code.
 */
export function normalizeRoomCode(input: string): string {
  return String(input ?? "")
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/[^0-9A-Z]/g, "");
}
