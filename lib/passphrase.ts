import * as Crypto from "expo-crypto";

/**
 * Diceware-style passphrase generator for E2EE private rooms.
 *
 * The passphrase IS the end-to-end encryption key seed — it is passed directly
 * to LiveKit's useRNE2EEManager({ sharedKey }) so the server never sees the
 * plaintext room audio. Users share the passphrase out-of-band (read aloud,
 * copy-paste) to invite someone into an encrypted private room.
 *
 * WORDS has exactly 256 entries → each word carries 8 bits of entropy.
 * Default 6 words → ~48 bits.  Selection uses crypto-strong random bytes with
 * no modulo bias (256 words % 256 = 0).
 */

const WORDS = [
  "able",  "acid",  "aged",  "army",  "atom",  "aunt",  "away",  "baby",
  "back",  "band",  "bank",  "barn",  "base",  "bath",  "bead",  "bean",
  "bear",  "beat",  "bell",  "belt",  "bird",  "blue",  "boat",  "bold",
  "bone",  "book",  "boot",  "born",  "boss",  "bowl",  "brave", "bread",
  "brick", "broom", "brown", "brush", "cage",  "cake",  "calm",  "camp",
  "cane",  "card",  "care",  "cart",  "cash",  "cave",  "cell",  "chain",
  "chair", "chalk", "chart", "cheek", "chess", "chest", "chief", "chin",
  "clay",  "cliff", "cloud", "clover","coal",  "coast", "coat",  "coin",
  "cold",  "cook",  "cool",  "copper","coral", "cork",  "corn",  "cost",
  "couch", "cream", "crisp", "crow",  "crown", "cube",  "curl",  "dance",
  "dawn",  "deer",  "desk",  "dial",  "dime",  "dish",  "dock",  "door",
  "dove",  "drum",  "duck",  "dune",  "dust",  "eagle", "earth", "east",
  "edge",  "elbow", "elf",   "elm",   "ember", "fang",  "farm",  "fawn",
  "fern",  "field", "film",  "fire",  "fish",  "flag",  "flame", "flask",
  "fleet", "float", "flour", "flute", "foam",  "fork",  "fox",   "frog",
  "frost", "fruit", "gate",  "gear",  "gem",   "gift",  "glass", "globe",
  "glove", "goat",  "gold",  "goose", "grain", "grape", "grass", "green",
  "grove", "gulf",  "hail",  "hand",  "hare",  "harp",  "hawk",  "hay",
  "haze",  "heart", "hill",  "hive",  "holly", "honey", "hook",  "horn",
  "horse", "host",  "ice",   "iron",  "ivory", "jade",  "jar",   "jazz",
  "jet",   "jewel", "join",  "juice", "keel",  "kite",  "knee",  "knife",
  "knot",  "lace",  "lake",  "lamp",  "lane",  "lawn",  "leaf",  "lemon",
  "lily",  "lime",  "lion",  "loaf",  "lock",  "loft",  "log",   "loom",
  "lotus", "lump",  "lunar", "lung",  "mango", "maple", "march", "marsh",
  "mask",  "mast",  "meadow","melon", "mesh",  "mint",  "mist",  "moon",
  "moss",  "moth",  "mound", "mouse", "nest",  "north", "oak",   "oar",
  "oat",   "ocean", "olive", "onion", "opal",  "otter", "owl",   "palm",
  "panda", "peach", "pearl", "pebble","pine",  "plum",  "pond",  "pony",
  "quartz","quay",  "quill", "rain",  "reed",  "reef",  "ridge", "river",
  "robin", "rope",  "rose",  "ruby",  "sail",  "salt",  "sand",  "seal",
  "shell", "ship",  "shore", "silk",  "snow",  "stone", "storm", "swan",
  "tide",  "tiger", "vine",  "wave",  "wing",  "wolf",  "wood",  "zinc",
] as const;

/** Generate a crypto-random passphrase of `count` words joined by hyphens. */
export function generatePassphrase(count = 6): string {
  const bytes = Crypto.getRandomBytes(count);
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(WORDS[bytes[i] % WORDS.length]);
  }
  return picked.join("-");
}

/**
 * Normalize a user-entered passphrase so the same phrase always derives the
 * same key, regardless of spacing, case, or separator choice.
 * Both create and join paths must call this before passing to LiveKit.
 */
export function normalizePassphrase(input: string): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // spaces/underscores → single hyphen
    .replace(/-+/g, "-")     // collapse repeated hyphens
    .replace(/^-|-$/g, "");  // trim stray hyphens
}

/** Approximate entropy in bits for a passphrase of `count` words. */
export function passphraseEntropyBits(count = 6): number {
  return Math.round(count * Math.log2(WORDS.length)); // 8 bits per word
}

export const WORD_COUNT = WORDS.length; // 256
