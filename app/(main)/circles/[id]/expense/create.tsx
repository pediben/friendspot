import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";

const CATEGORIES = [
  { key: "food", label: "🍕 Food" },
  { key: "transport", label: "🚗 Transport" },
  { key: "lodging", label: "🏠 Lodging" },
  { key: "activity", label: "🎉 Activity" },
  { key: "other", label: "💸 Other" },
];

export default function CreateExpenseScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [members, setMembers] = useState<{ user_id: string; display_name: string }[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load members on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("circle_members")
        .select("user_id, profile:profiles!user_id(display_name)")
        .eq("circle_id", circleId);
      const others = (data ?? [])
        .filter((m: any) => m.user_id !== session?.user.id)
        .map((m: any) => ({ user_id: m.user_id, display_name: m.profile?.display_name ?? "?" }));
      setMembers(others);
      setSplitWith(others.map(m => m.user_id));
      setMembersLoaded(true);
    })();
  }, [circleId, session?.user.id]);

  const toggleMember = (uid: string) => {
    setSplitWith(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    const amt = parseFloat(amount);
    if (!description.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert("Check details", "Enter a description and a valid amount.");
      return;
    }
    if (splitWith.length === 0) {
      Alert.alert("Split with someone", "Select at least one person to split with.");
      return;
    }
    setLoading(true);

    // Each person (including me) pays equal share
    const totalPeople = splitWith.length + 1;
    const perPersonCents = Math.round((amt / totalPeople) * 100);

    const { data: expense, error: expErr } = await supabase
      .from("expenses")
      .insert({
        circle_id: circleId,
        paid_by: session!.user.id,
        amount_cents: Math.round(amt * 100),
        currency: "USD",
        category,
        description: description.trim(),
      })
      .select("id")
      .single();

    if (expErr || !expense) {
      Alert.alert("Error", expErr?.message ?? "Failed to create expense");
      setLoading(false);
      return;
    }

    const splits = splitWith.map(uid => ({
      expense_id: expense.id,
      owed_by: uid,
      amount_cents: perPersonCents,
    }));

    const { error: splitErr } = await supabase.from("expense_splits").insert(splits);
    setLoading(false);
    if (splitErr) Alert.alert("Error", splitErr.message);
    else router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add expense</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dinner at Nobu"
          placeholderTextColor={Colors.textFaint}
          value={description}
          onChangeText={setDescription}
          autoFocus
        />

        <Text style={styles.label}>Amount (USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={Colors.textFaint}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, category === c.key && styles.chipActive]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Split with</Text>
        {!membersLoaded ? (
          <ActivityIndicator color={Colors.purple} />
        ) : members.length === 0 ? (
          <Text style={styles.noMembers}>No other members in this circle yet.</Text>
        ) : (
          members.map(m => (
            <TouchableOpacity
              key={m.user_id}
              style={styles.memberRow}
              onPress={() => toggleMember(m.user_id)}
            >
              <View style={[styles.checkbox, splitWith.includes(m.user_id) && styles.checkboxChecked]}>
                {splitWith.includes(m.user_id) && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.memberName}>{m.display_name}</Text>
            </TouchableOpacity>
          ))
        )}

        {amount && splitWith.length > 0 && (
          <View style={styles.splitPreview}>
            <Text style={styles.splitPreviewText}>
              Each person pays: ${(parseFloat(amount || "0") / (splitWith.length + 1)).toFixed(2)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createBtn, loading && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Add expense</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  form: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textMuted, marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: Colors.bgCard, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.bgCardBorder,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.bgCardBorder,
  },
  chipActive: { backgroundColor: Colors.purple, borderColor: Colors.purple },
  chipText: { fontSize: 13, color: Colors.textMuted },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.bgCardBorder,
    alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: Colors.purple, borderColor: Colors.purple },
  memberName: { fontSize: 15, color: Colors.text },
  noMembers: { color: Colors.textMuted, fontSize: 14 },
  splitPreview: {
    marginTop: 20, backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 12, padding: 12, alignItems: "center",
  },
  splitPreviewText: { color: Colors.purple, fontWeight: "600", fontSize: 14 },
  createBtn: {
    marginTop: 32, backgroundColor: Colors.purple,
    borderRadius: 30, paddingVertical: 16, alignItems: "center",
  },
  createBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
