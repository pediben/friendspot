/**
 * Drop-in Room Screen — persistent voice room for a circle.
 *
 * Uses the low-level LiveKit Room API directly (not <LiveKitRoom> provider)
 * so we can handle reconnects and audio session lifecycle manually.
 *
 * Flow:
 *   1. Configure iOS/Android audio session
 *   2. Fetch LiveKit token (Edge Function validates circle membership)
 *   3. Connect room, enable mic
 *   4. Show participant grid + mic toggle + leave
 *   5. On unexpected disconnect: 40-second reconnect window, then "failed" UI
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Room, RoomEvent, Participant } from "livekit-client";
import { useParticipants, AudioSession } from "@livekit/react-native";
import { getCircleRoomToken } from "@/lib/livekit";
import { Avatar } from "@/components/ui/Avatar";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

type ReconnectState = "none" | "reconnecting" | "failed";

export default function DropInRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [room] = useState(() => new Room());
  const [loading, setLoading]         = useState(true);
  const [micEnabled, setMicEnabled]   = useState(true);
  const [reconnect, setReconnect]     = useState<ReconnectState>("none");

  const intentionalLeave = useRef(false);
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const participants     = useParticipants({ room });

  // ── Setup: audio + token + connect ──────────────────────────────────────
  const joinRoom = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (AudioSession.configureAudio as any)({
        android: { audioType: "voiceCommunication", preferHeadset: false, forceHandsfree: false },
        ios: {
          defaultOutput: "speaker",
          mixWithOthers: false,
          audioMode: "voiceChat",
          audioCategory: "playAndRecord",
          audioCategoryOptions: ["defaultToSpeaker", "allowBluetooth"],
        },
      });
      await AudioSession.startAudioSession();

      const { token, url } = await getCircleRoomToken(id);
      await room.connect(url, token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicEnabled(true);
    } catch (e: any) {
      Alert.alert("Couldn't join room", e.message, [{ text: "OK", onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  }, [id, room]);

  // ── Room event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const onDisconnected = () => {
      if (intentionalLeave.current) return;
      setReconnect("reconnecting");
      reconnectTimer.current = setTimeout(() => setReconnect("failed"), 40_000);
    };
    const onReconnected = () => {
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
      setReconnect("none");
    };

    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.Reconnected, onReconnected);

    joinRoom();

    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.disconnect();
      AudioSession.stopAudioSession();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ─────────────────────────────────────────────────────────────
  const toggleMic = async () => {
    const next = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  };

  const leave = async () => {
    intentionalLeave.current = true;
    await room.disconnect();
    await AudioSession.stopAudioSession();
    router.back();
  };

  // ── Render: loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.purple} size="large" />
        <Text style={styles.loadingText}>Joining room…</Text>
      </View>
    );
  }

  // ── Render: reconnect failed ─────────────────────────────────────────────
  if (reconnect === "failed") {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="wifi-outline" size={48} color={Colors.orange} />
        <Text style={styles.errorTitle}>Connection lost</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setReconnect("none"); joinRoom(); }}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={styles.leaveLink}>Leave room</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: connected ────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.title}>Drop-in Room</Text>
        </View>
        {reconnect === "reconnecting" && (
          <View style={styles.reconnectBadge}>
            <ActivityIndicator size="small" color={Colors.orange} />
            <Text style={styles.reconnectText}>Reconnecting…</Text>
          </View>
        )}
      </View>

      {/* Participants grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {participants.map((p) => (
          <ParticipantTile key={p.identity} participant={p} />
        ))}
        {participants.length === 0 && (
          <Text style={styles.emptyText}>You're the first one here 👋</Text>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.micBtn, micEnabled ? styles.micOn : styles.micOff]}
          onPress={toggleMic}
        >
          <Ionicons name={micEnabled ? "mic" : "mic-off"} size={26} color={Colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.leaveBtn} onPress={leave}>
          <Ionicons name="call" size={22} color={Colors.text} style={{ transform: [{ rotate: "135deg" }] }} />
          <Text style={styles.leaveBtnLabel}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ParticipantTile({ participant }: { participant: Participant }) {
  return (
    <View style={[styles.tile, participant.isSpeaking && styles.tileSpeaking]}>
      <Avatar uri={null} name={participant.name ?? participant.identity} size={60} />
      <Text style={styles.tileName} numberOfLines={1}>
        {participant.name ?? participant.identity.slice(0, 12)}
      </Text>
      {!participant.isMicrophoneEnabled && (
        <Ionicons name="mic-off" size={13} color={Colors.red} style={{ marginTop: 2 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  loadingText: { color: Colors.textMuted, fontSize: 16 },
  errorTitle: { color: Colors.text, fontSize: 18, fontWeight: "700", textAlign: "center" },
  leaveLink: { color: Colors.purple, fontSize: 15 },
  retryBtn: {
    backgroundColor: Colors.purple,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: { color: Colors.text, fontWeight: "700", fontSize: 15 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.green },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  reconnectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(251,146,60,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  reconnectText: { color: Colors.orange, fontSize: 13 },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 20,
    gap: 16,
    justifyContent: "center",
    flexGrow: 1,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginTop: 60,
    width: "100%",
  },

  // Participant tile
  tile: {
    width: 90,
    alignItems: "center",
    gap: 6,
  },
  tileSpeaking: {},
  tileName: { color: Colors.textMuted, fontSize: 12, fontWeight: "500", textAlign: "center" },

  // Controls
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.bgCardBorder,
  },
  micBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  micOn: { backgroundColor: Colors.bgCard },
  micOff: { backgroundColor: Colors.red },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.red,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
  },
  leaveBtnLabel: { color: Colors.text, fontWeight: "700", fontSize: 15 },
});
