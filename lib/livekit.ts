/**
 * LiveKit helpers for Friendspot voice rooms.
 *
 * Each circle has a persistent LiveKit room named `circle-{circle_id}`.
 * Tokens are minted server-side via a Supabase Edge Function.
 */

import { supabase } from "./supabase";

export interface LiveKitToken {
  token: string;
  url: string;
}

/**
 * Fetch a LiveKit access token for a circle room from our Edge Function.
 * The Edge Function validates the user is a circle member before minting.
 */
export async function getCircleRoomToken(circleId: string): Promise<LiveKitToken> {
  const { data, error } = await supabase.functions.invoke("livekit-token", {
    body: { circle_id: circleId },
  });

  if (error || !data?.token) {
    throw new Error(error?.message ?? "Failed to get LiveKit token");
  }

  return { token: data.token, url: data.url };
}

/** Canonical LiveKit room name for a circle's drop-in room */
export function circleRoomName(circleId: string): string {
  return `circle-${circleId}`;
}

/**
 * Fetch a LiveKit access token for a private room.
 * The Edge Function validates circle membership + room existence.
 */
export async function getPrivateRoomToken(privateRoomId: string): Promise<LiveKitToken> {
  const { data, error } = await supabase.functions.invoke("livekit-token", {
    body: { private_room_id: privateRoomId },
  });

  if (error || !data?.token) {
    throw new Error(error?.message ?? "Failed to get private room token");
  }

  return { token: data.token, url: data.url };
}

/** Canonical LiveKit room name for a private room */
export function privateRoomName(privateRoomId: string): string {
  return `private-${privateRoomId}`;
}
