import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useCircles } from "@/hooks/useCircles";
import { CircleWithMembers } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { Ionicons } from "@expo/vector-icons";

// ─── Design tokens ──────────────────────────────────────────────
const BG        = "#09090F";
const CARD_BG   = "#111118";
const BORDER    = "rgba(255,255,255,0.07)";
const TEXT      = "#FFFFFF";
const MUTED     = "rgba(255,255,255,0.4)";
const FAINT     = "rgba(255,255,255,0.18)";
const GOLD      = "#C9A84C";
const GOLD_DIM  = "rgba(201,168,76,0.12)";
const SHEET_BG  = "#0D0D16";

// ─── Squad accent palette ────────────────────────────────────────
const PALETTE = [
  { id: "gold",    hex: "#C9A84C", dim: "rgba(201,168,76,0.18)"   },
  { id: "violet",  hex: "#8B5CF6", dim: "rgba(139,92,246,0.18)"   },
  { id: "teal",    hex: "#14B8A6", dim: "rgba(20,184,166,0.18)"   },
  { id: "rose",    hex: "#F43F5E", dim: "rgba(244,63,94,0.18)"    },
  { id: "blue",    hex: "#3B82F6", dim: "rgba(59,130,246,0.18)"   },
  { id: "emerald", hex: "#10B981", dim: "rgba(16,185,129,0.18)"   },
];

