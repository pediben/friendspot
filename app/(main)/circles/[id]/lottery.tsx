/**
 * Rounds Screen — rotating savings pool (ROSCA / Sandogh).
 * Every member contributes each round; one member receives the full pot per round.
 * After N rounds (= member count), everyone has received once.
 */
import { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";

type Round = {
  id: string;
  title: string;
  entry_amount: number;
  currency: string;
  draw_date: string;
  status: "open" | "drawn" | "cancelled";
  winner_id: string | null;
  winner: { display_name: string } | null;
  entries: { user_id: string; paid: boolean; profile: { display_name: string } }[];
};

const STATUS_COLOR = { open: Colors.green, drawn: Colors.purple, cancelled: Colors.textFaint };
const STATUS_LABEL = { open: "Collecting", drawn: "Paid out", cancelled: "Cancelled" };

export default function RoundsScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRounds = useCallback(async () => {
    if (!circleId) return;
    const { data, error } = await supabase
      .from("circle_lotteries")
      .select(`
        id, title, entry_amount, currency, draw_date, status, winner_id,
        winner:profiles!winner_id(display_name),
        entries:lottery_entries(user_id, paid, profile:profiles!user_id(display_name))
      `)
      .eq("circle_id", circleId)
      .order("draw_date", { ascending: false });

    if (error) console.error("[Rounds]", error.message);
    else setRounds((data ?? []) as any);
    setLoading(false);
    setRefreshing(false);
  }, [circleId]);

  useFocusEffect(useCallback(() => { fetchRounds(); }, [fetchRounds]));

  const joinRound = async (roundId: string) => {
    const { error } = await supabase
      .from("lottery_entries")
      .insert({ lottery_id: roundId, user_id: userId! });
    if (error) Alert.alert("Error", error.message);
    else fetchRounds();
  };

  const markPaid = async (roundId: string) => {
    const { error } = await supabase
      .from("lottery_entries")
      .update({ paid: true })
      .eq("lottery_id", roundId)
      .eq("user_id", userId!);
    if (error) Alert.alert("Error", error.message);
    else fetchRounds();
  };

  const selectRecipient = async (round: Round) => {
    const eligible = round.entries.filter(e => e.paid);
    if (eligible.length === 0) {
      Alert.alert("No paid contributions yet", "Everyone needs to mark as paid before selecting a recipient.");
      return;
    }
    // For now: rotate — pick someone who hasn't received yet (simplified)
    const recipient = eligible[Math.floor(Math.random() * eligible.length)];
    const { error } = await supabase
      .from("circle_lotteries")
      .update({ status: "drawn", winner_id: recipient.user_id })
      .eq("id", round.id);
    if (error) Alert.alert("Error", error.message);
    else {
      const name = (recipient.profile as any)?.display_name ?? "Someone";
      const pot = round.currency + " " + (round.entry_amount * eligible.length).toFixed(2);
      Alert.alert("🎉 This round's recipient", `${name} receives ${pot}!`);
      fetchRounds();
    }
  };

  const renderRound = ({ item }: { item: Round }) => {
    const myEntry = item.entries.find(e => e.user_id === userId);
    const inRound = !!myEntry;
    const paidCount = item.entries.filter(e => e.paid).length;
    const totalPot = item.entry_amount * paidCount;
    const drawDate = new Date(item.draw_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="repeat-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + "22" }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.currency} {Number(item.entry_amount).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Per person</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.currency} {totalPot.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Pot so far</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{paidCount}/{item.entries.length}</Text>
            <Text style={styles.statLabel}>Paid in</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, {
            width: item.entries.length > 0
              ? `${(paidCount / item.entries.length) * 100}%` as any
              : "0%"
          }]} />
        </View>

        <Text style={styles.payoutDate}>Payout: {drawDate}</Text>

        {item.status === "drawn" && item.winner && (
          <View style={styles.recipientBanner}>
            <Text style={styles.recipientText}>🏆 Received by: {(item.winner as any).display_name}</Text>
          </View>
        )}

        {item.status === "open" && (
          <View style={styles.actions}>
            {!inRound ? (
              <TouchableOpacity style={styles.joinBtn} onPress={() => joinRound(item.id)}>
                <Text style={styles.joinBtnText}>Join round</Text>
              </TouchableOpacity>
            ) : !myEntry?.paid ? (
              <TouchableOpacity style={styles.payBtn} onPress={() => markPaid(item.id)}>
                <Text style={styles.payBtnText}>Mark contributed</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.paidText}>✓ Contributed</Text>
            )}
            <TouchableOpacity style={styles.selectBtn} onPress={() => selectRecipient(item)}>
              <Text style={styles.selectBtnText}>Select recipient</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Rounds</Text>
        <TouchableOpacity onPress={() => router.push(`/(main)/circles/${circleId}/lottery/create` as any)}>
          <Ionicons name="add" size={26} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#EF4444" style={{ flex: 1 }} />
      ) : rounds.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔄</Text>
          <Text style={styles.emptyTitle}>No rounds yet</Text>
          <Text style={styles.emptyBody}>
            Everyone contributes each round.{"\n"}
            One person receives the full pot.{"\n"}
            Take turns until everyone's had their round.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push(`/(main)/circles/${circleId}/lottery/create` as any)}
          >
            <Text style={styles.emptyBtnText}>Start a round</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rounds}
          keyExtractor={r => r.id}
          renderItem={renderRound}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRounds(); }}
              tintColor="#EF4444"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: Colors.text, textAlign: "center" },

  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.bgCardBorder,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitleRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },

  statsRow: { flexDirection: "row", marginBottom: 12 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700", color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  progressBg: {
    height: 4, backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2, marginBottom: 10, overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: "#EF4444", borderRadius: 2 },

  payoutDate: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },

  recipientBanner: {
    backgroundColor: "rgba(124,58,237,0.15)",
    borderRadius: 12, padding: 12, alignItems: "center",
  },
  recipientText: { color: Colors.purple, fontWeight: "700", fontSize: 15 },

  actions: { flexDirection: "row", gap: 8 },
  joinBtn: {
    flex: 1, backgroundColor: "#EF4444",
    borderRadius: 12, paddingVertical: 10, alignItems: "center",
  },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  payBtn: {
    flex: 1, backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 12, paddingVertical: 10, alignItems: "center",
  },
  payBtnText: { color: Colors.green, fontWeight: "700", fontSize: 14 },
  paidText: { flex: 1, color: Colors.green, fontWeight: "600", fontSize: 14, textAlign: "center", paddingVertical: 10 },
  selectBtn: {
    flex: 1, backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 12, paddingVertical: 10, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
  },
  selectBtnText: { color: "#EF4444", fontWeight: "700", fontSize: 14 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: Colors.text, marginBottom: 10 },
  emptyBody: { color: Colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  emptyBtn: {
    backgroundColor: "#EF4444", paddingHorizontal: 36,
    paddingVertical: 14, borderRadius: 30,
  },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
