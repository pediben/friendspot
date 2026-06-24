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

    const { data, error } = await supabase
      .from("moments")
      .insert({
        circle_id: params.circleId,
        created_by: userId,
        title: params.title,
        description: params.description ?? null,
        location: params.location ?? null,
        event_date: params.eventDate ?? null,
        is_secret: params.isSecret ?? false,
        honoree_id: params.honoreeId ?? null,
      })
      .select()
      .single();

    if (error) throw error;

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
