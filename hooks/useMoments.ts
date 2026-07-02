import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Moment, MomentWithCircle } from "@/types/database";
import { useAuthStore } from "./useAuth";

export function useMoments() {
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [moments, setMoments] = useState<MomentWithCircle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("moments")
      .select("*, circle:circles(*)")
      .order("event_date", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("[useMoments]", error.message);
      setLoading(false);
      return;
    }

    setMoments((data ?? []) as unknown as MomentWithCircle[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createMoment = async (params: {
    circleId: string;
    title: string;
    description?: string;
    location?: string;
    eventDate?: string;
    isSecret?: boolean;
    honoreeId?: string;
    planningMemberIds?: string[];
  }) => {
    if (!userId) throw new Error("Not signed in");

    // Use SECURITY DEFINER RPC — bypasses RLS auth.uid() timing issue in React Native
    const { data: rpcData, error } = await supabase.rpc("create_moment_for_user", {
      p_circle_id: params.circleId,
      p_title: params.title,
      p_description: params.description ?? null,
      p_location: params.location ?? null,
      p_event_date: params.eventDate ?? null,
      p_is_secret: params.isSecret ?? false,
      p_honoree_id: params.honoreeId ?? null,
    });

    if (error) throw error;
    const data = rpcData as any;

    // Add planning members as invited attendees (they can see the secret moment)
    if (params.isSecret && params.planningMemberIds?.length) {
      await supabase.from("moment_attendees").insert(
        params.planningMemberIds.map((uid) => ({
          moment_id: data.id,
          user_id: uid,
          rsvp_status: "invited" as const,
        }))
      );
    }

    await fetch();
    return data as Moment;
  };

  return { moments, loading, refetch: fetch, createMoment };
}
