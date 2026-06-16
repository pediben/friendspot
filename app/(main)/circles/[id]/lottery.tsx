/**
 * Lottery Screen — monthly pool, random winner draw.
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

type Lottery = {
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
const STATUS_LABEL = { open: "Open", drawn: "Winner drawn", cancelled: "Cancelled" };

export default function LotteryScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLotteries = useCallback(async () => {
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

    if (error) console.error("[Lottery]", error.message);
    else setLotteries((data ?? []) as any);
    setLoading(false);
    setRefreshing(false);
  }, [circleId]);

  useFocusEffect(useCallback(() => { fetchLotteries(); }, [fetchLotteries]));

  const joinLottery = async (lotteryId: string) => {
    const { error } = await supabase
      .from("lottery_entries")
      .insert({ lottery_id: lotteryId, user_id: userId });
    if (error) Alert.alert("Error", error.message);
    else fetchLotteries();
  };

  const drawWinner = async (lottery: Lottery) => {
    const eligible = lottery.entries.filter(e => e.paid);
    if (eligible.length === 0) {
      Alert.alert("No paid entries", "Everyone needs to mark as paid first.");
      return;
    }
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    const { error } = await supabase
      .from("circle_lotteries")
      .update({ status: "drawn", winner_id: winner.user_id })
      .eq("id", lottery.id);
    if (error) Alert.alert("Error", error.message);
    else {
      const winnerName = (winner.profile as any)?.display_name ?? "Someone";
      Alert.alert("🎉 Winner!", `${winnerName} wins the pot of ${lottery.currency} ${(lottery.entry_amount * eligible.length).toFixed(2)}!`);
      fetchLotteries();
    }
  };

  const markPaid = async (lotteryId: string) => {
    const { error } = await supabase
      .from("lottery_entries")
      .update({ paid: true })
      .eq("lottery_id", lotteryId)
      .eq("user_id", userId);
    if (error) Alert.alert("Error", error.message);
    else fetchLotteries();
  };

  const renderLottery = ({ item }: { item: Lottery }) => {
    const myEntry = item.entries.find(e => e.user_id === userId);
    const inLottery = !!myEntry;
    const totalPot = item.entry_amount * item.entries.filter(e => e.paid).length;
    const drawDate = new Date(item.draw_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + "22" }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.currency} {Number(item.entry_amount).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Entry</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.currency} {totalPot.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total pot</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.entries.length}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
        </View>

        <Text style={styles.drawDate}>Draw: {drawDate}</Text>

        {item.status === "drawn" && item.winner && (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerText}>🏆 Winner: {(item.winner as any).display_name}</Text>
          </View>
        )}

        {item.status === "open" && (
          <View style={styles.actions}>
            {!inLottery ? (
              <TouchableOpacity style={styles.joinBtn} onPress={() => joinLottery(item.id)}>
                <Text style={styles.joinBtnText}>Join lottery</Text>
              </TouchableOpacity>
            ) : !myEntry?.paid ? (
              <TouchableOpacity style={styles.payBtn} onPress={() => markPaid(item.id)}>
                <Text style={styles.payBtnText}>Mark as paid</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.paidText}>✓ You're in and paid</Text>
            )}
            <TouchableOpacity style={styles.drawBtn} onPress={() => drawWinner(item)}>
              <Text style={styles.drawBtnText}>Draw winner</Text>
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
        <Text style={styles.title}>Lottery</Text>
        <TouchableOpacity onPress={() => router.push(`/(main)/circles/${circleId}/lottery/create` as any)}>
          <Ionicons name="add" size={26} color={Colors.purple} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.purple} style={{ flex: 1 }} />
      ) : lotteries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎰</Text>
          <Text style={styles.emptyText}>No lotteries yet.{"\n"}Tap + to start a pool.</Text>
        </View>
      ) : (
        <FlatList
          data={lotteries}
          keyExtractor={l => l.id}
          renderItem={renderLottery}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLotteries(); }} tintColor={Colors.purple} />}
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
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  statsRow: { flexDirection: "row", marginBottom: 12 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700", color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  drawDate: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  winnerBanner: {
    backgroundColor: "rgba(124,58,237,0.15)",
    borderRadius: 12, padding: 12, alignItems: "center",
  },
  winnerText: { color: Colors.purple, fontWeight: "700", fontSize: 15 },
  actions: { flexDirection: "row", gap: 8 },
  joinBtn: {
    flex: 1, backgroundColor: Colors.purple,
    borderRadius: 12, paddingVertical: 10, alignItems: "center",
  },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  payBtn: {
    flex: 1, backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 12, paddingVertical: 10, alignItems: "center",
  },
  payBtnText: { color: Colors.green, fontWeight: "700", fontSize: 14 },
  paidText: { flex: 1, color: Colors.green, fontWeight: "600", fontSize: 14, textAlign: "center", paddingVertical: 10 },
  drawBtn: {
    flex: 1, backgroundColor: "rgba(234,179,8,0.15)",
    borderRadius: 12, paddingVertical: 10, alignItems: "center",
  },
  drawBtnText: { color: "#CA8A04", fontWeight: "700", fontSize: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: Colors.textMuted, fontSize: 16, textAlign: "center", lineHeight: 24 },
});
