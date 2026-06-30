/**
 * useSubscription
 *
 * Reads the current user's Pro subscription status from Supabase.
 * The actual in-app purchase flow is abstracted behind `subscribe()` so
 * you can plug in any IAP SDK (RevenueCat, expo-in-app-purchases, etc.)
 * without touching the rest of the app.
 *
 * isPro = active subscription with expires_at in the future.
 *
 * FREE TIER LIMITS
 *   - Max 3 Spots
 *   - Voice notes: 60s max
 *   - Basic invite only (no themes)
 *
 * PRO UNLOCKS
 *   - Unlimited Spots
 *   - Premium invite themes
 *   - Voice notes: 5 min max
 *   - RSVP analytics
 *   - Auto guest reminders
 *   - Custom invite link
 */

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";

export const FREE_SPOT_LIMIT    = 3;
export const FREE_VOICE_LIMIT_S = 60;   // seconds
export const PRO_VOICE_LIMIT_S  = 300;  // seconds

export type SubPlan   = "monthly" | "annual";
export type SubStatus = "active" | "trial" | "expired" | "cancelled";

export interface Subscription {
  id:         string;
  plan:       SubPlan;
  status:     SubStatus;
  started_at: string;
  expires_at: string;
}

// ── Product IDs (set these in App Store Connect + your IAP SDK) ─────────────
export const IAP_PRODUCTS = {
  monthly: "com.friendspot.app.pro.monthly",
  annual:  "com.friendspot.app.pro.annual",
} as const;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription() {
  const { session } = useAuthStore();
  const me = session?.user.id;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    if (!me) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("subscriptions")
        .select("*")
        .eq("user_id", me)
        .in("status", ["active", "trial"])
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data ?? null);
    } catch (e: any) {
      console.warn("[useSubscription]", e.message);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => { load(); }, [load]);

  const isPro = !loading && subscription !== null;

  // ── subscribe ─────────────────────────────────────────────────────────────
  // Placeholder — wire this to your IAP SDK (RevenueCat recommended).
  // After a successful purchase, write the subscription to Supabase.
  const subscribe = async (plan: SubPlan): Promise<boolean> => {
    try {
      // TODO: Replace this block with your IAP SDK purchase call.
      // Example with RevenueCat:
      //   const { customerInfo } = await Purchases.purchaseProduct(IAP_PRODUCTS[plan]);
      //   const entitlement = customerInfo.entitlements.active["pro"];
      //   if (!entitlement) return false;

      // For now, write directly to Supabase (dev/testing only).
      // In production this should be done server-side after receipt validation.
      if (!me) return false;

      const now      = new Date();
      const expiresAt = new Date(now);
      if (plan === "monthly") expiresAt.setMonth(expiresAt.getMonth() + 1);
      else                    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error } = await (supabase as any)
        .from("subscriptions")
        .upsert(
          {
            user_id:    me,
            plan,
            status:     "active",
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "user_id", ignoreDuplicates: false }
        );

      if (error) throw error;
      await load();
      return true;
    } catch (e: any) {
      Alert.alert("Purchase failed", e.message);
      return false;
    }
  };

  // ── restorePurchases ──────────────────────────────────────────────────────
  const restorePurchases = async (): Promise<void> => {
    // TODO: Replace with IAP SDK restore call.
    // Example: const { customerInfo } = await Purchases.restorePurchases();
    await load();
    Alert.alert(
      subscription ? "Subscription restored!" : "No active subscription found",
      subscription
        ? `Your ${subscription.plan} plan is active.`
        : "No active subscription found for this Apple ID.",
    );
  };

  return {
    subscription,
    isPro,
    loading,
    refresh: load,
    subscribe,
    restorePurchases,
  };
}
