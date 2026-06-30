/**
 * useEvents
 *
 * Manages spot events and RSVPs for a given circle.
 * - Lists events (newest first)
 * - Creates events
 * - Fetches a single event with full RSVP + guest details
 * - Submits / updates the current user's RSVP
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";

export type RsvpStatus = "going" | "maybe" | "cant_go";

export interface SpotEvent {
  id: string;
  circle_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  created_at: string;
  /** count summaries — populated by list query */
  going_count?: number;
  maybe_count?: number;
  cant_go_count?: number;
  /** current user's rsvp if any */
  my_rsvp?: RsvpStatus | null;
}

export interface RsvpGuest {
  user_id: string;
  status: RsvpStatus;
  display_name: string;
  avatar_url: string | null;
}

// ── List events for a spot ──────────────────────────────────────────────────

export function useEvents(circleId: string) {
  const { session } = useAuthStore();
  const me = session?.user.id;

  const [events, setEvents] = useState<SpotEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!circleId || !me) return;
    setLoading(true);
    try {
      // Fetch events
      const { data: evData, error } = await (supabase as any)
        .from("spot_events")
        .select("*")
        .eq("circle_id", circleId)
        .order("event_date", { ascending: true });

      if (error) throw error;

      // Fetch RSVPs for all events in one query
      const eventIds = (evData ?? []).map((e: any) => e.id);
      let rsvpData: any[] = [];
      if (eventIds.length > 0) {
        const { data: r } = await (supabase as any)
          .from("event_rsvps")
          .select("event_id, status, user_id")
          .in("event_id", eventIds);
        rsvpData = r ?? [];
      }

      const mapped: SpotEvent[] = (evData ?? []).map((e: any) => {
        const eventRsvps = rsvpData.filter((r: any) => r.event_id === e.id);
        return {
          ...e,
          going_count:   eventRsvps.filter((r: any) => r.status === "going").length,
          maybe_count:   eventRsvps.filter((r: any) => r.status === "maybe").length,
          cant_go_count: eventRsvps.filter((r: any) => r.status === "cant_go").length,
          my_rsvp:       eventRsvps.find((r: any) => r.user_id === me)?.status ?? null,
        };
      });

      setEvents(mapped);
    } catch (e: any) {
      console.warn("[useEvents]", e.message);
    } finally {
      setLoading(false);
    }
  }, [circleId, me]);

  useEffect(() => { load(); }, [load]);

  return { events, loading, refresh: load };
}

// ── Single event detail with guest list ────────────────────────────────────

export function useEventDetail(eventId: string) {
  const { session } = useAuthStore();
  const me = session?.user.id;

  const [event, setEvent]   = useState<SpotEvent | null>(null);
  const [guests, setGuests] = useState<RsvpGuest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!eventId || !me) return;
    setLoading(true);
    try {
      const [evRes, rsvpRes] = await Promise.all([
        (supabase as any)
          .from("spot_events")
          .select("*, circles(name, icon)")
          .eq("id", eventId)
          .single(),
        (supabase as any)
          .from("event_rsvps")
          .select("user_id, status, profiles:user_id(display_name, avatar_url)")
          .eq("event_id", eventId),
      ]);

      if (evRes.error) throw evRes.error;

      const myRsvp = rsvpRes.data?.find((r: any) => r.user_id === me);

      setEvent({
        ...evRes.data,
        my_rsvp: myRsvp?.status ?? null,
        circle_name: evRes.data.circles?.name ?? null,
        circle_icon: evRes.data.circles?.icon ?? null,
      });

      setGuests(
        (rsvpRes.data ?? []).map((r: any) => ({
          user_id:      r.user_id,
          status:       r.status,
          display_name: r.profiles?.display_name ?? "Friend",
          avatar_url:   r.profiles?.avatar_url   ?? null,
        }))
      );
    } catch (e: any) {
      console.warn("[useEventDetail]", e.message);
    } finally {
      setLoading(false);
    }
  }, [eventId, me]);

  useEffect(() => { load(); }, [load]);

  return { event, guests, loading, refresh: load };
}

// ── Create an event ─────────────────────────────────────────────────────────

export async function createEvent(params: {
  circleId: string;
  userId: string;
  title: string;
  description?: string;
  eventDate: Date;
  location?: string;
}): Promise<string> {
  const { data, error } = await (supabase as any)
    .from("spot_events")
    .insert({
      circle_id:   params.circleId,
      created_by:  params.userId,
      title:       params.title,
      description: params.description ?? null,
      event_date:  params.eventDate.toISOString(),
      location:    params.location ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

// ── Submit / update RSVP ────────────────────────────────────────────────────

export async function submitRsvp(
  eventId: string,
  userId: string,
  status: RsvpStatus
): Promise<void> {
  const { error } = await (supabase as any)
    .from("event_rsvps")
    .upsert(
      { event_id: eventId, user_id: userId, status },
      { onConflict: "event_id,user_id" }
    );

  if (error) throw error;
}
