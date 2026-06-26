/**
 * CircleDetailScreen
 * Top: Premium feature cards (Room, Private Call, Bets, Rounds, Split)
 * Bottom: Voice thread (async voice notes feed + recorder)
 */
import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVoiceNotes } from "@/hooks/useVoiceNotes";
import { useAuthStore } from "@/hooks/useAuth";
import { shareSpotInvite, distributePendingKeys } from "@/lib/invites";
import { VoiceNotePlayer } from "@/components/voice/VoiceNotePlayer";
import { VoiceNoteRecorder } from "@/components/voice/VoiceNoteRecorder";
import { CircleMessageWithSender } from "@/types/database";
import { Colors } from "@/constants/Colors";

// ─── Design tokens ───────────────────────────────────────────────
const BG     = "#0C0D0B";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT   = "#F4F5F0";
const MUTED  = "rgba(244,245,240,0.5)";
const FAINT  = "rgba(244,245,240,0.22)";

export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { notes, loading, sendVoiceNote } = useVoiceNotes(id);
  const listRef = useRef<FlatList>(null);
  const [spotName, setSpotName] = useState("Spot");

  // Load spot name + distribute any pending E2EE keys for new members
  useEffect(() => {
    if (!id) return;
    const { supabase: sb } = require("@/lib/supabase");
    sb.from("circles").select("name").eq("id", id).single()
      .then(({ data }: any) => { if (data?.name) setSpotName(data.name); });
    // Fire-and-forget: wrap circle key for any pending new members
    distributePendingKeys(id).catch(() => {});
  }, [id]);

  const handleSend = async (uri: string, durationMs: number, waveform: number[]) => {
    try {
      await sendVoiceNote(uri, durationMs, waveform);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (e: any) {
      Alert.alert("Couldn't send", e.message);
    }
  };

  const renderNote = ({ item }: { item: CircleMessageWithSender }) => (
    <VoiceNotePlayer
      note={item}
      isMine={item.sender_id === session?.user.id}
    />
  );

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{spotName}</Text>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/(main)/circles/${id}/events` as any)}>
            <Ionicons name="calendar-outline" size={20} color={Colors.sage} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/(main)/circles/${id}/planning` as any)}>
            <Ionicons name="list-outline" size={20} color={Colors.sage} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => shareSpotInvite(id, spotName, session!.user.id)}>
            <Ionicons name="person-add-outline" size={20} color={Colors.purple} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/(main)/circles/${id}/settings` as any)}>
            <Ionicons name="ellipsis-horizontal" size={20} color={MUTED} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Feature grid ── */}
      <View style={styles.featuresContainer}>
        {/* Live Room — full width, hero card */}
        <TouchableOpacity
          style={styles.roomCard}
          onPress={() => router.push(`/(main)/circles/${id}/room`)}
          activeOpacity={0.75}
        >
          <LinearGradient
            colors={["rgba(74,222,128,0.18)", "rgba(74,222,128,0.06)"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.roomGradient}
          >
            <View style={styles.roomLeft}>
              <View style={styles.livePillWrap}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>LIVE</Text>
              </View>
              <Text style={styles.roomTitle}>Group Room</Text>
              <Text style={styles.roomSub}>Tap to join or start a call</Text>
            </View>
            <View style={styles.roomIconWrap}>
              <Ionicons name="radio-outline" size={36} color={Colors.green} style={{ opacity: 0.8 }} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Second row: Private Call + Bets */}
        <View style={styles.featureRow}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push(`/(main)/circles/${id}/private-rooms` as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIconRing, { backgroundColor: "rgba(139,92,246,0.14)", borderColor: "rgba(139,92,246,0.25)" }]}>
              <Ionicons name="lock-closed" size={22} color="#A78BFA" />
            </View>
            <View style={styles.featureTextGroup}>
              <Text style={styles.featureTitle}>Private Call</Text>
              <Text style={styles.featureSub}>Invite-only, passcode protected</Text>
            </View>
            <Ionicons name="chevron-forward" size={13} color={FAINT} style={{ alignSelf: "flex-end" }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push(`/(main)/circles/${id}/bets` as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIconRing, { backgroundColor: "rgba(234,179,8,0.12)", borderColor: "rgba(234,179,8,0.25)" }]}>
              <Ionicons name="trophy-outline" size={22} color="#FCD34D" />
            </View>
            <View style={styles.featureTextGroup}>
              <Text style={styles.featureTitle}>Bets</Text>
              <Text style={styles.featureSub}>Friendly wagers with the group</Text>
            </View>
            <Ionicons name="chevron-forward" size={13} color={FAINT} style={{ alignSelf: "flex-end" }} />
          </TouchableOpacity>
        </View>

        {/* Third row: Rounds + Expenses */}
        <View style={styles.featureRow}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push(`/(main)/circles/${id}/lottery` as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIconRing, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.22)" }]}>
              <Ionicons name="repeat-outline" size={22} color="#FCA5A5" />
            </View>
            <View style={styles.featureTextGroup}>
              <Text style={styles.featureTitle}>Rounds</Text>
              <Text style={styles.featureSub}>Take turns picking up the tab</Text>
            </View>
            <Ionicons name="chevron-forward" size={13} color={FAINT} style={{ alignSelf: "flex-end" }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push(`/(main)/circles/${id}/expenses` as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIconRing, { backgroundColor: "rgba(74,222,128,0.1)", borderColor: "rgba(74,222,128,0.2)" }]}>
              <Ionicons name="wallet-outline" size={22} color={Colors.green} />
            </View>
            <View style={styles.featureTextGroup}>
              <Text style={styles.featureTitle}>Split Expenses</Text>
              <Text style={styles.featureSub}>Track who owes what, settle up</Text>
            </View>
            <Ionicons name="chevron-forward" size={13} color={FAINT} style={{ alignSelf: "flex-end" }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Voice thread ── */}
      <View style={styles.divider}>
        <Text style={styles.dividerLabel}>VOICE NOTES</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.purple} style={{ flex: 1 }} />
      ) : notes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="mic-outline" size={44} color={FAINT} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>
            No voice notes yet.{"\n"}Hold the mic to say something.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          inverted
          contentContainerStyle={{ paddingVertical: 16 }}
        />
      )}

      {/* ── Recorder ── */}
      <View style={styles.recorderBar}>
        <VoiceNoteRecorder onSend={handleSend} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: "700",
    color: TEXT,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },

  // Feature grid
  featuresContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 10,
  },

  // Room hero card
  roomCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
  },
  roomGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  roomLeft: { flex: 1 },
  livePillWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.green,
  },
  livePillText: {
    fontSize: 10, fontWeight: "800",
    color: Colors.green, letterSpacing: 1.2,
  },
  roomTitle: {
    fontSize: 20, fontWeight: "800",
    color: TEXT, letterSpacing: -0.3,
    marginBottom: 3,
  },
  roomSub: { fontSize: 13, color: MUTED },
  roomIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  // Two-column feature cards
  featureRow: {
    flexDirection: "row",
    gap: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 12,
  },
  featureIconRing: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  featureTextGroup: {
    gap: 3,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.2,
  },
  featureSub: {
    fontSize: 11,
    color: FAINT,
    lineHeight: 15,
  },

  // Voice section
  divider: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: FAINT,
    letterSpacing: 1.4,
  },

  // Empty
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: {
    color: MUTED,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
  },

  // Recorder
  recorderBar: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
    paddingBottom: 24,
  },
});
