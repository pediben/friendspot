/**
 * Expense Split Screen — list expenses in a circle, show who owes what.
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

type Expense = {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  category: string | null;
  created_at: string;
  paid_by: string;
  payer: { display_name: string };
  splits: { user_id: string; amount_owed: number; settled: boolean; profile: { display_name: string } }[];
};

const CATEGORY_ICON: Record<string, string> = {
  food: "🍕", transport: "🚗", lodging: "🏠", activity: "🎉", other: "💸",
};

export default function ExpensesScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!circleId) return;
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id, description, amount, currency, category, created_at, paid_by,
        payer:profiles!paid_by(display_name),
        splits:expense_splits(user_id, amount_owed, settled, profile:profiles!user_id(display_name))
      `)
      .eq("circle_id", circleId)
      .order("created_at", { ascending: false });

    if (error) console.error("[Expenses]", error.message);
    else setExpenses((data ?? []) as any);
    setLoading(false);
    setRefreshing(false);
  }, [circleId]);

  useFocusEffect(useCallback(() => { fetchExpenses(); }, [fetchExpenses]));

  // Compute my net balance across all expenses
  const myBalance = expenses.reduce((acc, exp) => {
    const mySplit = exp.splits.find(s => s.user_id === userId);
    if (mySplit && !mySplit.settled) acc -= mySplit.amount_owed;
    if (exp.paid_by === userId) {
      acc += exp.splits.filter(s => s.user_id !== userId && !s.settled)
        .reduce((sum, s) => sum + s.amount_owed, 0);
    }
    return acc;
  }, 0);

  const markSettled = async (expenseId: string, splitUserId: string) => {
    const { error } = await supabase
      .from("expense_splits")
      .update({ settled: true, settled_at: new Date().toISOString() })
      .eq("expense_id", expenseId)
      .eq("user_id", splitUserId);
    if (error) Alert.alert("Error", error.message);
    else fetchExpenses();
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const icon = CATEGORY_ICON[item.category ?? "other"] ?? "💸";
    const myOwed = item.splits.find(s => s.user_id === userId && !s.settled);
    const iPaid = item.paid_by === userId;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.description ?? "Expense"}</Text>
            <Text style={styles.cardSub}>
              Paid by {iPaid ? "you" : (item.payer as any)?.display_name ?? "someone"} ·{" "}
              {item.currency} {Number(item.amount).toFixed(2)}
            </Text>
          </View>
        </View>

        {item.splits.map(split => {
          const isMe = split.user_id === userId;
          const name = isMe ? "You" : (split.profile as any)?.display_name ?? "?";
          return (
            <View key={split.user_id} style={styles.splitRow}>
              <Text style={styles.splitName}>{name}</Text>
              <Text style={[styles.splitAmt, split.settled && styles.settled]}>
                {split.settled ? "✓ Settled" : `owes ${item.currency} ${Number(split.amount_owed).toFixed(2)}`}
              </Text>
              {!split.settled && iPaid && split.user_id !== userId && (
                <TouchableOpacity
                  style={styles.settleBtn}
                  onPress={() => markSettled(item.id, split.user_id)}
                >
                  <Text style={styles.settleBtnText}>Mark settled</Text>
                </TouchableOpacity>
              )}
              {!split.settled && isMe && !iPaid && (
                <TouchableOpacity
                  style={styles.settleBtn}
                  onPress={() => markSettled(item.id, userId!)}
                >
                  <Text style={styles.settleBtnText}>I paid</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Split</Text>
        <TouchableOpacity onPress={() => router.push(`/(main)/circles/${circleId}/expense/create` as any)}>
          <Ionicons name="add" size={26} color={Colors.purple} />
        </TouchableOpacity>
      </View>

      {/* Balance banner */}
      <View style={[styles.balanceBanner, { backgroundColor: myBalance >= 0 ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)" }]}>
        <Text style={styles.balanceLabel}>Your net balance</Text>
        <Text style={[styles.balanceAmount, { color: myBalance >= 0 ? Colors.green : "#EF4444" }]}>
          {myBalance >= 0 ? `+$${myBalance.toFixed(2)}` : `-$${Math.abs(myBalance).toFixed(2)}`}
        </Text>
        <Text style={styles.balanceSub}>{myBalance >= 0 ? "You are owed" : "You owe"}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.purple} style={{ flex: 1 }} />
      ) : expenses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💸</Text>
          <Text style={styles.emptyText}>No expenses yet.{"\n"}Tap + to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={e => e.id}
          renderItem={renderExpense}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchExpenses(); }} tintColor={Colors.purple} />}
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
  balanceBanner: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, padding: 16, alignItems: "center",
  },
  balanceLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: "800" },
  balanceSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.bgCardBorder,
  },
  cardHeader: { flexDirection: "row", gap: 10, marginBottom: 12, alignItems: "flex-start" },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  splitRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.bgCardBorder,
  },
  splitName: { flex: 1, fontSize: 14, color: Colors.text },
  splitAmt: { fontSize: 13, color: Colors.textMuted, marginRight: 8 },
  settled: { color: Colors.green },
  settleBtn: {
    backgroundColor: "rgba(124,58,237,0.15)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  settleBtnText: { fontSize: 12, color: Colors.purple, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: Colors.textMuted, fontSize: 16, textAlign: "center", lineHeight: 24 },
});
