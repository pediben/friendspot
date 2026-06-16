/**
 * Private Room Screen — voice room with optional E2EE.
 *
 * Two modes (set at room creation, stored in circle_private_rooms.room_mode):
 *
 *   standard  — TLS only. Passcode was verified server-side before navigation.
 *               Server can see connection metadata but NOT audio content
 *               (same as any TLS call).
 *
 *   encrypted — LiveKit E2EE using useRNE2EEManager. The passphrase is the
 *               shared key seed. Server is completely blind to audio content.
 *               If no passphrase is in route params, we show a gate screen
 *               where the user must type it.
 *
 * Routing:
 *   Standard:   router.replace({ pathname: '...', params: { id, roomId } })
 *   Encrypted:  router.replace({ pathname: '...', params: { id, roomId, passphrase } })
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  AudioSession,
  useRNE2EEManager,
} from "@livekit/react-native";
import { supabase } from "@/lib/supabase";
import { getPrivateRoomToken } from "@/lib/livekit";
import { normalizePassphrase } from "@/lib/passphrase";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/Colors";

type ReconnectState = "none" | "reconnecting" | "failed";
type RoomMode = "standard" | "encrypted";

// ─── E2EE Passphrase Gate ────────────────────────────────────────────────────

function PassphraseGate({
  roomName,
  onSubmit,
  onCancel,
}: {
  roomName: string;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.gateContainer}>
        <Ionicons name="lock-closed" size={40} color={Colors.purple} />
        <Text style={styles.gateTitle}>{roomName}</Text>
        <Text style={styles.gateSubtitle}>
          This room is end-to-end encrypted. Enter the passphrase to decrypt the audio.
          The host shared it with you out-of-band.
        </Text>

        <View style={styles.encryptedBadge}>
          <Ionicons name="lock-closed" size={13} color={Colors.purple} />
          <Text style={styles.encryptedBadgeText}>End-to-End Encrypted</Text>
        </View>

        <TextInput
          style={styles.gateInput}
          value={value}
          onChangeText={setValue}
          placeholder="word-word-word-word-word-word"
          placeholderTextColor={Colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.btn, !value.trim() && styles.btnDisabled]}
          onPress={() => value.trim() && onSubmit(normalizePassphrase(value))}
          disabled={!value.trim()}
        >
          <Text style={styles.btnText}>Enter room</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onCancel} style={{ marginTop: 12 }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Participant tile ─────────────────────────────────────────────────────────

function ParticipantTile({ name, identity, isSpeaking, isMuted }: {
  name: string;
  identity: string;
  isSpeaking: boolean;
  isMuted: boolean;
}) {
  return (
    <View style={styles.tile}>
      <View style={[styles.avatarWrapper, isSpeaking && styles.avatarWrapperSpeaking]}>
        <Avatar uri={null} name={name || identity} size={60} />
      </View>
      {isMuted && <Ionicons name="mic-off" size={13} color={Colors.red} style={{ marginTop: 2 }} />}
      <Text style={styles.tileName} numberOfLines={1}>{name || identity.slice(0, 12)}</Text>
    </View>
  );
}

// ─── Connected room UI (inside LiveKitRoom context) ───────────────────────────

function ConnectedRoom({ onLeave, isEncrypted }: { onLeave: () => void; isEncrypted: boolean }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const toggleMic = () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);

  return (
    <View style={styles.connectedContainer}>
      {/* E2EE badge */}
      {isEncrypted && (
        <View style={styles.e2eeBanner}>
          <Ionicons name="lock-closed" size={13} color={Colors.purple} />
          <Text style={styles.e2eeBannerText}>End-to-end encrypted</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.grid}>
        {participants.map((p) => (
          <ParticipantTile
            key={p.identity}
            identity={p.identity}
            name={p.name ?? p.identity}
            isSpeaking={p.isSpeaking}
            isMuted={!p.isMicrophoneEnabled}
          />
        ))}
        {participants.length === 0 && (
          <Text style={styles.emptyText}>You're the first one here 👋</Text>
        )}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.micBtn, isMicrophoneEnabled ? styles.micOn : styles.micOff]}
          onPress={toggleMic}
        >
          <Ionicons name={isMicrophoneEnabled ? "mic" : "mic-off"} size={26} color={Colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.leaveBtn} onPress={onLeave}>
          <Ionicons name="call" size={22} color={Colors.text} style={{ transform: [{ rotate: "135deg" }] }} />
          <Text style={styles.leaveBtnText}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function PrivateRoomScreen() {
  const { id: circleId, roomId, passphrase: initialPassphrase } =
    useLocalSearchParams<{ id: string; roomId: string; passphrase?: string }>();

  // Room metadata from DB
  const [roomName, setRoomName]   = useState("");
  const [roomMode, setRoomMode]   = useState<RoomMode>("standard");
  const [metaLoaded, setMetaLoaded] = useState(false);

  // Passphrase state (for encrypted rooms)
  const [passphrase, setPassphrase] = useState(
    initialPassphrase ? normalizePassphrase(initialPassphrase) : ""
  );
  const isEncrypted    = roomMode === "encrypted";
  const e2eeEnabled    = isEncrypted && !!passphrase;

  // LiveKit token
  const [token, setToken]         = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState("");
  const [tokenVersion, setTokenVersion] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [reconnect, setReconnect] = useState<ReconnectState>("none");

  const intentionalLeave = useRef(false);
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // E2EE manager — must be called unconditionally; placeholder key used when
  // not in an encrypted room so the hook is always mounted at the same call site.
  const { e2eeManager } = useRNE2EEManager({
    sharedKey: passphrase || "friendspot-no-e2ee-placeholder",
  });

  // ── Load room metadata ────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("circle_private_rooms")
      .select("name, room_mode")
      .eq("id", roomId)
      .single()
      .then(({ data }) => {
        if (data) {
          setRoomName(data.name);
          setRoomMode(data.room_mode as RoomMode);
        }
        setMetaLoaded(true);
      });
  }, [roomId]);

  // ── Fetch token & start audio ─────────────────────────────────────────────
  const setup = useCallback(async () => {
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

      const result = await getPrivateRoomToken(roomId);
      setToken(result.token);
      setServerUrl(result.url);
    } catch (e: any) {
      Alert.alert("Couldn't join", e.message, [{ text: "OK", onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (metaLoaded && (roomMode === "standard" || passphrase)) {
      setup();
    }
    return () => {
      AudioSession.stopAudioSession();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [metaLoaded, roomMode, passphrase]);

  const leaveIntentionally = useCallback(() => {
    intentionalLeave.current = true;
    router.back();
  }, []);

  const handleDisconnected = useCallback(() => {
    if (intentionalLeave.current) return;
    setReconnect("reconnecting");
    reconnectTimer.current = setTimeout(() => setReconnect("failed"), 40_000);
  }, []);

  // ── Gate: encrypted room but no passphrase yet ────────────────────────────
  if (metaLoaded && isEncrypted && !passphrase) {
    return (
      <PassphraseGate
        roomName={roomName}
        onSubmit={(p) => setPassphrase(p)}
        onCancel={() => router.back()}
      />
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!metaLoaded || loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.purple} size="large" />
        <Text style={styles.loadingText}>Joining private room…</Text>
      </View>
    );
  }

  // ── Reconnect failed ──────────────────────────────────────────────────────
  if (reconnect === "failed") {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="wifi-outline" size={48} color={Colors.orange} />
        <Text style={styles.errorTitle}>Connection lost</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => { setReconnect("none"); setToken(null); setup(); }}
        >
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Leave</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={isEncrypted ? "lock-closed" : "shield-checkmark"}
            size={16}
            color={isEncrypted ? Colors.purple : Colors.green}
          />
          <Text style={styles.headerTitle} numberOfLines={1}>{roomName || "Private Room"}</Text>
        </View>
        {reconnect === "reconnecting" && (
          <View style={styles.reconnectBadge}>
            <ActivityIndicator size="small" color={Colors.orange} />
            <Text style={styles.reconnectText}>Reconnecting…</Text>
          </View>
        )}
      </View>

      {token && serverUrl ? (
        <LiveKitRoom
          key={tokenVersion}
          serverUrl={serverUrl}
          token={token}
          connect={true}
          options={{
            adaptiveStream: true,
            dynacast: true,
            audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            publishDefaults: { red: true, dtx: true },
            encryption: e2eeEnabled ? { e2eeManager } : undefined,
          }}
          onDisconnected={handleDisconnected}
          onConnected={() => {
            if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
            setReconnect("none");
          }}
        >
          <ConnectedRoom onLeave={leaveIntentionally} isEncrypted={isEncrypted} />
        </LiveKitRoom>
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.purple} />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  loadingText: { color: Colors.textMuted, fontSize: 16 },
  errorTitle: { color: Colors.text, fontSize: 18, fontWeight: "700" },
  cancelText: { color: Colors.purple, fontSize: 15, marginTop: 8 },

  // Gate
  gateContainer: {
    flex: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  gateTitle: { color: Colors.text, fontSize: 22, fontWeight: "700", textAlign: "center" },
  gateSubtitle: { color: Colors.textMuted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  gateInput: {
    width: "100%",
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    textAlignVertical: "top",
  },

  // E2EE badge
  encryptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(124,58,237,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  encryptedBadgeText: { color: Colors.purple, fontSize: 13, fontWeight: "600" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: "700" },
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

  // E2EE banner inside room
  e2eeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: "rgba(124,58,237,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  e2eeBannerText: { color: Colors.purple, fontSize: 13, fontWeight: "600" },

  // Connected room
  connectedContainer: { flex: 1 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 20,
    gap: 16,
    justifyContent: "center",
    flexGrow: 1,
  },
  emptyText: { color: Colors.textMuted, fontSize: 16, textAlign: "center", marginTop: 60, width: "100%" },

  // Participant tile
  tile: { width: 90, alignItems: "center", gap: 6 },
  avatarWrapper: { borderRadius: 40, borderWidth: 2, borderColor: "transparent" },
  avatarWrapperSpeaking: { borderColor: Colors.purple },
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
  micBtn: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
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
  leaveBtnText: { color: Colors.text, fontWeight: "700", fontSize: 15 },

  // Shared
  btn: {
    backgroundColor: Colors.purple,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: Colors.text, fontWeight: "700", fontSize: 16 },
});
