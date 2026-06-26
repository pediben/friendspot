/**
 * SpotSettingsScreen
 * Rename, recolor, view members, leave or delete the spot.
 */
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { StoryRing } from "@/components/ui/StoryRing";
import { useStoriesStatus } from "@/hooks/useStoriesStatus";

// ─── Design tokens (match Spots home) ──────────────────────────
const BG       = "#09090F";
const CARD_BG  = "#111118";
const BORDER   = "rgba(255,255,255,0.07)";
const TEXT     = "#FFFFFF";
const MUTED    = "rgba(255,255,255,0.4)";
const FAINT    = "rgba(255,255,255,0.18)";
const DANGER   = "#EF4444";

const PALETTE = [
  { id: "gold",    hex: "#C9A84C", dim: "rgba(201,168,76,0.18)"  },
  { id: "violet",  hex: "#8B5CF6", dim: "rgba(139,92,246,0.18)"  },
  { id: "teal",    hex: "#14B8A6", dim: "rgba(20,184,166,0.18)"  },
  { id: "rose",    hex: "#F43F5E", dim: "rgba(244,63,94,0.18)"   },
  { id: "blue",    hex: "#3B82F6", dim: "rgba(59,130,246,0.18)"  },
  { id: "emerald", hex: "#10B981", dim: "rgba(16,185,129,0.18)"  },
];

