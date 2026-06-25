import { useState, useEffect } from "react";
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
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCircles } from "@/hooks/useCircles";
import { CircleWithMembers } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { Ionicons } from "@expo/vector-icons";
import { LogoMark } from "@/components/ui/LogoMark";
import { supabase } from "@/lib/supabase";

// ─── Design tokens ──────────────────────────────────────────────
const BG        = "#0C0D0B";
const CARD_BG   = "#13150F";
const BORDER    = "rgba(255,255,255,0.08)";
const TEXT      = "#F4F5F0";
const MUTED     = "rgba(244,245,240,0.45)";
const FAINT     = "rgba(244,245,240,0.18)";
const SAGE      = "#8FA876";
const SAGE_DIM  = "rgba(143,168,118,0.12)";
const SHEET_BG  = "#0E100D";

// ─── Fallback palette (used only when no cover photo) ────────────
const PALETTE = [
  { id: "sage",   hex: "#8FA876", dim: "rgba(143,168,118,0.18)" },
  { id: "violet", hex: "#8B5CF6", dim: "rgba(139,92,246,0.18)"  },
  { id: "teal",   hex: "#14B8A6", dim: "rgba(20,184,166,0.18)"  },
  { id: "rose",   hex: "#F43F5E", dim: "rgba(244,63,94,0.18)"   },
  { id: "blue",   hex: "#3B82F6", dim: "rgba(59,130,246,0.18)"  },
  { id: "gold",   hex: "#C9A84C", dim: "rgba(201,168,76,0.18)"  },
];
function getColor(colorId: string) {
  return PALETTE.find(p => p.id === colorId) ?? PALETTE[0];
}
function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
// Detect if icon field is a photo URL vs a colorId
function isCoverUrl(val: string | null): val is string {
  return !!val && val.startsWith("http");
}

