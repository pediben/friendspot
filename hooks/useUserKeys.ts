/**
 * useUserKeys
 *
 * Called once from the root layout on app launch.
 * Ensures this device has an ECDH key pair and that the public key
 * is registered in Supabase (user_public_keys table).
 *
 * This is a fire-and-forget setup hook — it runs silently in the background.
 */

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "./useAuth";
import { getOrCreatePublicKey } from "@/lib/keyExchange";

export function useUserKeys() {
  const { session } = useAuthStore();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        const publicKeyB64 = await getOrCreatePublicKey();

        // Upsert — idempotent; only network-costs on first run per device
        const { error } = await supabase
          .from("user_public_keys")
          .upsert(
            { user_id: userId, public_key: publicKeyB64 },
            { onConflict: "user_id" }
          );

        if (error) {
          console.warn("[useUserKeys] Failed to register public key:", error.message);
        }
      } catch (e: any) {
        console.warn("[useUserKeys]", e.message);
      }
    })();
  }, [userId]);
}
