/**
 * useAllEvents
 *
 * Fetches upcoming events across ALL circles the current user belongs to.
 * Used by the Invite tab calendar view.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { SpotEvent } from "@/hooks/useEvents";

export interface AllEvent extends SpotEvent {
  circle_name: string;
  circle_icon: string;
}

export function useAllEvents() {
  const { session } = useAuthStore();
  const me = session?.user.id;

  const [events, setEvents] = useState<AllEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      // Step 1: get all circles the user belongs to
      const { data: membership } = await (supabase as any)
        .from("circle_members")
        .select("circle_id, circles(id, name, icon)")
        .eq("user_id", me);

      const circleIds: string[] = (membership ?? []).map((m: any) => m.circle_id);
      const circleMap: Record<string, { name: string; icon: string }> = {};
      (membership ?? []).forEach((m: any) => {
        circleMap[m.circle_id] = {
          name: m.circles?.name ?? "Spot",
          icon: m.circles?.icon ?? "📍",
        };
      });

      if (circleIds.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Step 2: fetch all events (upcoming + past, for calendar display)
      const { data: evData, error } = await (supabase as any)
        .from("spot_events")
        .select("*")
        .in("circle_id", circleIds)
        .order("event_date", { ascending: true });

      if (error) throw error;

      // Step 3: fetch RSVPs in one query
      const eventIds = (evData ?? []).map((e: any) => e.id);
      let rsvpData: any[] = [];
      if (eventIds.length > 0) {
        const { data: r } = await (supabase as any)
          .from("event_rsvps")
          .select("event_id, status, user_id")
          .in("event_id", eventIds);
        rsvpData = r ?? [];
      }

      const mapped: AllEvent[] = (evData ?? []).map((e: any) => {
        const eventRsvps = rsvpData.filter((r: any) => r.event_id === e.id);
        return {
          ...e,
          going_count:   eventRsvps.filter((r: any) => r.status === "going").length,
          maybe_count:   eventRsvps.filter((r: any) => r.status === "maybe").length,
          cant_go_count: eventRsvps.filter((r: any) => r.status === "cant_go").length,
          my_rsvp:       eventRsvps.find((r: any) => r.user_id === me)?.status ?? null,
          circle_name:   circleMap[e.circle_id]?.name ?? "Spot",
          circle_icon:   circleMap[e.circle_id]?.icon ?? "📍",
        };
      });

      setEvents(mapped);
    } catch (e: any) {
      console.warn("[useAllEvents]", e.message);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => { load(); }, [load]);

  return { events, loading, refresh: load };
}
