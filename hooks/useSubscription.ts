/**
 * useSubscription
 *
 * Reads the current user's Pro subscription status via RevenueCat.
 * Supabase is used as a read-through cache / server-side source of truth.
 *
 * isPro = active "pro" entitlement in RevenueCat.
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

import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, Platform } from "react-native";
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";
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

// ── Product IDs ───────────────────────────────────────────────────────────────
export const IAP_PRODUCTS = {
  monthly: "com.friendspot.app.pro.monthly",
  annual:  "com.friendspot.app.pro.annual",
} as const;

const RC_API_KEY_IOS = "appl_aDLXaTAGerefCULZDjULOjiYrhH";

// ── Configure RevenueCat once at module load ──────────────────────────────────
let _rcConfigured = false;
function ensureRC() {
  if (_rcConfigured) return;
  if (Platform.OS === "ios") {
    Purchases.configure({ apiKey: RC_API_KEY_IOS });
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    _rcConfigured = true;
  }
  // Android: add RC_API_KEY_ANDROID branch here when ready
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription() {
  const { session } = useAuthStore();
  const me = session?.user.id;

  const [isPro,   setIsPro]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      ensureRC();
      if (me) {
        await Purchases.logIn(me);
      }
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      const active = info.entitlements.active["pro"];
      setIsPro(!!active);

      // Mirror to Supabase for server-side checks
      if (active && me) {
        const expiresAt = active.expirationDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const plan: SubPlan = active.productIdentifier.includes("monthly") ? "monthly" : "annual";
        await (supabase as any)
          .from("subscriptions")
          .upsert(
            {
              user_id:    me,
              plan,
              status:     "active",
              started_at: active.originalPurchaseDate ?? new Date().toISOString(),
              expires_at: expiresAt,
            },
            { onConflict: "user_id", ignoreDuplicates: false }
          );
        setSubscription({
          id: active.productIdentifier,
          plan,
          status: "active",
          started_at: active.originalPurchaseDate ?? new Date().toISOString(),
          expires_at: expiresAt,
        });
      } else {
        setSubscription(null);
      }
    } catch (e: any) {
      console.warn("[useSubscription]", e.message);
      // Fallback: check Supabase directly
      if (me) {
        const { data } = await (supabase as any)
          .from("subscriptions")
          .select("*")
          .eq("user_id", me)
          .in("status", ["active", "trial"])
          .gte("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setSubscription(data ?? null);
        setIsPro(!!data);
      }
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => { load(); }, [load]);

  // ── subscribe ─────────────────────────────────────────────────────────────
  const subscribe = useCallback(async (plan: SubPlan): Promise<boolean> => {
    try {
      ensureRC();
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) {
        Alert.alert("Not available", "No offerings found. Please try again later.");
        return false;
      }

      // Find the right package
      const pkg: PurchasesPackage | undefined =
        plan === "monthly"
          ? current.monthly ?? current.availablePackages.find(p => p.product.identifier === IAP_PRODUCTS.monthly)
          : current.annual  ?? current.availablePackages.find(p => p.product.identifier === IAP_PRODUCTS.annual);

      if (!pkg) {
        Alert.alert("Not available", `${plan} plan not found.`);
        return false;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = customerInfo.entitlements.active["pro"];
      if (active) {
        await load();
        return true;
      }
      return false;
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Purchase failed", e.message);
      }
      return false;
    }
  }, [load]);

  // ── restorePurchases ──────────────────────────────────────────────────────
  const restoringRef = useRef(false);
  const restorePurchases = useCallback(async (): Promise<void> => {
    if (restoringRef.current) return;
    restoringRef.current = true;
    try {
      ensureRC();
      const info = await Purchases.restorePurchases();
      const active = info.entitlements.active["pro"];
      await load();
      Alert.alert(
        active ? "Subscription restored!" : "No active subscription found",
        active
          ? "Your Pro plan has been restored."
          : "No active subscription found for this Apple ID.",
      );
    } catch (e: any) {
      Alert.alert("Restore failed", e.message);
    } finally {
      restoringRef.current = false;
    }
  }, [load]);

  return {
    subscription,
    isPro,
    loading,
    refresh: load,
    subscribe,
    restorePurchases,
  };
}
