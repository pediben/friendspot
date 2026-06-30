/**
 * Friendspot Pro — paywall screen
 *
 * Presented as a modal. Monthly / Annual toggle. Feature list.
 * Purchase is wired to useSubscription.subscribe() which you can
 * swap for RevenueCat or any IAP SDK.
 */
import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Platform, Linking, Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSubscription, SubPlan } from "@/hooks/useSubscription";
import { Colors } from "@/constants/Colors";

const BG      = "#0C0D0B";
const CARD    = "rgba(255,255,255,0.04)";
const BORDER  = "rgba(255,255,255,0.08)";
const TEXT    = Colors.text;
const MUTED   = Colors.textMuted;
const FAINT   = Colors.textFaint;
const SAGE    = Colors.sage;
const GREEN   = Colors.green;

const FEATURES = [
  {
    icon: "add-circle-outline" as const,
    label: "Unlimited Spots",
    sub: "Free plan: up to 3 Spots",
  },
  {
    icon: "send-outline" as const,
    label: "Premium invite themes",
    sub: "Custom backgrounds & styles",
  },
  {
    icon: "bar-chart-outline" as const,
    label: "RSVP analytics",
    sub: "See who opened your invite",
  },
  {
    icon: "mic-outline" as const,
    label: "Extended voice notes",
    sub: "Up to 5 min (free: 1 min)",
  },
  {
    icon: "notifications-outline" as const,
    label: "Auto guest reminders",
    sub: "Push reminders to invitees",
  },
  {
    icon: "link-outline" as const,
    label: "Custom invite link",
    sub: "friendspot.online/yourname",
  },
];

