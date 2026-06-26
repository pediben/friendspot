import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Database } from "@/types/database";

// ---------------------------------------------------------------------------
// Storage adapter — SecureStore has a 2KB limit per value which is too small
// for Supabase JWTs. We use a hybrid: try SecureStore first, fall back to
// AsyncStorage for large values (the JWT token).
// ---------------------------------------------------------------------------
const LARGE_VALUE_THRESHOLD = 1800; // bytes — SecureStore limit is ~2048

const StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    // Check AsyncStorage first (large values stored here)
    const asyncVal = await AsyncStorage.getItem(key);
    if (asyncVal !== null) return asyncVal;
    // Fall back to SecureStore (small values)
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length > LARGE_VALUE_THRESHOLD) {
      await AsyncStorage.setItem(key, value);
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch {
        await AsyncStorage.setItem(key, value);
      }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
    try { await SecureStore.deleteItemAsync(key); } catch {}
  },
};

// ---------------------------------------------------------------------------
// Environment — replace these with your actual Supabase project values
// (store them in a .env file and use expo-constants or process.env)
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[Supabase] Missing env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env"
  );
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
export const supabase = createClient<Database, "friendspot">(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: StorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    // All Friendspot tables live in the 'friendspot' schema (shared Supabase project)
    schema: "friendspot",
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the signed URL for a private Storage object */
export async function getSignedUrl(
  bucket: "voice-notes" | "photos" | "avatars" | "stories",
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.error("[Storage] getSignedUrl error", error.message);
    return null;
  }
  return data.signedUrl;
}

/** Upload a file to Supabase Storage, returns the storage path */
export async function uploadFile(
  bucket: "voice-notes" | "photos" | "avatars" | "stories",
  userId: string,
  fileName: string,
  blob: Blob,
  contentType: string
): Promise<string | null> {
  const path = `${userId}/${fileName}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType, upsert: false });
  if (error) {
    console.error("[Storage] uploadFile error", error.message);
    return null;
  }
  return path;
}
