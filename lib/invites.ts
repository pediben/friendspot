/**
 * Spot invite utilities
 * Generates Crockford Base32 invite codes and creates/shares invite links.
 */
import { Share } from "react-native";
import { supabase } from "@/lib/supabase";
import { getCachedCircleKey, getOrCreatePublicKey, wrapCircleKey, unwrapCircleKey } from "@/lib/keyExchange";

// Crockford Base32 alphabet (no I, L, O, U — avoids ambiguity)
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateInviteCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/**
 * Creates an invite code for a Spot and opens the native share sheet.
 */
export async function shareSpotInvite(
  circleId: string,
  spotName: string,
  userId: string
): Promise<{ code: string } | null> {
  // Generate a unique code (retry on collision)
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateInviteCode();
    const { error } = await supabase
      .from("spot_invites")
      .insert({ circle_id: circleId, created_by: userId, code });
    if (!error) break;
    code = "";
  }

  if (!code) return null;

  const link = `https://friendspot.online/join/${code}`;
  const deepLink = `friendspot://join/${code}`;

  await Share.share({
    title: `Join ${spotName} on Friendspot`,
    message:
      `You're invited to join "${spotName}" on Friendspot — the private app for real friend groups.\n\n` +
      `Tap to join: ${link}\n\n` +
      `(Or open the app and enter code: ${code})`,
    url: deepLink,
  });

  return { code };
}

/**
 * Looks up an invite by code and returns Spot preview info.
 */
export async function previewInvite(code: string) {
  const { data, error } = await supabase
    .from("spot_invites")
    .select(`
      id, code, uses, max_uses, expires_at,
      circle:circles(id, name, icon)
    `)
    .eq("code", code.toUpperCase())
    .single();

  if (error || !data) return null;
  return data as any;
}

/**
 * Joins a Spot using the SECURITY DEFINER function, then requests a
 * circle key share from the inviter (or any online member).
 *
 * Key distribution flow:
 * 1. Join the spot (RPC).
 * 2. Ensure our public key is registered (needed for the wrap step).
 * 3. Look for our row in circle_keys — if already present (rejoining),
 *    we're done. If absent, insert a pending_key_shares row so an existing
 *    member's device can wrap the key for us on their next open.
 */
export async function joinSpotByCode(
  code: string,
  _userId?: string
): Promise<{ circleId: string; circleName: string; alreadyMember?: boolean } | null> {
  const { data, error } = await supabase.rpc("join_spot_by_invite", {
    p_code: code.toUpperCase(),
  });

  if (error || !data) {
    console.error("[invites] joinSpotByCode error:", error?.message);
    return null;
  }

  const circleId   = data.circle_id;
  const circleName = data.circle_name;
  const alreadyMember = data.already_member ?? false;

  if (!alreadyMember) {
    // Try to self-distribute: if an admin's device happens to be online and
    // has the key in its cache, skip the pending route.
    // For now we register a pending_key_shares row; the distribute function
    // (below) is called by existing members when they open the Spot.
    try {
      await getOrCreatePublicKey(); // ensure our pub key is in Supabase
      await supabase.from("pending_key_shares").upsert(
        { invite_code: code.toUpperCase(), circle_id: circleId },
        { onConflict: "invite_code" }
      );
    } catch (e: any) {
      console.warn("[invites] pending_key_shares insert:", e.message);
    }
  }

  return { circleId, circleName, alreadyMember };
}

/**
 * Called by existing members when they open a Spot.
 * Checks for pending_key_shares and wraps the circle key for each pending user.
 *
 * Only runs if this device has the circle key cached (i.e. is an active member).
 */
export async function distributePendingKeys(circleId: string) {
  const circleKeyHex = getCachedCircleKey(circleId);
  if (!circleKeyHex) return; // we don't have it either — nothing to distribute

  // Find pending shares for this circle that haven't been claimed yet
  const { data: pending } = await supabase
    .from("pending_key_shares")
    .select("id, invite_code")
    .eq("circle_id", circleId)
    .is("claimed_at", null);

  if (!pending || pending.length === 0) return;

  // For each pending member, look up their user_id from the invite code
  // then wrap the circle key for them using their registered public key.
  for (const share of pending) {
    try {
      // Find circle members who don't yet have a key
      const { data: members } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", circleId);

      const { data: existingKeys } = await supabase
        .from("circle_keys")
        .select("user_id")
        .eq("circle_id", circleId);

      const haveKey = new Set((existingKeys ?? []).map((k: any) => k.user_id));
      const needKey = (members ?? []).filter((m: any) => !haveKey.has(m.user_id));

      for (const member of needKey) {
        const { data: pubKeyRow } = await supabase
          .from("user_public_keys")
          .select("public_key")
          .eq("user_id", member.user_id)
          .single();

        if (!pubKeyRow?.public_key) continue; // their device hasn't registered yet

        const { encryptedKey, ephemeralPub } = await wrapCircleKey(
          circleKeyHex,
          pubKeyRow.public_key
        );

        await supabase.from("circle_keys").upsert(
          {
            circle_id: circleId,
            user_id: member.user_id,
            encrypted_key: encryptedKey,
            ephemeral_pub: ephemeralPub,
          },
          { onConflict: "circle_id,user_id" }
        );
      }

      // Mark share as claimed
      await supabase
        .from("pending_key_shares")
        .update({ claimed_at: new Date().toISOString() })
        .eq("id", share.id);

    } catch (e: any) {
      console.warn("[invites] distributePendingKeys:", e.message);
    }
  }
}