export default function ProScreen() {
  const insets = useSafeAreaInsets();
  const { isPro, subscribe, restorePurchases } = useSubscription();

  const [plan,    setPlan]    = useState<SubPlan>("annual");
  const [loading, setLoading] = useState(false);

  const MONTHLY_PRICE = "$4.99";
  const ANNUAL_PRICE  = "$39.99";
  const ANNUAL_PER_MO = "$3.33";

  const handleSubscribe = async () => {
    setLoading(true);
    const ok = await subscribe(plan);
    setLoading(false);
    if (ok) {
      router.back();
    } else {
      Alert.alert("Purchase failed", "Couldn't complete the purchase. Please try again.");
    }
  };

  if (isPro) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={20} color={MUTED} />
        </TouchableOpacity>
        <View style={styles.proActive}>
          <Ionicons name="checkmark-circle" size={56} color={GREEN} />
          <Text style={styles.proActiveTitle}>You're on Pro!</Text>
          <Text style={styles.proActiveSub}>All features are unlocked. Enjoy Friendspot.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="close" size={20} color={MUTED} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>Friendspot Pro</Text>
          </View>
          <Text style={styles.heroTitle}>Upgrade your Spots</Text>
          <Text style={styles.heroSub}>
            More Spots, better invites,{"\n"}and tools to keep your crew close.
          </Text>
        </View>

        {/* Plan toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleOpt, plan === "monthly" && styles.toggleOptActive]}
            onPress={() => setPlan("monthly")}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleLabel, plan === "monthly" && { color: TEXT }]}>Monthly</Text>
            <Text style={[styles.togglePrice, plan === "monthly" && { color: SAGE }]}>{MONTHLY_PRICE}/mo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleOpt, plan === "annual" && styles.toggleOptActive]}
            onPress={() => setPlan("annual")}
            activeOpacity={0.8}
          >
            <View style={styles.toggleLabelRow}>
              <Text style={[styles.toggleLabel, plan === "annual" && { color: TEXT }]}>Annual</Text>
              <View style={styles.savePill}><Text style={styles.savePillText}>Save 33%</Text></View>
            </View>
            <Text style={[styles.togglePrice, plan === "annual" && { color: SAGE }]}>{ANNUAL_PRICE}/yr</Text>
          </TouchableOpacity>
        </View>

        {/* Price display */}
        <View style={styles.priceRow}>
          <Text style={styles.priceAmount}>
            {plan === "annual" ? ANNUAL_PER_MO : MONTHLY_PRICE}
          </Text>
          <Text style={styles.pricePeriod}>/month</Text>
        </View>
        <Text style={styles.priceNote}>
          {plan === "annual"
            ? `Billed ${ANNUAL_PRICE} annually`
            : "Billed monthly, cancel anytime"}
        </Text>

        {/* Features */}
        <View style={styles.featuresCard}>
          {FEATURES.map((f, i) => (
            <View key={f.label} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={16} color={SAGE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={handleSubscribe}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={BG} />
            : <Text style={styles.ctaBtnText}>
                {plan === "annual" ? "Subscribe annually" : "Subscribe monthly"}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={restorePurchases} hitSlop={8}>
          <Text style={styles.restoreLink}>Restore purchase</Text>
        </TouchableOpacity>

        <View style={styles.termsRow}>
          <TouchableOpacity onPress={() => Linking.openURL("https://friendspot.online/privacy")} hitSlop={8}>
            <Text style={styles.termsLink}>Privacy policy</Text>
          </TouchableOpacity>
          <Text style={styles.termsDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://friendspot.online/terms")} hitSlop={8}>
            <Text style={styles.termsLink}>Terms of use</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: BG },
  closeBtn:          { position: "absolute", top: Platform.OS === "ios" ? 54 : 20, right: 20, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  scroll:            { padding: 24, paddingTop: 48 },
  // Hero
  hero:              { alignItems: "center", marginBottom: 28 },
  proBadge:          { backgroundColor: "rgba(143,168,118,0.15)", borderWidth: 1, borderColor: "rgba(143,168,118,0.3)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 14 },
  proBadgeText:      { fontSize: 12, fontWeight: "700", color: SAGE, letterSpacing: 0.5 },
  heroTitle:         { fontSize: 26, fontWeight: "800", color: TEXT, marginBottom: 8, textAlign: "center" },
  heroSub:           { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 20 },
  // Toggle
  toggle:            { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 3, marginBottom: 20, borderWidth: 1, borderColor: BORDER },
  toggleOpt:         { flex: 1, borderRadius: 11, padding: 10, alignItems: "center" },
  toggleOptActive:   { backgroundColor: "rgba(143,168,118,0.2)" },
  toggleLabelRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleLabel:       { fontSize: 14, fontWeight: "700", color: MUTED },
  togglePrice:       { fontSize: 12, color: FAINT, marginTop: 2 },
  savePill:          { backgroundColor: "rgba(143,168,118,0.25)", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  savePillText:      { fontSize: 10, fontWeight: "700", color: SAGE },
  // Price
  priceRow:          { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 2 },
  priceAmount:       { fontSize: 40, fontWeight: "800", color: TEXT },
  pricePeriod:       { fontSize: 16, color: MUTED },
  priceNote:         { textAlign: "center", fontSize: 12, color: FAINT, marginTop: 4, marginBottom: 24 },
  // Features
  featuresCard:      { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 4, marginBottom: 24 },
  featureRow:        { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  featureRowBorder:  { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  featureIcon:       { width: 32, height: 32, borderRadius: 9, backgroundColor: "rgba(143,168,118,0.12)", alignItems: "center", justifyContent: "center" },
  featureLabel:      { fontSize: 14, fontWeight: "700", color: TEXT },
  featureSub:        { fontSize: 12, color: FAINT, marginTop: 1 },
  // CTA
  ctaBtn:            { backgroundColor: SAGE, borderRadius: 16, paddingVertical: 17, alignItems: "center", marginBottom: 14 },
  ctaBtnText:        { fontSize: 17, fontWeight: "800", color: BG },
  restoreLink:       { textAlign: "center", fontSize: 13, color: FAINT, marginBottom: 12 },
  termsRow:          { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  termsLink:         { fontSize: 11, color: "rgba(244,245,240,0.2)" },
  termsDot:          { fontSize: 11, color: "rgba(244,245,240,0.2)" },
  // Already Pro
  proActive:         { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  proActiveTitle:    { fontSize: 26, fontWeight: "800", color: TEXT, marginTop: 16, marginBottom: 8 },
  proActiveSub:      { fontSize: 15, color: MUTED, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  doneBtn:           { backgroundColor: SAGE, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 48 },
  doneBtnText:       { fontSize: 16, fontWeight: "700", color: BG },
});
