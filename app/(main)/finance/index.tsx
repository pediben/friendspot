/**
 * Finance screen — Bets, Rounds (lottery), Split Expenses, and Settle Up across all Spots.
 */
import { useState, useEffect } from "react";
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, Linking, Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCircles } from "@/hooks/useCircles";
import { CircleWithMembers, MemberProfile } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/Colors";
import { LogoMark } from "@/components/ui/LogoMark";

const BG    = Colors.bg;
const TEXT  = Colors.text;
const MUTED = Colors.textMuted;
const FAINT = Colors.textFaint;
const SAGE  = Colors.sage;
const CARD  = "rgba(255,255,255,0.04)";

const PALETTE: Record<string, string> = {
  sage:   "#8FA876",
  violet: "#8B5CF6",
  teal:   "#14B8A6",
  rose:   "#F43F5E",
  blue:   "#3B82F6",
  gold:   "#C9A84C",
};

function getAccent(colorId?: string | null) {
  return PALETTE[colorId ?? "sage"] ?? SAGE;
}

type FeatureBtn = {
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  route: (id: string) => string;
};

const FEATURES: FeatureBtn[] = [
  {
    label: "Bets",
    icon: "trophy-outline",
    color: "#CA8A04",
    bg: "rgba(234,179,8,0.09)",
    border: "rgba(234,179,8,0.25)",
    route: (id) => `/(main)/circles/${id}/bets`,
  },
  {
    label: "Rounds",
    icon: "repeat-outline",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.09)",
    border: "rgba(239,68,68,0.22)",
    route: (id) => `/(main)/circles/${id}/lottery`,
  },
  {
    label: "Split",
    icon: "calculator-outline",
    color: Colors.green,
    bg: "rgba(74,222,128,0.09)",
    border: "rgba(74,222,128,0.20)",
    route: (id) => `/(main)/circles/${id}/expenses`,
  },
];

