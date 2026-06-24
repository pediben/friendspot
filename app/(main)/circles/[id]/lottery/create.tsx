import { useState } from "react";
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

export default function CreateRoundScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();

  const [title, setTitle] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const amt = parseFloat(entryAmount);
    if (!title.trim() || isNaN(amt) || amt <= 0 || !drawDate.trim()) {
      Alert.alert("Check details", "Fill in all fields with valid values.");
      return;
    }
    const drawDateObj = new Date(drawDate);
    if (isNaN(drawDateObj.getTime()) || drawDateObj <= new Date()) {
      Alert.alert("Invalid date", "Draw date must be in the future (use YYYY-MM-DD).");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("circle_lotteries").insert({
      circle_id: circleId,
      created_by: session!.user.id,
      title: title.trim(),
      entry_amount: amt,
      currency: "USD",
      draw_date: drawDateObj.toISOString(),
    });
    setLoading(false);
    if (error) Alert.alert("Error", error.message);
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
        <Text style={styles.title}>New round</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          🔄 Everyone contributes each round. On payout day, one member receives the full pot. Take turns until everyone has had their round.
        </Text>

        <Text style={styles.label}>Round name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Summer Rounds, Monthly Boost"
          placeholderTextColor={Colors.textFaint}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <Text style={styles.label}>Contribution amount (USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="20.00"
          placeholderTextColor={Colors.textFaint}
          keyboardType="decimal-pad"
          value={entryAmount}
          onChangeText={setEntryAmount}
        />

        <Text style={styles.label}>Payout date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-07-01"
          placeholderTextColor={Colors.textFaint}
          value={drawDate}
          onChangeText={setDrawDate}
          keyboardType="numbers-and-punctuation"
        />

        {entryAmount ? (
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              With 5 players: pot = ${(parseFloat(entryAmount || "0") * 5).toFixed(2)}
            </Text>
            <Text style={styles.previewText}>
              With 10 players: pot = ${(parseFloat(entryAmount || "0") * 10).toFixed(2)}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.createBtn, loading && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Start round</Text>}
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
  hint: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 14, padding: 16,
    fontSize: 14, color: Colors.textMuted, lineHeight: 21,
  },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textMuted, marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: Colors.bgCard, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.text,
    borderWidth: 1, borderColor: Colors.bgCardBorder,
  },
  preview: {
    marginTop: 20, backgroundColor: Colors.bgCard,
    borderRadius: 12, padding: 14, gap: 6,
    borderWidth: 1, borderColor: Colors.bgCardBorder,
  },
  previewText: { fontSize: 13, color: Colors.textMuted },
  createBtn: {
    marginTop: 32, backgroundColor: Colors.purple,
    borderRadius: 30, paddingVertical: 16, alignItems: "center",
  },
  createBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
