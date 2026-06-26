/**
 * Planning screen — shared checklist inside a Spot.
 * Great for camping trips, birthday parties, group dinners:
 * "who buys what", packing lists, task boards.
 */
import { useState, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Pressable, Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { usePlanItems, PlanItem } from "@/hooks/usePlanItems";
import { useAuthStore } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";

// ── Tokens ──────────────────────────────────────────────────────
const BG      = Colors.bg;
const CARD    = "rgba(255,255,255,0.04)";
const BORDER  = "rgba(255,255,255,0.08)";
const TEXT    = Colors.text;
const MUTED   = Colors.textMuted;
const FAINT   = Colors.textFaint;
const SAGE    = Colors.sage;
const GREEN   = Colors.green;
const RED     = Colors.red;

const CATEGORIES = ["🛒 Food", "🏕 Gear", "🚗 Transport", "🎉 Fun", "📋 Other"];

export default function PlanningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const insets = useSafeAreaInsets();
  const me = session?.user.id;

  const { items, loading, addItem, toggleDone, deleteItem, pendingCount, doneCount } = usePlanItems(id);

  const [draft, setDraft]         = useState("");
  const [category, setCategory]   = useState<string | null>(null);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [adding, setAdding]       = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    setAdding(true);
    try {
      await addItem(text, category ?? undefined);
      setDraft("");
    } catch (e: any) {
      Alert.alert("Couldn't add item", e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (item: PlanItem) => {
    if (item.created_by !== me) return;
    Alert.alert("Remove item", `Remove "${item.text}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteItem(item.id) },
    ]);
  };

  const renderItem = ({ item }: { item: PlanItem }) => (
    <TouchableOpacity
      style={[styles.row, item.is_done && styles.rowDone]}
      onPress={() => toggleDone(item.id, item.is_done)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      {/* Checkbox */}
      <View style={[styles.check, item.is_done && styles.checkDone]}>
        {item.is_done && <Ionicons name="checkmark" size={14} color="#000" />}
      </View>

      {/* Content */}
      <View style={styles.rowBody}>
        {item.category && (
          <Text style={styles.catTag}>{item.category}</Text>
        )}
        <Text style={[styles.rowText, item.is_done && styles.rowTextDone]} numberOfLines={2}>
          {item.text}
        </Text>
        {item.assignee && (
          <View style={styles.assigneeRow}>
            <Avatar uri={item.assignee.avatar_url} name={item.assignee.display_name} size={16} />
            <Text style={styles.assigneeName}>{item.assignee.display_name}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const pending = items.filter(i => !i.is_done);
  const done    = items.filter(i => i.is_done);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={MUTED} />
        </TouchableOpacity>
        <Text style={styles.heading}>Planning</Text>
        <View style={styles.statsChip}>
          <Text style={styles.statsText}>
            {pendingCount} left · {doneCount} done
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={SAGE} style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={[...pending, ...done]}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            items.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="list-outline" size={32} color={SAGE} />
                </View>
                <Text style={styles.emptyTitle}>No items yet</Text>
                <Text style={styles.emptyBody}>
                  Add things to buy, pack, or do — assign them to group members so everyone knows their part.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            done.length > 0 && pending.length > 0 ? (
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>Done</Text>
                <View style={styles.dividerLine} />
              </View>
            ) : null
          }
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        {/* Category chip */}
        <TouchableOpacity
          style={styles.catBtn}
          onPress={() => setShowCatPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.catBtnText}>{category ?? "📋"}</Text>
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Add an item…"
          placeholderTextColor={FAINT}
          value={draft}
          onChangeText={setDraft}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          maxLength={200}
        />

        <TouchableOpacity
          style={[styles.addBtn, (!draft.trim() || adding) && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!draft.trim() || adding}
          activeOpacity={0.8}
        >
          {adding
            ? <ActivityIndicator color="#000" size="small" />
            : <Ionicons name="add" size={20} color="#000" />
          }
        </TouchableOpacity>
      </View>

      {/* Category picker modal */}
      <Modal visible={showCatPicker} transparent animationType="fade" onRequestClose={() => setShowCatPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCatPicker(false)}>
          <View style={styles.catSheet}>
            <Text style={styles.catSheetTitle}>Category</Text>
            <TouchableOpacity
              style={[styles.catOption, !category && styles.catOptionActive]}
              onPress={() => { setCategory(null); setShowCatPicker(false); }}
            >
              <Text style={styles.catOptionText}>📋 None</Text>
            </TouchableOpacity>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.catOption, category === c && styles.catOptionActive]}
                onPress={() => { setCategory(c); setShowCatPicker(false); }}
              >
                <Text style={styles.catOptionText}>{c}</Text>
                {category === c && <Ionicons name="checkmark" size={16} color={SAGE} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  heading: { flex: 1, fontSize: 20, fontWeight: "800", color: TEXT, letterSpacing: -0.3 },
  statsChip: {
    backgroundColor: "rgba(143,168,118,0.1)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.25)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  statsText: { fontSize: 12, color: SAGE, fontWeight: "600" },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowDone: { opacity: 0.45 },

  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  checkDone: { backgroundColor: GREEN, borderColor: GREEN },

  rowBody: { flex: 1 },
  catTag: {
    fontSize: 11, color: SAGE, fontWeight: "600",
    marginBottom: 3, letterSpacing: 0.2,
  },
  rowText: { fontSize: 16, color: TEXT, lineHeight: 22 },
  rowTextDone: { textDecorationLine: "line-through", color: MUTED },

  assigneeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  assigneeName: { fontSize: 12, color: MUTED },

  divider: {
    flexDirection: "row", alignItems: "center",
    gap: 10, marginVertical: 16, opacity: 0.4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerLabel: { fontSize: 11, color: FAINT, fontWeight: "600", letterSpacing: 0.8 },

  empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32, paddingBottom: 24 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(143,168,118,0.08)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: TEXT, marginBottom: 10 },
  emptyBody:  { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 21 },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  catBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  catBtnText: { fontSize: 18 },
  input: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 11,
    fontSize: 15, color: TEXT,
    borderWidth: 1, borderColor: BORDER,
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: SAGE,
    alignItems: "center", justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.35 },

  // Category modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  catSheet: {
    backgroundColor: "#141613",
    borderRadius: 20, paddingVertical: 8,
    width: "100%",
    borderWidth: 1, borderColor: BORDER,
  },
  catSheetTitle: {
    fontSize: 13, fontWeight: "700", color: FAINT,
    letterSpacing: 0.8, textAlign: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  catOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  catOptionActive: { backgroundColor: "rgba(143,168,118,0.08)" },
  catOptionText: { fontSize: 16, color: TEXT },
});
