import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Circle, CircleWithMembers, MemberProfile } from "@/types/database";
import { useAuthStore } from "./useAuth";
import { generateCircleKey } from "@/lib/crypto";
import { wrapCircleKey, getOrCreatePublicKey, setCachedCircleKey } from "@/lib/keyExchange";

export function useCircles() {
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [circles, setCircles] = useState<CircleWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  // Unique channel name per hook instance — prevents "cannot add callbacks after subscribe()"
  // when multiple screens (Live, $, Spots) mount useCircles simultaneously.
  const [channelName] = useState(() => `circle_members_${Math.random().toString(36).slice(2)}`);

  const fetchCircles = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("circle_members")
      .select(`
        circle_id,
        circles (
          *,
          circle_members (
            user_id,
            role,
            profiles (*)
          )
        )
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("[useCircles]", error.message);
      return;
    }

    const result: CircleWithMembers[] = (data ?? []).map((row: any) => {
      const c = row.circles;
      const members: MemberProfile[] = c.circle_members.map((m: any) => ({
        ...m.profiles,
        role: m.role ?? "member",
      }));
      return { ...c, members, member_count: members.length };
    });

    setCircles(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchCircles();

    const sub = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "friendspot", table: "circle_members" },
        fetchCircles
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
    // Depend on userId so we re-subscribe when the user changes.
    // fetchCircles is stable as long as userId doesn't change (memoized with userId).
    // Using channelName (stable per-instance) avoids the "already subscribed" error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, channelName]);

  const createCircle = async (name: string, icon: string) => {
    if (!userId) return null;

    // Force-refresh the JWT from the server so auth.uid() is never NULL.
    // refreshSession() hits the Supabase token endpoint and returns a brand-new access token,
    // bypassing any stale/corrupt token that may be cached locally.
    const { data: { session: freshSession }, error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError || !freshSession) throw new Error("Session expired — please sign out and sign back in.");

    // Explicitly set it so the client uses the new token for this request
    await supabase.auth.setSession({
      access_token: freshSession.access_token,
      refresh_token: freshSession.refresh_token,
    });

    const { data, error } = await supabase
      .from("circles")
      .insert({ name, icon, created_by: freshSession.user.id })
      .select()
      .single();

    if (error) throw error;
    const circle = data as Circle;

    // Generate a fresh AES-256 circle key and wrap it for the creator
    try {
      const circleKeyHex = await generateCircleKey();
      const myPubKey = await getOrCreatePublicKey();
      const { encryptedKey, ephemeralPub } = await wrapCircleKey(circleKeyHex, myPubKey);

      await supabase.from("circle_keys").insert({
        circle_id: circle.id,
        user_id: userId,
        encrypted_key: encryptedKey,
        ephemeral_pub: ephemeralPub,
      });

      // Cache immediately — no need to unwrap on next open
      setCachedCircleKey(circle.id, circleKeyHex);
    } catch (keyErr: any) {
      // Non-fatal: circle is created; key will be distributed on next open
      console.warn("[createCircle] Key generation failed:", keyErr.message);
    }

    await fetchCircles();
    return circle;
  };

  return { circles, loading, refetch: fetchCircles, createCircle };
}
