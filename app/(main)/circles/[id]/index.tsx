/**
 * CircleDetailScreen
 * Top: Live Room bar (shows active members, tap to join)
 * Bottom: Voice thread (async voice notes feed + recorder)
 */
import { useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVoiceNotes } from "@/hooks/useVoiceNotes";
import { useAuthStore } from "@/hooks/useAuth";
import { VoiceNotePlayer } from "@/components/voice/VoiceNotePlayer";
import { VoiceNoteRecorder } from "@/components/voice/VoiceNoteRecorder";
import { CircleMessageWithSender } from "@/types/database";
import { Colors } from "@/constants/Colors";

export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const { notes, loading, sendVoiceNote } = useVoiceNotes(id);
  const listRef = useRef<FlatList>(null);

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Circle
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(main)/circles/${id}/settings` as any)}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Calls row */}
      <View style={styles.featureRow}>
        <TouchableOpacity
          style={styles.featureBarGreen}
          onPress={() => router.push(`/(main)/circles/${id}/room`)}
          activeOpacity={0.8}
        >
          <View style={styles.liveDot} />
          <Text style={styles.featureTextGreen}>Room</Text>
          <Text style={styles.arrowGreen}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.featureBarPurple}
          onPress={() => router.push(`/(main)/circles/${id}/private-rooms` as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="lock-closed" size={13} color={Colors.purple} />
          <Text style={styles.featureTextPurple}>Private Call</Text>
          <Text style={styles.arrowPurple}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Games/money row */}
      <View style={styles.featureRow}>
        <TouchableOpacity
          style={styles.featureBarYellow}
          onPress={() => router.push(`/(main)/circles/${id}/bets` as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="trophy-outline" size={14} color="#CA8A04" />
          <Text style={styles.featureTextYellow}>Bets</Text>
          <Ionicons name="chevron-forward" size={13} color="#CA8A04" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.featureBarRed}
          onPress={() => router.push(`/(main)/circles/${id}/lottery` as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="ticket-outline" size={14} color="#EF4444" />
          <Text style={styles.featureTextRed}>Lottery</Text>
          <Ionicons name="chevron-forward" size={13} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Split expenses */}
      <TouchableOpacity
        style={styles.expenseBar}
        onPress={() => router.push(`/(main)/circles/${id}/expenses` as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="wallet-outline" size={14} color={Colors.green} />
        <Text style={styles.expenseText}>Split expenses</Text>
        <Ionicons name="chevron-forward" size={13} color={Colors.green} />
      </TouchableOpacity>

      {/* Voice thread */}
      {loading ? (
        <ActivityIndicator color={Colors.purple} style={{ flex: 1 }} />
      ) : notes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="mic-outline" size={48} color={Colors.textFaint} style={{ marginBottom: 16 }} />
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

      {/* Recorder */}
      <View style={styles.recorderBar}>
        <VoiceNoteRecorder onSend={handleSend} />
      </View>
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
    paddingBottom: 12,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  featureRow: {
    flexDirection: "row", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
  },
  featureBarGreen: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(74,222,128,0.12)", paddingHorizontal: 12,
    paddingVertical: 10, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
  },
  featureBarPurple: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(124,58,237,0.08)", paddingHorizontal: 12,
    paddingVertical: 10, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(124,58,237,0.2)",
  },
  featureBarYellow: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(234,179,8,0.08)", paddingHorizontal: 12,
    paddingVertical: 10, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(234,179,8,0.25)",
  },
  featureBarRed: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(239,68,68,0.08)", paddingHorizontal: 12,
    paddingVertical: 10, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  expenseBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "rgba(74,222,128,0.08)", paddingHorizontal: 16,
    paddingVertical: 10, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(74,222,128,0.15)",
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  featureTextGreen: { flex: 1, color: Colors.green, fontSize: 13, fontWeight: "600" },
  featureTextPurple: { flex: 1, color: Colors.purple, fontSize: 13, fontWeight: "600" },
  featureTextYellow: { flex: 1, color: "#CA8A04", fontSize: 13, fontWeight: "600" },
  featureTextRed: { flex: 1, color: "#EF4444", fontSize: 13, fontWeight: "600" },
  expenseText: { flex: 1, color: Colors.green, fontSize: 13, fontWeight: "600" },
  arrowGreen: { color: Colors.green, fontSize: 13, fontWeight: "700" },
  arrowPurple: { color: Colors.purple, fontSize: 13, fontWeight: "700" },
  arrowYellow: { color: "#CA8A04", fontSize: 13, fontWeight: "700" },
  arrowRed: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  recorderBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.bgCardBorder,
    backgroundColor: Colors.bg,
    paddingBottom: 24,
  },
});