// ─── Settle Up Modal ────────────────────────────────────────────────────────
function SettleUpModal({
  visible,
  spotName,
  banker,
  onClose,
}: {
  visible: boolean;
  spotName: string;
  banker: MemberProfile | null;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote]     = useState("");
  const insets = useSafeAreaInsets();

  // Pre-fill note when spot name changes
  useEffect(() => {
    if (spotName) setNote(`Friendspot – ${spotName}`);
  }, [spotName]);

  const openVenmo = async () => {
    const encoded  = encodeURIComponent(note || `Friendspot – ${spotName}`);
    const amt      = parseFloat(amount) || 0;
    const handle   = banker?.venmo_username?.replace(/^@/, "") ?? "";
    // If banker has a saved Venmo handle, pre-fill recipient too
    const url = handle
      ? `venmo://paycharge?txn=pay&recipients=${handle}&amount=${amt.toFixed(2)}&note=${encoded}`
      : `venmo://paycharge?txn=pay&amount=${amt.toFixed(2)}&note=${encoded}`;
    const fallback = handle
      ? `https://venmo.com/${handle}`
      : `https://venmo.com/`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      await Linking.openURL(canOpen ? url : fallback);
    } catch {
      await Linking.openURL(fallback);
    }
    onClose();
  };

  const openPayPal = async () => {
    const amt      = parseFloat(amount) || 0;
    const encoded  = encodeURIComponent(note || `Friendspot – ${spotName}`);
    const ppEmail  = banker?.paypal_email?.trim() ?? "";
    // If banker saved a paypal.me link or email, use it
    const url = `paypal://funds?amount=${amt.toFixed(2)}&currencyCode=USD&memo=${encoded}`;
    const fallback = ppEmail.startsWith("http")
      ? ppEmail
      : ppEmail
        ? `https://www.paypal.com/paypalme/${ppEmail.includes("@") ? "" : ppEmail}`
        : `https://www.paypal.com/myaccount/transfer/homepage/pay`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      await Linking.openURL(canOpen ? url : fallback);
    } catch {
      await Linking.openURL(fallback);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <Pressable onPress={() => {}} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Settle up</Text>

            {/* Banker row */}
            {banker && (
              <View style={styles.bankerRow}>
                <Avatar uri={banker.avatar_url} name={banker.display_name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankerLabel}>PAYING</Text>
                  <Text style={styles.bankerName}>{banker.display_name}</Text>
                </View>
                <View style={styles.bankerBadge}>
                  <Text style={styles.bankerBadgeText}>💰 Banker</Text>
                </View>
              </View>
            )}
            {!banker && <Text style={styles.sheetSpot}>{spotName}</Text>}

            {/* Amount */}
            <View style={styles.amountRow}>
              <Text style={styles.currencySign}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={FAINT}
                keyboardType="decimal-pad"
                autoFocus
                returnKeyType="done"
              />
            </View>

            {/* Note */}
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="What's it for?"
              placeholderTextColor={FAINT}
              returnKeyType="done"
            />

            {(banker?.venmo_username || banker?.paypal_email) ? (
              <View style={styles.bankerLinksRow}>
                {banker?.venmo_username && (
                  <View style={styles.linkChip}>
                    <Text style={styles.linkChipText}>💙 @{banker.venmo_username.replace(/^@/, "")}</Text>
                  </View>
                )}
                {banker?.paypal_email && (
                  <View style={styles.linkChip}>
                    <Text style={styles.linkChipText}>🔵 {banker.paypal_email}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.helperText}>
                Choose where to send — we'll open the app with your amount and note ready.
              </Text>
            )}

            {/* Pay buttons */}
            <View style={styles.payRow}>
              <TouchableOpacity style={styles.venmoBtn} onPress={openVenmo} activeOpacity={0.8}>
                <Text style={styles.venmoBtnText}>Pay with Venmo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.paypalBtn} onPress={openPayPal} activeOpacity={0.8}>
                <Text style={styles.paypalBtnText}>Pay with PayPal</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function FinanceScreen() {
  const { circles, loading } = useCircles();
  const insets = useSafeAreaInsets();
  const [showHint, setShowHint]       = useState(true);
  const [settleSpot, setSettleSpot]   = useState<string | null>(null);
  const [settleBanker, setSettleBanker] = useState<MemberProfile | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("wallet_hint_v2").then(v => { if (v) setShowHint(false); });
  }, []);
  const dismissHint = () => { setShowHint(false); AsyncStorage.setItem("wallet_hint_v2", "1"); };

  const renderSpot = ({ item }: { item: CircleWithMembers }) => {
    const accent      = getAccent(item.icon);
    const memberCount = item.members?.length ?? 0;
    const banker      = item.members.find(m => m.role === "owner" || m.role === "admin")
                        ?? item.members[0]
                        ?? null;

    return (
      <View style={[styles.card, { borderColor: `${accent}22` }]}>
        {/* Spot header */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => router.push(`/(main)/circles/${item.id}` as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.spotDot, { backgroundColor: accent }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.spotName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.spotSub}>{memberCount} member{memberCount !== 1 ? "s" : ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={FAINT} />
        </TouchableOpacity>

        {/* Banker row */}
        {banker && (
          <View style={styles.cardBankerRow}>
            <Avatar uri={banker.avatar_url} name={banker.display_name} size={22} />
            <Text style={styles.cardBankerText}>
              <Text style={{ color: SAGE, fontWeight: "700" }}>Banker: </Text>
              {banker.display_name}
            </Text>
            <View style={styles.cardBankerBadge}>
              <Text style={styles.cardBankerBadgeText}>💰</Text>
            </View>
          </View>
        )}

        {/* Feature buttons */}
        <View style={styles.btnRow}>
          {FEATURES.map((btn) => (
            <TouchableOpacity
              key={btn.label}
              style={[styles.btn, { backgroundColor: btn.bg, borderColor: btn.border }]}
              onPress={() => router.push(btn.route(item.id) as any)}
              activeOpacity={0.75}
            >
              <Ionicons name={btn.icon as any} size={18} color={btn.color} />
              <Text style={[styles.btnLabel, { color: btn.color }]}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settle up */}
        <TouchableOpacity
          style={styles.settleBtn}
          onPress={() => { setSettleSpot(item.name); setSettleBanker(banker); }}
          activeOpacity={0.75}
        >
          <Ionicons name="swap-horizontal-outline" size={15} color={SAGE} />
          <Text style={styles.settleBtnText}>Settle up with {banker?.display_name ?? "banker"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <LogoMark size={28} />
            <Text style={styles.heading}>Finance</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.glassBtn} onPress={() => router.push("/(main)/profile" as any)}>
              <Ionicons name="person-circle-outline" size={20} color="rgba(244,245,240,0.7)" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.sub}>Bets · Rounds · Split expenses · Settle up</Text>
      </View>

      {showHint && (
        <TouchableOpacity style={styles.hintBanner} onPress={dismissHint} activeOpacity={0.8}>
          <Ionicons name="wallet-outline" size={18} color={SAGE} />
          <Text style={styles.hintText}>
            Tap a Spot to access Bets (friendly wagers), Rounds (take turns buying), or Split Expenses (divide bills and settle up).
          </Text>
          <Text style={styles.hintClose}>✕</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator color={SAGE} style={{ marginTop: 80 }} />
      ) : circles.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.emptyTitle}>Your group wallet lives here</Text>
          <Text style={styles.emptyBody}>
            Track bets, split bills, run rounds, and settle up — all inside your Spots.
          </Text>

          <Text style={styles.demoLabel}>PREVIEW</Text>

          {/* Demo card 1 */}
          <View style={[styles.card, styles.demoCard, { borderColor: "rgba(143,168,118,0.15)", width: "100%" }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.spotDot, { backgroundColor: SAGE }]} />
              <View style={{ flex: 1 }}>
                <View style={[styles.demoLine, { width: "50%", height: 13 }]} />
                <View style={[styles.demoLine, { width: "25%", height: 10, marginTop: 5, opacity: 0.4 }]} />
              </View>
            </View>
            <View style={styles.btnRow}>
              {[{ color: "#CA8A04" }, { color: "#EF4444" }, { color: Colors.green }].map((b, i) => (
                <View key={i} style={[styles.btn, { backgroundColor: `${b.color}12`, borderColor: `${b.color}28`, opacity: 0.55 }]}>
                  <View style={{ width: 18, height: 10, borderRadius: 4, backgroundColor: `${b.color}55` }} />
                </View>
              ))}
            </View>
          </View>

          {/* Demo card 2 */}
          <View style={[styles.card, styles.demoCard, { borderColor: "rgba(139,92,246,0.15)", width: "100%" }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.spotDot, { backgroundColor: "#8B5CF6" }]} />
              <View style={{ flex: 1 }}>
                <View style={[styles.demoLine, { width: "40%", height: 13 }]} />
                <View style={[styles.demoLine, { width: "20%", height: 10, marginTop: 5, opacity: 0.4 }]} />
              </View>
            </View>
            <View style={styles.btnRow}>
              {[{ color: "#CA8A04" }, { color: "#EF4444" }, { color: Colors.green }].map((b, i) => (
                <View key={i} style={[styles.btn, { backgroundColor: `${b.color}12`, borderColor: `${b.color}28`, opacity: 0.4 }]}>
                  <View style={{ width: 18, height: 10, borderRadius: 4, backgroundColor: `${b.color}55` }} />
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(main)/circles")}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyBtnText}>Go to Spots</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(item) => item.id}
          renderItem={renderSpot}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Settle Up Modal */}
      <SettleUpModal
        visible={!!settleSpot}
        spotName={settleSpot ?? ""}
        banker={settleBanker}
        onClose={() => { setSettleSpot(null); setSettleBanker(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  glassBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heading: { fontSize: 32, fontWeight: "800", color: TEXT, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: MUTED, marginTop: 2 },

  hintBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: "rgba(143,168,118,0.1)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.25)",
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14,
    minHeight: 64,
  },
  hintText:  { flex: 1, fontSize: 13, color: MUTED, lineHeight: 19 },
  hintClose: { color: "rgba(255,255,255,0.45)", fontSize: 18, lineHeight: 18 },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },

  card: {
    backgroundColor: "#13150F",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  spotDot:  { width: 10, height: 10, borderRadius: 5 },
  spotName: { fontSize: 16, fontWeight: "700", color: TEXT },
  spotSub:  { fontSize: 12, color: MUTED, marginTop: 1 },

  btnRow: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },

  cardBankerRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginBottom: 12,
    backgroundColor: "rgba(143,168,118,0.07)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
  },
  cardBankerText: { flex: 1, fontSize: 12, color: MUTED },
  cardBankerBadge: {},
  cardBankerBadgeText: { fontSize: 14 },

  // Modal banker
  bankerRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(143,168,118,0.08)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.2)",
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 24,
  },
  bankerLabel: { fontSize: 10, fontWeight: "700", color: SAGE, letterSpacing: 1 },
  bankerName:  { fontSize: 15, fontWeight: "700", color: TEXT, marginTop: 1 },
  bankerBadge: {
    backgroundColor: "rgba(143,168,118,0.12)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  bankerBadgeText: { fontSize: 12, fontWeight: "700", color: SAGE },

  settleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(143,168,118,0.3)",
    backgroundColor: "rgba(143,168,118,0.07)",
  },
  settleBtnText: { fontSize: 13, fontWeight: "700", color: SAGE, letterSpacing: 0.2 },

  emptyScroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 120, alignItems: "center" },
  emptyTitle:  { fontSize: 22, fontWeight: "700", color: TEXT, marginBottom: 10, textAlign: "center" },
  emptyBody:   { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 21, marginBottom: 28 },
  demoLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.2)", letterSpacing: 1.4, marginBottom: 12, alignSelf: "flex-start" },
  demoCard: { opacity: 0.6 },
  demoLine: { borderRadius: 7, backgroundColor: "rgba(255,255,255,0.15)" },
  emptyBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SAGE,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 28,
  },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // ── Settle Up Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#141613",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 24,
  },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: TEXT, textAlign: "center", marginBottom: 4 },
  sheetSpot:  { fontSize: 14, color: MUTED, textAlign: "center", marginBottom: 28 },

  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  currencySign: { fontSize: 36, fontWeight: "300", color: MUTED, marginRight: 4, marginTop: 4 },
  amountInput:  {
    fontSize: 52,
    fontWeight: "700",
    color: TEXT,
    minWidth: 100,
    textAlign: "center",
  },

  noteInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: TEXT,
    marginBottom: 12,
  },

  helperText: {
    fontSize: 12, color: FAINT, textAlign: "center",
    lineHeight: 17, marginBottom: 24, paddingHorizontal: 8,
  },
  bankerLinksRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    justifyContent: "center", marginBottom: 20,
  },
  linkChip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  linkChipText: { fontSize: 13, color: MUTED },

  payRow: { gap: 10, marginBottom: 12 },

  venmoBtn: {
    backgroundColor: "#008CFF",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  venmoBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },

  paypalBtn: {
    backgroundColor: "#003087",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  paypalBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },

  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { color: MUTED, fontSize: 15 },
});
