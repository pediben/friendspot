/**
 * Circle Bets Screen — lists all bets in a circle.
 *
 * Shows: open bets (join now), closed bets (waiting for resolution),
 * resolved bets (final results). Tapping any bet goes to bet/[betId].tsx.
 * Coin balance shown in header.
 */

import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Bet, Profile } from "@/types/database";
import { Colors } from "@/constants/Colors";

type BetWithCreator = Bet & { creator: Pick<Profile, "display_name"> };

const STATUS_LABEL: Record<Bet["status"], string> = {
  open: "Open",
  closed: "Closing…",
  resolved: "Resolved",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<Bet["status"], string> = {
  open: Colors.green,
  closed: Colors.orange,
  resolved: Colors.purple,
  cancelled: Colors.textFaint,
};
const BET_TYPE_ICON: Record<Bet["bet_type"], string> = {
  binary: "git-branch-outline",
  multi: "list-outline",
  pool: "people-outline",
};

export default function CircleBetsScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();

  const [bets, setBets]         = useState<BetWithCreator[]>([]);
  const [coins, setCoins]       = useState<number | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [betsResult, profileResult] = await Promise.all([
      supabase
        .from("bets")
        .select("*, creator:profiles!created_by(display_name)")
        .eq("circle_id", circleId)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("coins")
        .eq("id", session?.user.id ?? "")
        .single(),
    ]);

    setBets((betsResult.data as BetWithCreator[]) ?? []);
    if (profileResult.data) setCoins(profileResult.data.coins);
    setLoading(false);
    setRefreshing(false);
  }, [circleId, session?.user.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const renderBet = ({ item }: { item: BetWithCreator }) => {
    const options = item.options as string[];
    const preview = item.bet_type === "pool"
      ? `Pool · max ${item.max_stake} coins`
      : options.slice(0, 3).join(" vs ") + (options.length > 3 ? "…" : "");

    return (
      <TouchableOpacity
        style={styles.betCard}
        onPress={() => router.push({
          pathname: "/(main)/circles/[id]/bet/[betId]" as any,
          params: { id: circleId, betId: item.id },
        })}
        activeOpacity={0.8}
      >
        <View style={styles.betCardTop}>
          <Ionicons
            name={BET_TYPE_ICON[item.bet_type] as any}
            size={18}
            color={Colors.textMuted}
          />
          <Text style={styles.betTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[item.status] + "20" }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.betPreview} numberOfLines={1}>{preview}</Text>
        <Text style={styles.betMeta}>
          by {item.creator?.display_name ?? "someone"}
          {item.closes_at ? ` · closes ${new Date(item.closes_at).toLocaleDateString()}` : ""}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Bets</Text>
        <View style={styles.coinBadge}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinCount}>
            {coins !== null ? coins.toLocaleString() : "…"}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.purple} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bets}
          keyExtractor={(b) => b.id}
          renderItem={renderBet}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor={Colors.purple}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎲</Text>
              <Text style={styles.emptyTitle}>No bets yet</Text>
              <Text style={styles.emptyHint}>Be the first to make a call.</Text>
            </View>
          }
          contentContainerStyle={{ padding: 16, gap: 10 }}
        />
      )}

      {/* Create bet FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({
          pathname: "/(main)/circles/[id]/bet/create" as any,
          params: { id: circleId },
        })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={Colors.text} />
        <Text style={styles.fabText}>New bet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: Colors.text },
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

  betCard: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  betCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  betTitle: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: "600", lineHeight: 20 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  statusText: { fontSize: 11, fontWeight: "700" },
  betPreview: { color: Colors.textMuted, fontSize: 13 },
  betMeta: { color: Colors.textFaint, fontSize: 12 },

  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: "700" },
  emptyHint: { color: Colors.textMuted, fontSize: 14 },

  fab: {
    position: "absolute",
    bottom: 32,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.purple,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: Colors.text, fontWeight: "700", fontSize: 15 },
});
