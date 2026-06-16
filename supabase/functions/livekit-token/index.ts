/**
 * Supabase Edge Function: livekit-token
 *
 * Validates that the requesting user is a member of the circle,
 * then mints a LiveKit access token for the circle's persistent room.
 *
 * Deploy:
 *   supabase functions deploy livekit-token --no-verify-jwt
 *
 * Required secrets (set via Supabase dashboard or CLI):
 *   supabase secrets set LIVEKIT_URL=wss://your-livekit-host
 *   supabase secrets set LIVEKIT_API_KEY=your_api_key
 *   supabase secrets set LIVEKIT_API_SECRET=your_api_secret
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ---------------------------------------------------------------------------
    // 1. Auth — verify the caller has a valid Supabase session
    // ---------------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ---------------------------------------------------------------------------
    // 2. Parse request body
    // ---------------------------------------------------------------------------
    const body = await req.json();
    const { circle_id, private_room_id } = body;

    if (!circle_id && !private_room_id) {
      return json({ error: "circle_id or private_room_id is required" }, 400);
    }

    const apiKey     = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret  = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!apiKey || !apiSecret || !livekitUrl) {
      return json({ error: "LiveKit not configured" }, 500);
    }

    // Fetch caller's display name once
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // ---------------------------------------------------------------------------
    // BRANCH A: Drop-in circle room  (circle_id)
    // ---------------------------------------------------------------------------
    if (circle_id) {
      const { data: membership, error: memberError } = await supabase
        .from("circle_members")
        .select("role")
        .eq("circle_id", circle_id)
        .eq("user_id", user.id)
        .single();

      if (memberError || !membership) {
        return json({ error: "You are not a member of this circle" }, 403);
      }

      const { data: circle, error: circleError } = await supabase
        .from("circles")
        .select("livekit_room, name")
        .eq("id", circle_id)
        .single();

      if (circleError || !circle) {
        return json({ error: "Circle not found" }, 404);
      }

      // Fall back to derived name for legacy rows created before the column existed
      const roomName = circle.livekit_room ?? `circle-${circle_id}`;

      const token = new AccessToken(apiKey, apiSecret, {
        identity: user.id,
        name: profile?.display_name ?? user.id,
        ttl: "4h",
      });

      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: false,
        roomAdmin: membership.role === "admin" || membership.role === "owner",
      });

      return json({ token: await token.toJwt(), url: livekitUrl, room: roomName });
    }

    // ---------------------------------------------------------------------------
    // BRANCH B: Private room  (private_room_id)
    // ---------------------------------------------------------------------------
    const { data: privateRoom, error: prError } = await supabase
      .from("circle_private_rooms")
      .select("id, circle_id, room_mode, is_active")
      .eq("id", private_room_id)
      .single();

    if (prError || !privateRoom || !privateRoom.is_active) {
      return json({ error: "Private room not found or inactive" }, 404);
    }

    const { data: membership, error: memberError } = await supabase
      .from("circle_members")
      .select("role")
      .eq("circle_id", privateRoom.circle_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return json({ error: "You are not a member of this circle" }, 403);
    }

    const roomName = `private-${private_room_id}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: profile?.display_name ?? user.id,
      ttl: "4h",
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });

    return json({
      token: await token.toJwt(),
      url: livekitUrl,
      room: roomName,
      room_mode: privateRoom.room_mode,
    });
  } catch (err) {
    console.error("[livekit-token]", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
