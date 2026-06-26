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
 * Returns { circleKey, loading, error }.
 * circleKey is null while loading or if the key is unavailable
 * (e.g. the member hasn't received a key share yet).
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "./useAuth";
import {
  getCachedCircleKey,
  setCachedCircleKey,
  unwrapCircleKey,
} from "@/lib/keyExchange";

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
          // Key not yet distributed to this member
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
