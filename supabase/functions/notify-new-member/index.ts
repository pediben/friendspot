/**
 * notify-new-member
 *
 * Called by a Supabase Database Webhook on INSERT to friendspot.profiles.
 * Finds all users who have the new user's phone number saved in their
 * contact_imports, then sends them an Expo push notification.
 *
 * Set up the webhook in Supabase Dashboard:
 *   Database → Webhooks → Create webhook
 *   Table: friendspot.profiles  Event: INSERT
 *   URL:   https://<project>.supabase.co/functions/v1/notify-new-member
 *   HTTP headers: { "Authorization": "Bearer <service_role_key>" }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_PUSH_URL     = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const payload = await req.json();

    // Supabase webhook payload shape: { type: "INSERT", record: {...} }
    const newProfile = payload.record as {
      id: string;
      phone: string;
      display_name: string;
    };

    if (!newProfile?.phone) {
      return new Response("no phone", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // 1. Find all users who have this phone in their contact_imports
    // phone_hash stores the E.164 phone number
    const { data: contactRows } = await supabase
      .schema("friendspot")
      .from("contact_imports")
      .select("owner_id")
      .eq("phone_hash", newProfile.phone)
      .neq("owner_id", newProfile.id); // don't notify yourself

    if (!contactRows?.length) {
      return new Response("no matching contacts", { status: 200 });
    }

    const userIds = contactRows.map((r: any) => r.owner_id);

    // 2. Get their push tokens
    const { data: tokenRows } = await supabase
      .schema("friendspot")
      .from("push_tokens")
      .select("token")
      .in("user_id", userIds);

    if (!tokenRows?.length) {
      return new Response("no push tokens", { status: 200 });
    }

    const tokens = tokenRows.map((r: any) => r.token);

    // 3. Send Expo push notifications in batches of 100
    const name = newProfile.display_name || "Someone you know";
    const messages = tokens.map((token: string) => ({
      to:    token,
      sound: "default",
      title: `${name} joined Friendspot 👋`,
      body:  "Tap to add them to a Spot.",
      data:  {
        type:      "friend_joined",
        user_id:   newProfile.id,
        user_name: newProfile.display_name,
      },
    }));

    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      await fetch(EXPO_PUSH_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(batch),
      });
    }

    console.log(`[notify-new-member] Notified ${tokens.length} users that ${name} joined.`);
    return new Response(JSON.stringify({ notified: tokens.length }), { status: 200 });

  } catch (err) {
    console.error("[notify-new-member] Error:", err);
    return new Response(String(err), { status: 500 });
  }
});