function getColor(colorId: string) {
  return PALETTE.find(p => p.id === colorId) ?? PALETTE[0];
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// icon field stores colorId (e.g. "gold"); legacy emoji falls back to gold
function isColorId(val: string | null) {
  return val ? PALETTE.some(p => p.id === val) : false;
}

// ─── Component ──────────────────────────────────────────────────
export default function CirclesHomeScreen() {
  const { circles, loading, createCircle } = useCircles();
  const [showCreate, setShowCreate]   = useState(false);
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [colorId, setColorId]         = useState("gold");
  const [creating, setCreating]       = useState(false);

  const resetForm = () => { setNewName(""); setNewDesc(""); setColorId("gold"); };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const circle = await createCircle(newName.trim(), colorId);
      setShowCreate(false);
      resetForm();
      if (circle) router.push(`/(main)/circles/${circle.id}`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const renderCircle = ({ item }: { item: CircleWithMembers }) => {
    const colorKey = isColorId(item.icon) ? item.icon! : "gold";
    const c = getColor(colorKey);
    const initials = getInitials(item.name);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(main)/circles/${item.id}`)}
        activeOpacity={0.65}
      >
        {/* Colored monogram */}
        <View style={[styles.monogram, { backgroundColor: c.dim, borderColor: c.hex + "33" }]}>
          <Text style={[styles.monogramText, { color: c.hex }]}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.member_count} {item.member_count === 1 ? "MEMBER" : "MEMBERS"}
          </Text>
        </View>

        {/* Avatars + arrow */}
        <View style={styles.cardRight}>
          <View style={styles.avatarStack}>
            {item.members.slice(0, 3).map((m, i) => (
              <View key={m.id} style={[styles.avatarWrap, { right: i * 14 }]}>
                <Avatar uri={m.avatar_url} name={m.display_name} size={24} />
              </View>
            ))}
          </View>
          <Ionicons name="chevron-forward" size={14} color={FAINT} style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Squads</Text>
          {!loading && (
            <Text style={styles.subLabel}>
              {circles.length === 0
                ? "No squads yet"
                : `${circles.length} ${circles.length === 1 ? "squad" : "squads"}`}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.glassBtn} onPress={() => router.push("/(main)/dms")}>
            <Ionicons name="chatbubble-ellipses-outline" size={19} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.glassBtn} onPress={() => router.push("/(main)/profile")}>
            <Ionicons name="person-outline" size={19} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.goldBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={20} color={BG} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: 80 }} />
      ) : circles.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyRing}>
            <Ionicons name="people-outline" size={34} color={GOLD} />
          </View>
          <Text style={styles.emptyTitle}>No squads yet</Text>
          <Text style={styles.emptyBody}>Create your first squad and bring your people together.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.emptyBtnText}>Create a Squad</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(item) => item.id}
          renderItem={renderCircle}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Create Sheet ── */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => { setShowCreate(false); resetForm(); }} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>New Squad</Text>
            <Text style={styles.sheetSub}>Give your squad a name and pick a color.</Text>

            {/* Color palette */}
            <Text style={styles.fieldLabel}>COLOR</Text>
            <View style={styles.palette}>
              {PALETTE.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setColorId(p.id)}
                  style={[
                    styles.swatch,
                    { backgroundColor: p.hex },
                    colorId === p.id && styles.swatchActive,
                  ]}
                >
                  {colorId === p.id && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            {newName.length > 0 && (
              <View style={styles.preview}>
                <View style={[styles.previewMonogram, { backgroundColor: getColor(colorId).dim, borderColor: getColor(colorId).hex + "44" }]}>
                  <Text style={[styles.previewInitials, { color: getColor(colorId).hex }]}>
                    {getInitials(newName)}
                  </Text>
                </View>
                <Text style={styles.previewName}>{newName}</Text>
              </View>
            )}

            {/* Name */}
            <Text style={styles.fieldLabel}>SQUAD NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fam, College Crew, Work Gang"
              placeholderTextColor={FAINT}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="next"
              maxLength={40}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>DESCRIPTION <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="What's this squad about?"
              placeholderTextColor={FAINT}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              numberOfLines={2}
              maxLength={100}
            />

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreate(false); resetForm(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: getColor(colorId).hex }, (!newName.trim() || creating) && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating
                  ? <ActivityIndicator color={BG} size="small" />
                  : <Text style={styles.createText}>Create Squad</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 68,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 36,
    fontWeight: "800",
    color: TEXT,
    letterSpacing: -0.5,
  },
  subLabel: {
    fontSize: 11,
    color: FAINT,
    marginTop: 5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  glassBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  goldBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: GOLD,
    alignItems: "center", justifyContent: "center",
  },

  // List
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  monogram: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, marginRight: 14,
  },
  monogramText: { fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", color: TEXT, letterSpacing: -0.1 },
  cardMeta: { fontSize: 11, color: MUTED, marginTop: 3, letterSpacing: 0.8 },
  cardRight: { flexDirection: "row", alignItems: "center" },
  avatarStack: { flexDirection: "row-reverse", width: 52, height: 24, position: "relative" },
  avatarWrap: { position: "absolute" },

  // Empty
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 48 },
  emptyRing: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: GOLD_DIM,
    borderWidth: 1, borderColor: "rgba(201,168,76,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 28,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: TEXT, marginBottom: 10, letterSpacing: -0.2 },
  emptyBody: { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    marginTop: 32, backgroundColor: GOLD,
    paddingHorizontal: 40, paddingVertical: 15, borderRadius: 40,
  },
  emptyBtnText: { color: BG, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },

  // Sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 52, paddingTop: 16,
    borderTopWidth: 1, borderColor: BORDER,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center", marginBottom: 28,
  },
  sheetTitle: { fontSize: 24, fontWeight: "800", color: TEXT, letterSpacing: -0.3, marginBottom: 6 },
  sheetSub: { fontSize: 13, color: MUTED, marginBottom: 28 },

  // Form
  fieldLabel: { fontSize: 10, fontWeight: "700", color: FAINT, letterSpacing: 1.4, marginBottom: 12 },
  optional: { fontWeight: "400", color: FAINT },

  palette: { flexDirection: "row", gap: 12, marginBottom: 24 },
  swatch: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  swatchActive: {
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  preview: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14, padding: 12,
    marginBottom: 24, borderWidth: 1, borderColor: BORDER,
  },
  previewMonogram: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  previewInitials: { fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  previewName: { fontSize: 15, fontWeight: "700", color: TEXT },

  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: TEXT,
    borderWidth: 1, borderColor: BORDER,
    marginBottom: 20,
  },
  inputMulti: { height: 76, textAlignVertical: "top", paddingTop: 14 },

  actions: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 40,
    borderWidth: 1, borderColor: BORDER, alignItems: "center",
  },
  cancelText: { color: MUTED, fontSize: 15 },
  createBtn: {
    flex: 2, paddingVertical: 15, borderRadius: 40, alignItems: "center",
  },
  createText: { color: "#000", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
});