// ─── Upload helper ───────────────────────────────────────────────
async function uploadCoverPhoto(localUri: string, circleId: string): Promise<string> {
  const ext   = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime  = ext === "png" ? "image/png" : "image/jpeg";
  const path  = `${circleId}/cover.${ext}`;

  const response = await fetch(localUri);
  const blob     = await response.blob();

  const { error } = await supabase.storage
    .from("circle-covers")
    .upload(path, blob, { contentType: mime, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("circle-covers").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Component ──────────────────────────────────────────────────
export default function SpotsHomeScreen() {
  const { circles, loading, createCircle } = useCircles();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [coverUri, setCoverUri]     = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const [showHint, setShowHint]     = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("spots_hint_dismissed").then(val => {
      if (val) setShowHint(false);
    });
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    AsyncStorage.setItem("spots_hint_dismissed", "1");
  };

  const resetForm = () => { setNewName(""); setNewDesc(""); setCoverUri(null); };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to add a cover photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      // Create circle first (icon defaults to "sage" colorId as placeholder)
      const circle = await createCircle(newName.trim(), "sage");
      if (!circle) throw new Error("Failed to create spot");

      // If user picked a cover photo, upload it and update the icon field
      if (coverUri) {
        const url = await uploadCoverPhoto(coverUri, circle.id);
        await supabase
          .from("circles")
          .update({ icon: url })
          .eq("id", circle.id);
      }

      setShowCreate(false);
      resetForm();
      router.push(`/(main)/circles/${circle.id}`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setCreating(false);
    }
  };

  const renderCircle = ({ item }: { item: CircleWithMembers }) => {
    const hasPhoto = isCoverUrl(item.icon);
    const c        = getColor(hasPhoto ? "sage" : (item.icon ?? "sage"));
    const initials = getInitials(item.name);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(main)/circles/${item.id}`)}
        activeOpacity={0.6}
      >
        {/* Cover photo or colored monogram */}
        {hasPhoto ? (
          <Image source={{ uri: item.icon! }} style={styles.coverThumb} />
        ) : (
          <View style={[styles.monogram, { backgroundColor: c.dim, borderColor: c.hex + "40" }]}>
            <Text style={[styles.monogramText, { color: c.hex }]}>{initials}</Text>
          </View>
        )}

        {/* Color accent stripe */}
        <View style={[styles.accentStripe, { backgroundColor: c.hex + "80" }]} />

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
              <View key={m.id} style={[styles.avatarWrap, { right: i * 16 }]}>
                <Avatar uri={m.avatar_url} name={m.display_name} size={26} />
              </View>
            ))}
          </View>
          <Ionicons name="chevron-forward" size={14} color={FAINT} style={{ marginLeft: 10 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <View style={styles.wordmark}>
            <LogoMark size={22} />
            <Text style={styles.heading}>Friendspot</Text>
          </View>
          {!loading && (
            <Text style={styles.subLabel}>
              {circles.length === 0
                ? "No spots yet"
                : `${circles.length} ${circles.length === 1 ? "spot" : "spots"}`}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.glassBtn} onPress={() => router.push("/(main)/dms" as any)}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="rgba(244,245,240,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.glassBtn} onPress={() => router.push("/(main)/profile" as any)}>
            <Ionicons name="person-circle-outline" size={20} color="rgba(244,245,240,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sageBtn} onPress={() => setShowCreate(true)}>
            <LinearGradient colors={["#9FBD84", "#7A9B63"]} style={styles.sageBtnGradient}>
              <Ionicons name="add" size={20} color={BG} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── "What's a Spot?" hint banner ── */}
      {showHint && (
        <TouchableOpacity style={styles.hintBanner} onPress={dismissHint} activeOpacity={0.8}>
          <Ionicons name="information-circle-outline" size={18} color={SAGE} />
          <Text style={styles.hintText}>
            A Friendspot is your private group — for your friends, family, or crew.
          </Text>
          <Text style={styles.hintClose}>✕</Text>
        </TouchableOpacity>
      )}

      {/* ── Content ── */}
      {loading ? (
        <ActivityIndicator color={SAGE} style={{ marginTop: 80 }} />
      ) : circles.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.emptyTitle}>Your groups live here</Text>
          <Text style={styles.emptyBody}>
            Create a Friendspot for any group — friends, family, a trip, or your crew.
          </Text>

          {/* Demo preview */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>PREVIEW</Text>

            {/* Demo card 1 */}
            <View style={[styles.card, styles.demoCard]}>
              <View style={[styles.monogram, { backgroundColor: "rgba(143,168,118,0.15)", borderColor: "rgba(143,168,118,0.2)" }]}>
                <Text style={[styles.monogramText, { color: SAGE }]}>FM</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={[styles.demoLine, { width: "50%", height: 14, marginBottom: 6 }]} />
                <View style={[styles.demoLine, { width: "30%", height: 10 }]} />
              </View>
              <View style={styles.cardRight}>
                <View style={styles.avatarStack}>
                  {[0,1,2].map(i => (
                    <View key={i} style={[styles.avatarWrap, { right: i * 14 }]}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" }} />
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Demo card 2 */}
            <View style={[styles.card, styles.demoCard]}>
              <View style={[styles.monogram, { backgroundColor: "rgba(139,92,246,0.12)", borderColor: "rgba(139,92,246,0.2)" }]}>
                <Text style={[styles.monogramText, { color: "#8B5CF6" }]}>CC</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={[styles.demoLine, { width: "60%", height: 14, marginBottom: 6 }]} />
                <View style={[styles.demoLine, { width: "25%", height: 10 }]} />
              </View>
              <View style={styles.cardRight}>
                <View style={styles.avatarStack}>
                  {[0,1].map(i => (
                    <View key={i} style={[styles.avatarWrap, { right: i * 14 }]}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" }} />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <LinearGradient colors={["#9FBD84", "#7A9B63"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.emptyBtnGradient}>
              <Ionicons name="add" size={18} color={BG} style={{ marginRight: 6 }} />
              <Text style={styles.emptyBtnText}>Create your first Friendspot</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.overlay}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setShowCreate(false); resetForm(); }} activeOpacity={1} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.sheetLogoRow}>
                  <LogoMark size={32} />
                  <Text style={styles.sheetTitle}>New Group</Text>
                </View>
                <Text style={styles.sheetSub}>Name your friend group and add a photo so everyone recognizes it.</Text>

                {/* Name */}
                <Text style={styles.fieldLabel}>GROUP NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Fam, College Crew, Work Gang, Road Trip"
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
                  placeholder="What's this spot about?"
                  placeholderTextColor={FAINT}
                  value={newDesc}
                  onChangeText={setNewDesc}
                  multiline
                  numberOfLines={2}
                  maxLength={100}
                />

                {/* ── Cover photo picker (moved to bottom) ── */}
                <Text style={styles.fieldLabel}>GROUP PHOTO <Text style={styles.optional}>(optional)</Text></Text>
                <TouchableOpacity style={styles.photoPickerArea} onPress={() => { Keyboard.dismiss(); pickPhoto(); }} activeOpacity={0.75}>
                  {coverUri ? (
                    <>
                      <Image source={{ uri: coverUri }} style={styles.photoPreview} />
                      <View style={styles.photoEditBadge}>
                        <Ionicons name="pencil" size={12} color="#fff" />
                      </View>
                    </>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="camera-outline" size={28} color={MUTED} />
                      <Text style={styles.photoPlaceholderText}>Upload a photo of you and your friends</Text>
                      <Text style={styles.photoPlaceholderHint}>Tap to choose from library</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { Keyboard.dismiss(); setShowCreate(false); resetForm(); }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createBtn, (!newName.trim() || creating) && { opacity: 0.5 }]}
                    onPress={handleCreate}
                    disabled={!newName.trim() || creating}
                  >
                    {creating
                      ? <ActivityIndicator color={BG} size="small" />
                      : <Text style={styles.createText}>Create Friendspot</Text>
                    }
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingTop: 72,
    paddingBottom: 20,
  },
  wordmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { fontSize: 28, fontWeight: "800", color: TEXT, letterSpacing: -0.6 },
  subLabel: {
    fontSize: 11, color: FAINT,
    marginTop: 5, letterSpacing: 1.2, textTransform: "uppercase",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  glassBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  sageBtn: {
    width: 40, height: 40, borderRadius: 20,
    overflow: "hidden",
  },
  sageBtnGradient: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },

  // Hint banner — standardized across all tabs
  hintBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "rgba(143,168,118,0.1)",
    borderWidth: 1,
    borderColor: "rgba(143,168,118,0.25)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 64,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: MUTED,
    lineHeight: 19,
  },
  hintClose: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 18,
    lineHeight: 18,
  },

  // List
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  accentStripe: {
    width: 3, height: 28, borderRadius: 2,
    marginRight: 12,
  },
  coverThumb: {
    width: 56, height: 56, borderRadius: 16,
    marginRight: 16,
  },
  monogram: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, marginRight: 16,
  },
  monogramText: { fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 17, fontWeight: "700", color: TEXT, letterSpacing: -0.2 },
  cardMeta: { fontSize: 12, color: MUTED, marginTop: 4, letterSpacing: 0.7 },
  cardRight: { flexDirection: "row", alignItems: "center" },
  avatarStack: { flexDirection: "row-reverse", width: 62, height: 26, position: "relative" },
  avatarWrap: { position: "absolute" },

  // Empty state
  emptyScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120, alignItems: "center" },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: TEXT, marginBottom: 10, letterSpacing: -0.2, textAlign: "center" },
  emptyBody: { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 22, marginBottom: 28 },

  // Demo cards
  demoSection: { width: "100%", marginBottom: 28 },
  demoLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.2)", letterSpacing: 1.4, marginBottom: 12 },
  demoCard: { opacity: 0.55 },
  demoLine: { borderRadius: 7, backgroundColor: "rgba(255,255,255,0.15)" },

  emptyBtn: {
    borderRadius: 40,
    overflow: "hidden",
  },
  emptyBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32, paddingVertical: 16, borderRadius: 40,
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
  sheetLogoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  sheetTitle: { fontSize: 24, fontWeight: "800", color: TEXT, letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, color: MUTED, marginBottom: 28 },

  // Form
  fieldLabel: { fontSize: 10, fontWeight: "700", color: FAINT, letterSpacing: 1.4, marginBottom: 12 },
  optional: { fontWeight: "400", color: FAINT },

  // Photo picker
  photoPickerArea: {
    width: "100%",
    height: 140,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "dashed",
    marginBottom: 24,
    overflow: "hidden",
    position: "relative",
  },
  photoPreview: { width: "100%", height: "100%" },
  photoEditBadge: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center", justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
  },
  photoPlaceholderText: {
    fontSize: 13, color: MUTED, textAlign: "center", lineHeight: 18,
  },
  photoPlaceholderHint: {
    fontSize: 11, color: FAINT, textAlign: "center",
  },

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
    flex: 2, paddingVertical: 15, borderRadius: 40,
    alignItems: "center", backgroundColor: SAGE,
  },
  createText: { color: "#000", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
});
