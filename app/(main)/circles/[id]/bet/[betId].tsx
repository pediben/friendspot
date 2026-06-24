/**
 * Bet Detail Screen
 *
 * Shows:
 * - Bet title, type, status, close date
 * - Live option breakdown with coin bars (parimutuel odds)
 * - "Place bet" CTA (for open bets you haven't joined)
 * - My entry indicator if already placed
 * - Resolve / Cancel controls for creator (open bets)
 * - Results + payout when resolved
 *
 * Pool bets: single entry, no option_index, winner chosen manually.
 */

import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Bet, BetEntry, Profile } from "@/types/database";
import { Colors } from "@/constants/Colors";

type EntryWithUser = BetEntry & { user: Pick<Profile, "id" | "display_name"> };
type BetDetail = Bet & { creator: Pick<Profile, "id" | "display_name">; entries: EntryWithUser[] };

const STATUS_COLOR: Record<Bet["status"], string> = {
  open: Colors.green, closed: Colors.orange, resolved: Colors.purple, cancelled: Colors.textFaint,
};

export default function BetDetailScreen() {
  const { id: circleId, betId } = useLocalSearchParams<{ id: string; betId: string }>();
  const { session } = useAuthStore();

  const [bet, setBet]         = useState<BetDetail | null>(null);
  const [coins, setCoins]     = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Place bet modal state
  const [placeModal, setPlaceModal]   = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [stakeInput, setStakeInput]   = useState("10");
  const [placing, setPlacing]         = useState(false);

  // Resolve modal state (creator only)
  const [resolveModal, setResolveModal]     = useState(false);
  const [resolveOpt, setResolveOpt]         = useState<number | null>(null);
  const [poolWinner, setPoolWinner]         = useState<string | null>(null);
  const [resolving, setResolving]           = useState(false);

  const userId = session?.user.id ?? "";

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchBet = useCallback(async () => {
    setLoading(true);
    const [betResult, profileResult] = await Promise.all([
      supabase
        .from("bets")
        .select("*, creator:profiles!created_by(id, display_name), entries:bet_entries(*, user:profiles!user_id(id, display_name))")
        .eq("id", betId)
        .single(),
      supabase.from("profiles").select("coins").eq("id", userId).single(),
    ]);
    if (betResult.data) setBet(betResult.data as unknown as BetDetail);
    if (profileResult.data) setCoins(profileResult.data.coins);
    setLoading(false);
  }, [betId, userId]);

  useFocusEffect(useCallback(() => { fetchBet(); }, [fetchBet]));

  // ── Derived ────────────────────────────────────────────────────────────────
  const myEntry    = bet?.entries.find((e) => e.user_id === userId);
  const isCreator  = bet?.created_by === userId;
  const options    = (bet?.options as string[]) ?? [];

  /** Per-option aggregate */
  const optionSummaries = options.map((label, i) => {
    const entries = bet?.entries.filter((e) => e.option_index === i) ?? [];
    const total   = entries.reduce((s, e) => s + e.amount_coins, 0);
    return { i, label, total, count: entries.length };
  });
  const totalPool = bet?.entries.reduce((s, e) => s + e.amount_coins, 0) ?? 0;

  // ── Place bet ──────────────────────────────────────────────────────────────
  const placeBet = async () => {
    const stake = parseInt(stakeInput, 10);
    if (isNaN(stake) || stake < 1) { Alert.alert("Invalid amount"); return; }
    if (stake > (bet?.max_stake ?? 0)) { Alert.alert(`Max stake is ${bet?.max_stake} coins`); return; }
    if (stake > coins) { Alert.alert("Not enough coins"); return; }
    if (bet?.bet_type !== "pool" && selectedOpt === null) { Alert.alert("Pick an option"); return; }

    setPlacing(true);
    try {
      const { error } = await supabase.rpc("place_bet", {
        p_bet_id: betId,
        p_option_index: bet?.bet_type === "pool" ? null : selectedOpt,
        p_amount: stake,
      });
      if (error) throw error;
      setPlaceModal(false);
      fetchBet();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setPlacing(false);
    }
  };

  // ── Resolve ────────────────────────────────────────────────────────────────
  const resolveBet = async () => {
    if (bet?.bet_type !== "pool" && resolveOpt === null) { Alert.alert("Pick winning option"); return; }
    if (bet?.bet_type === "pool" && !poolWinner) { Alert.alert("Pick the winner"); return; }

    setResolving(true);
    try {
      const { error } = await supabase.rpc("resolve_bet", {
        p_bet_id: betId,
        p_winning_option: bet?.bet_type === "pool" ? null : resolveOpt,
        p_pool_winner: bet?.bet_type === "pool" ? poolWinner : null,
      });
      if (error) throw error;
      setResolveModal(false);
      fetchBet();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setResolving(false);
    }
  };

  const cancelBet = () => {
    Alert.alert(
      "Cancel bet?",
      "All coins will be refunded. This can't be undone.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel bet",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.rpc("cancel_bet", { p_bet_id: betId });
            if (error) Alert.alert("Error", error.message);
            else fetchBet();
          },
        },
      ]
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.purple} size="large" />
      </View>
    );
  }

  if (!bet) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.textMuted }}>Bet not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.coinBadge}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinCount}>{coins.toLocaleString()}</Text>
          </View>
        </View>

        {/* Status + type */}
        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: STATUS_COLOR[bet.status] + "20" }]}>
            <Text style={[styles.pillText, { color: STATUS_COLOR[bet.status] }]}>
              {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.metaType}>{bet.bet_type} · by {bet.creator.display_name}</Text>
        </View>

        {/* Title */}
        <Text style={styles.betTitle}>{bet.title}</Text>
        {bet.description && <Text style={styles.betDesc}>{bet.description}</Text>}
        {bet.closes_at && (
          <Text style={styles.closesAt}>
            Closes {new Date(bet.closes_at).toLocaleDateString()}
          </Text>
        )}

        {/* Options (binary / multi) */}
        {bet.bet_type !== "pool" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Options</Text>
            {optionSummaries.map(({ i, label, total, count }) => {
              const pct = totalPool > 0 ? (total / totalPool) * 100 : 0;
              const isWinner = bet.status === "resolved" && bet.resolved_option === i;
              return (
                <View key={i} style={[styles.optionCard, isWinner && styles.optionWinner]}>
                  <View style={styles.optionTop}>
                    <Text style={styles.optionLabel}>{label}</Text>
                    <Text style={styles.optionCoins}>{total.toLocaleString()} 🪙</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: isWinner ? Colors.green : Colors.purple }]} />
                  </View>
                  <Text style={styles.optionMeta}>
                    {count} {count === 1 ? "entry" : "entries"} · {pct.toFixed(0)}%
                    {totalPool > 0 && total > 0
                      ? `  ·  ~${(totalPool / total).toFixed(2)}x`
                      : ""}
                  </Text>
                  {myEntry?.option_index === i && (
                    <Text style={styles.myEntry}>✓ Your pick · {myEntry.amount_coins} coins</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Pool entries */}
        {bet.bet_type === "pool" && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pool · {totalPool.toLocaleString()} coins total</Text>
            {bet.entries.length === 0 && (
              <Text style={styles.emptyEntries}>No entries yet — be first in!</Text>
            )}
            {bet.entries.map((e) => (
              <View key={e.id} style={styles.poolEntry}>
                <Text style={styles.poolEntryName}>
                  {e.user.display_name}
                  {e.user.id === userId ? " (you)" : ""}
                  {bet.status === "resolved" && bet.winner_user_id === e.user.id ? " 🏆" : ""}
                </Text>
                <Text style={styles.poolEntryCoins}>{e.amount_coins} 🪙</Text>
              </View>
            ))}
          </View>
        )}

        {/* Place bet CTA */}
        {bet.status === "open" && !myEntry && (
          <TouchableOpacity style={styles.placeBetBtn} onPress={() => { setSelectedOpt(null); setPlaceModal(true); }}>
            <Text style={styles.placeBetText}>Place bet</Text>
          </TouchableOpacity>
        )}
        {myEntry && bet.status === "open" && (
          <View style={styles.alreadyIn}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
            <Text style={styles.alreadyInText}>You're in for {myEntry.amount_coins} coins</Text>
          </View>
        )}

        {/* Resolved result */}
        {bet.status === "resolved" && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {bet.bet_type === "pool"
                ? `🏆 Winner: ${bet.entries.find((e) => e.user_id === bet.winner_user_id)?.user.display_name ?? "?"}`
                : `✅ ${options[bet.resolved_option ?? 0]} won`}
            </Text>
          </View>
        )}

        {/* Creator controls */}
        {isCreator && bet.status === "open" && (
          <View style={styles.creatorRow}>
            <TouchableOpacity style={styles.resolveBtn} onPress={() => setResolveModal(true)}>
              <Text style={styles.resolveBtnText}>Resolve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelBet}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Place Bet Modal */}
      <Modal visible={placeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Place your bet</Text>

            {bet.bet_type !== "pool" && (
              <>
                <Text style={styles.modalLabel}>Pick an option</Text>
                {optionSummaries.map(({ i, label }) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.modalOption, selectedOpt === i && styles.modalOptionActive]}
                    onPress={() => setSelectedOpt(i)}
                  >
                    <Text style={[styles.modalOptionText, selectedOpt === i && { color: Colors.purple }]}>
                      {label}
                    </Text>
                    {selectedOpt === i && <Ionicons name="checkmark" size={18} color={Colors.purple} />}
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={styles.modalLabel}>Stake (max {bet.max_stake})</Text>
            <TextInput
              style={styles.modalInput}
              value={stakeInput}
              onChangeText={setStakeInput}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Text style={styles.balanceHint}>Your balance: {coins.toLocaleString()} 🪙</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setPlaceModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, placing && { opacity: 0.6 }]}
                onPress={placeBet}
                disabled={placing}
              >
                {placing
                  ? <ActivityIndicator color={Colors.text} />
                  : <Text style={styles.modalConfirmText}>Confirm</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Resolve Modal */}
      <Modal visible={resolveModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Resolve bet</Text>

            {bet.bet_type === "pool" ? (
              <>
                <Text style={styles.modalLabel}>Who won the pool?</Text>
                {bet.entries.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.modalOption, poolWinner === e.user.id && styles.modalOptionActive]}
                    onPress={() => setPoolWinner(e.user.id)}
                  >
                    <Text style={[styles.modalOptionText, poolWinner === e.user.id && { color: Colors.purple }]}>
                      {e.user.display_name}
                    </Text>
                    {poolWinner === e.user.id && <Ionicons name="checkmark" size={18} color={Colors.purple} />}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>Which option won?</Text>
                {optionSummaries.map(({ i, label }) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.modalOption, resolveOpt === i && styles.modalOptionActive]}
                    onPress={() => setResolveOpt(i)}
                  >
                    <Text style={[styles.modalOptionText, resolveOpt === i && { color: Colors.green }]}>
                      {label}
                    </Text>
                    {resolveOpt === i && <Ionicons name="checkmark" size={18} color={Colors.green} />}
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setResolveModal(false)}>
                <Text style={styles.modalCancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: Colors.green }, resolving && { opacity: 0.6 }]}
                onPress={resolveBet}
                disabled={resolving}
              >
                {resolving
                  ? <ActivityIndicator color={Colors.text} />
                  : <Text style={styles.modalConfirmText}>Resolve & pay out</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coinEmoji: { fontSize: 14 },
  coinCount: { color: Colors.text, fontWeight: "700", fontSize: 14 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: "700" },
  metaType: { color: Colors.textFaint, fontSize: 13 },

  betTitle: { fontSize: 22, fontWeight: "700", color: Colors.text, lineHeight: 28, marginBottom: 6 },
  betDesc: { color: Colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  closesAt: { color: Colors.orange, fontSize: 12, marginBottom: 8 },

  section: { marginTop: 24 },
  sectionLabel: { color: Colors.textFaint, fontSize: 12, fontWeight: "700", marginBottom: 10 },

  optionCard: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  optionWinner: { borderColor: Colors.green },
  optionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionLabel: { color: Colors.text, fontWeight: "600", fontSize: 15 },
  optionCoins: { color: Colors.textMuted, fontSize: 14 },
  barBg: { height: 6, backgroundColor: Colors.bgCardBorder, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3, minWidth: 4 },
  optionMeta: { color: Colors.textFaint, fontSize: 12 },
  myEntry: { color: Colors.green, fontSize: 12, fontWeight: "600" },

  emptyEntries: { color: Colors.textFaint, fontSize: 14, textAlign: "center", marginVertical: 12 },
  poolEntry: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgCardBorder,
  },
  poolEntryName: { color: Colors.text, fontSize: 14 },
  poolEntryCoins: { color: Colors.textMuted, fontSize: 14 },

  placeBetBtn: {
    marginTop: 24,
    backgroundColor: Colors.purple,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  placeBetText: { color: Colors.text, fontWeight: "700", fontSize: 16 },

  alreadyIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 16,
  },
  alreadyInText: { color: Colors.green, fontWeight: "600", fontSize: 14 },

  resultCard: {
    marginTop: 20,
    padding: 18,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.green,
    borderRadius: 16,
    alignItems: "center",
  },
  resultTitle: { color: Colors.text, fontSize: 18, fontWeight: "700", textAlign: "center" },

  creatorRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  resolveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: Colors.green,
    alignItems: "center",
  },
  resolveBtnText: { color: Colors.text, fontWeight: "700", fontSize: 15 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: Colors.red,
    alignItems: "center",
  },
  cancelBtnText: { color: Colors.text, fontWeight: "700", fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  modalLabel: { color: Colors.textFaint, fontSize: 13, fontWeight: "600", marginTop: 8 },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  modalOptionActive: { borderColor: Colors.purple, backgroundColor: "rgba(124,58,237,0.08)" },
  modalOptionText: { color: Colors.text, fontSize: 15 },
  modalInput: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 12,
    padding: 12,
    color: Colors.text,
    fontSize: 16,
  },
  balanceHint: { color: Colors.textFaint, fontSize: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    alignItems: "center",
  },
  modalCancelText: { color: Colors.textMuted, fontSize: 15 },
  modalConfirm: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: Colors.purple,
    alignItems: "center",
  },
  modalConfirmText: { color: Colors.text, fontWeight: "700", fontSize: 15 },
});