function getColor(colorId: string) {
  return PALETTE.find(p => p.id === colorId) ?? PALETTE[0];
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Types ──────────────────────────────────────────────────────
interface Member {
  user_id: string;
  role: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// ─── Screen ─────────────────────────────────────────────────────
export default function SpotSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [name, setName]         = useState("");
  const [colorId, setColorId]   = useState("gold");
  const [members, setMembers]   = useState<Member[]>([]);
  const [myRole, setMyRole]     = useState<string>("member");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const isAdmin = myRole === "admin" || myRole === "owner";
  const memberIds = members.map(m => m.user_id);
  const storyStatus = useStoriesStatus(memberIds);

  // ── Load spot data ──────────────────────────────────────────
  const load = useCallback(async () => {
    if (!id || !userId) return;
    setLoading(true);

    const [spotRes, membersRes] = await Promise.all([
      supabase.from("circles").select("name, icon").eq("id", id).single(),
      supabase
        .from("circle_members")
        .select("user_id, role, profiles(id, display_name, avatar_url)")
        .eq("circle_id", id),
    ]);

    if (spotRes.data) {
      setName(spotRes.data.name);
      setColorId(spotRes.data.icon && PALETTE.some(p => p.id === spotRes.data!.icon) ? spotRes.data.icon! : "gold");
    }

    if (membersRes.data) {
      setMembers(membersRes.data as unknown as Member[]);
      const me = (membersRes.data as any[]).find(m => m.user_id === userId);
      if (me) setMyRole(me.role);
    }

    setLoading(false);
  }, [id, userId]);

  useEffect(() => { load(); }, [load]);

  // ── Save name / color ───────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("circles")
      .update({ name: name.trim(), icon: colorId })
      .eq("id", id);
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Saved", "Spot updated.");
    }
  };

  // ── Remove member (admin only) ───────────────────────────────
  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (memberId === userId) return; // can't remove yourself this way
    Alert.alert(
      "Remove Member",
      `Remove ${memberName} from this Spot?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("circle_members")
              .delete()
              .eq("circle_id", id)
              .eq("user_id", memberId);
            if (error) Alert.alert("Error", error.message);
            else load();
          },
        },
      ]
    );
  };

  // ── Leave spot ───────────────────────────────────────────────
  const handleLeave = () => {
    Alert.alert(
      "Leave Spot",
      "You'll no longer be part of this Spot. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("circle_members")
              .delete()
              .eq("circle_id", id)
              .eq("user_id", userId!);
            if (error) { Alert.alert("Error", error.message); return; }
            router.replace("/(main)/circles");
          },
        },
      ]
    );
  };

  // ── Delete spot (admin only) ─────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      "Delete Spot",
      "This will permanently delete the Spot and all its content. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("circles")
              .delete()
              .eq("id", id);
            if (error) { Alert.alert("Error", error.message); return; }
            router.replace("/(main)/circles");
          },
        },
      ]
    );
  };

  // ─── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={getColor(colorId).hex} />
      </View>
    );
  }

  const accent = getColor(colorId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spot Settings</Text>
        {isAdmin ? (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !name.trim()}
            style={[styles.saveBtn, { backgroundColor: accent.hex }, (!name.trim() || saving) && { opacity: 0.4 }]}
          >
            {saving
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Preview */}
        <View style={styles.previewWrap}>
          <View style={[styles.previewMonogram, { backgroundColor: accent.dim, borderColor: accent.hex + "44" }]}>
            <Text style={[styles.previewInitials, { color: accent.hex }]}>
              {name ? getInitials(name) : "?"}
            </Text>
          </View>
        </View>

        {/* Name */}
        {isAdmin && (
          <>
            <Text style={styles.label}>SPOT NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor={FAINT}
              placeholder="Spot name"
              maxLength={40}
            />

            {/* Color */}
            <Text style={styles.label}>COLOR</Text>
            <View style={styles.palette}>
              {PALETTE.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setColorId(p.id)}
                  style={[styles.swatch, { backgroundColor: p.hex }, colorId === p.id && styles.swatchActive]}
                >
                  {colorId === p.id && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Members */}
        <Text style={styles.label}>MEMBERS · {members.length}</Text>
        <View style={styles.memberList}>
          {members.map((m) => {
            const profile = m.profiles;
            const isMe = m.user_id === userId;
            const st = storyStatus[m.user_id] ?? { hasStory: false, hasUnseenStory: false };
            return (
              <View key={m.user_id} style={styles.memberRow}>
                <StoryRing
                  userId={m.user_id}
                  uri={profile?.avatar_url ?? null}
                  name={profile?.display_name ?? "?"}
                  size={38}
                  hasStory={st.hasStory}
                  hasUnseenStory={st.hasUnseenStory}
                />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {profile?.display_name ?? "Unknown"}
                    {isMe && <Text style={styles.youBadge}> · You</Text>}
                  </Text>
                  <Text style={styles.memberRole}>{m.role}</Text>
                </View>
                {isAdmin && !isMe && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(m.user_id, profile?.display_name ?? "Member")}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close" size={16} color={MUTED} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleLeave}>
            <Ionicons name="exit-outline" size={18} color={DANGER} />
            <Text style={styles.dangerText}>Leave Spot</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={[styles.dangerRow, { borderTopWidth: 1, borderTopColor: "rgba(239,68,68,0.15)" }]} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={DANGER} />
              <Text style={styles.dangerText}>Delete Spot</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: TEXT },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#000" },

  content: { paddingHorizontal: 20, paddingTop: 28 },

  previewWrap: { alignItems: "center", marginBottom: 32 },
  previewMonogram: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  previewInitials: { fontSize: 28, fontWeight: "800", letterSpacing: 0.5 },

  label: {
    fontSize: 10, fontWeight: "700", color: FAINT,
    letterSpacing: 1.4, marginBottom: 12,
  },

  input: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: TEXT,
    borderWidth: 1, borderColor: BORDER,
    marginBottom: 24,
  },

  palette: { flexDirection: "row", gap: 12, marginBottom: 28 },
  swatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  swatchActive: {
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  memberList: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 28,
    overflow: "hidden",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 15, fontWeight: "600", color: TEXT },
  memberRole: { fontSize: 12, color: MUTED, marginTop: 2, textTransform: "capitalize" },
  youBadge: { color: MUTED, fontWeight: "400" },
  removeBtn: {
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },

  dangerZone: {
    backgroundColor: "rgba(239,68,68,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
    overflow: "hidden",
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dangerText: { fontSize: 15, fontWeight: "600", color: DANGER },
});
