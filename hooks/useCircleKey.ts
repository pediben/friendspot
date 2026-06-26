/**
 * useCircleKey
 *
 * Loads (and caches) the AES-256 circle key for a given Spot.
 *
 * On first call:
 *   1. Check in-memory cache.
 *   2. Fetch circle_keys row from Supabase.
 *   3. Unwrap using ECDH private key from SecureStore.
 *   4. Cache result in memory for the session.
 *
 * Self-heal: if no key row exists AND the current user is the circle admin
 * (creator), we generate and store one now. This recovers from the silent
 * failure path in createCircle where key generation succeeds for the circle
 * but the DB insert fails or is skipped.
 *
 * Returns { circleKey, loading, error }.
 * circleKey is null while loading or if the key is unavailable.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "./useAuth";
import {
  getCachedCircleKey,
  setCachedCircleKey,
  unwrapCircleKey,
  getOrCreatePublicKey,
  wrapCircleKey,
} from "@/lib/keyExchange";
import { generateCircleKey } from "@/lib/crypto";

export function useCircleKey(circleId: string) {
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [circleKey, setCircleKey] = useState<string | null>(
    getCachedCircleKey(circleId)
  );
  const [loading, setLoading] = useState(!circleKey);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!circleId || !userId) return;

    // Already in memory
    const cached = getCachedCircleKey(circleId);
    if (cached) {
      setCircleKey(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error: dbErr } = await supabase
          .from("circle_keys")
          .select("encrypted_key, ephemeral_pub")
          .eq("circle_id", circleId)
          .eq("user_id", userId)
          .single();

        if (cancelled) return;

        if (dbErr || !data) {
          // No key row — check if we're the admin and can self-generate
          const { data: membership } = await supabase
            .from("circle_members")
            .select("role")
            .eq("circle_id", circleId)
            .eq("user_id", userId)
            .single();

          if (cancelled) return;

          if (membership?.role === "admin") {
            // Creator's key was never persisted — generate it now
            try {
              const hexKey   = await generateCircleKey();
              const myPubKey = await getOrCreatePublicKey();
              const { encryptedKey, ephemeralPub } = await wrapCircleKey(hexKey, myPubKey);

              await supabase.from("circle_keys").insert({
                circle_id:     circleId,
                user_id:       userId,
                encrypted_key: encryptedKey,
                ephemeral_pub: ephemeralPub,
              });

              if (cancelled) return;

              setCachedCircleKey(circleId, hexKey);
              setCircleKey(hexKey);
              setLoading(false);
              return;
            } catch (genErr: any) {
              console.error("[useCircleKey] self-heal failed:", genErr.message);
            }
          }

          // Not admin or self-heal failed — waiting for key distribution
          setError("key_pending");
          setLoading(false);
          return;
        }

        const hexKey = await unwrapCircleKey(data.encrypted_key, data.ephemeral_pub);

        if (cancelled) return;

        setCachedCircleKey(circleId, hexKey);
        setCircleKey(hexKey);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          console.error("[useCircleKey]", e.message);
          setError(e.message);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [circleId, userId]);

  return { circleKey, loading, error };
}
