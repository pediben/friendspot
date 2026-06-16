/**
 * Create Bet Screen
 *
 * Step 1: Choose bet type (binary / multi / pool)
 * Step 2: Fill in title, options (if multi), stake limit, optional close date
 * Step 3: Confirm → calls supabase insert → navigates to bet detail
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";

type BetType = "binary" | "multi" | "pool";

const TYPE_INFO: Record<BetType, { icon: string; label: string; desc: string }> = {
  binary: { icon: "git-branch-outline", label: "Binary",   desc: "Yes vs No — simple two-outcome bet" },
  multi:  { icon: "list-outline",       label: "Multi",    desc: "Pick your winner from multiple options" },
  pool:   { icon: "people-outline",     label: "Pool",     desc: "Everyone chips in, one person takes the pot" },
};

const DEFAULT_OPTIONS: Record<BetType, string[]> = {
  binary: ["Yes", "No"],
  multi:  ["Option 1", "Option 2", "Option 3"],
  pool:   [],  // pool doesn't use options[]
};

export default function CreateBetScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();

  const [betType, setBetType]     = useState<BetType>("binary");
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [options, setOptions]     = useState<string[]>(DEFAULT_OPTIONS.binary);
  const [maxStake, setMaxStake]   = useState("100");
  const [hasClosingDate, setHasClosingDate] = useState(false);
  const [closingDate, setClosingDate] = useState("");   // ISO string yyyy-mm-dd
  const [saving, setSaving]       = useState(false);

  const switchType = (t: BetType) => {
    setBetType(t);
    setOptions(DEFAULT_OPTIONS[t]);
  };

  const addOption = () => {
    if (options.length >= 8) return;
    setOptions([...options, `Option ${options.length + 1}`]);
  };
  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };
  const updateOption = (i: number, v: string) => {
    const next = [...options];
    next[i] = v;
    setOptions(next);
  };

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert("Add a title"); return; }
    if (betType !== "pool" && options.some((o) => !o.trim())) {
      Alert.alert("Fill in all options"); return;
    }
    const stake = parseInt(maxStake, 10);
    if (isNaN(stake) || stake < 1) { Alert.alert("Invalid stake amount"); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("bets")
        .insert({
          circle_id:   circleId,
          created_by:  session!.user.id,
          title:       title.trim(),
          description: description.trim() || null,
          bet_type:    betType,
          options:     betType === "pool" ? [] : options.map((o) => o.trim()),
          max_stake:   stake,
          closes_at:   hasClosingDate && closingDate ? new Date(closingDate).toISOString() : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      router.replace({
        pathname: "/(main)/circles/[id]/bet/[betId]" as any,
        params: { id: circleId, betId: data.id },
      });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.outer}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>New Bet</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Type selector */}
        <Text style={styles.label}>Bet type</Text>
        <View style={styles.typeRow}>
          {(Object.keys(TYPE_INFO) as BetType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeCard, betType === t && styles.typeCardActive]}
              onPress={() => switchType(t)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={TYPE_INFO[t].icon as any}
                size={22}
                color={betType === t ? Colors.purple : Colors.textMuted}
              />
              <Text style={[styles.typeLabel, betType === t && styles.typeLabelActive]}>
                {TYPE_INFO[t].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.typeDesc}>{TYPE_INFO[betType].desc}</Text>

        {/* Title */}
        <Text style={styles.label}>Question / Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Will the Lakers win the championship?"
          placeholderTextColor={Colors.textFaint}
          value={title}
          onChangeText={setTitle}
          maxLength={140}
          multiline
        />

        {/* Description */}
        <Text style={styles.label}>Details (optional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 70 }]}
          placeholder="Extra context, rules, or clarifications…"
          placeholderTextColor={Colors.textFaint}
          value={description}
          onChangeText={setDesc}
          multiline
        />

        {/* Options (binary/multi only) */}
        {betType !== "pool" && (
          <>
            <Text style={styles.label}>Options</Text>
            {options.map((opt, i) => (
              <View key={i} style={styles.optionRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={opt}
                  onChangeText={(v) => updateOption(i, v)}
                  maxLength={60}
                />
                {betType === "multi" && options.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(i)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={22} color={Colors.red} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {betType === "multi" && options.length < 8 && (
              <TouchableOpacity onPress={addOption} style={styles.addOptionBtn}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.purple} />
                <Text style={styles.addOptionText}>Add option</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Max stake */}
        <Text style={styles.label}>Max stake (coins)</Text>
        <TextInput
          style={styles.input}
          value={maxStake}
          onChangeText={setMaxStake}
          keyboardType="number-pad"
          maxLength={6}
        />

        {/* Closing date */}
        <View style={styles.switchRow}>
          <Text style={styles.label}>Set a closing date</Text>
          <Switch
            value={hasClosingDate}
            onValueChange={setHasClosingDate}
            trackColor={{ true: Colors.purple }}
            thumbColor={Colors.text}
          />
        </View>
        {hasClosingDate && (
          <TextInput
            style={styles.input}
            placeholder="yyyy-mm-dd  (e.g. 2026-07-01)"
            placeholderTextColor={Colors.textFaint}
            value={closingDate}
            onChangeText={setClosingDate}
            keyboardType="numbers-and-punctuation"
          />
        )}

        {/* Spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Confirm button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, saving && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={Colors.text} />
            : <Text style={styles.createBtnText}>Create bet 🎲</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingBottom: 20,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },

  label: { color: Colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 16 },

  typeRow: { flexDirection: "row", gap: 10 },
  typeCard: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.bgCardBorder,
    backgroundColor: Colors.bgCard,
  },
  typeCardActive: { borderColor: Colors.purple, backgroundColor: "rgba(124,58,237,0.08)" },
  typeLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  typeLabelActive: { color: Colors.purple },
  typeDesc: { color: Colors.textFaint, fontSize: 13, marginTop: 6, textAlign: "center" },

  input: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
  },

  optionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  removeBtn: { padding: 4 },

  addOptionBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  addOptionText: { color: Colors.purple, fontSize: 14, fontWeight: "600" },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.bgCardBorder,
  },
  createBtn: {
    backgroundColor: Colors.purple,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  createBtnText: { color: Colors.text, fontSize: 16, fontWeight: "700" },
});
