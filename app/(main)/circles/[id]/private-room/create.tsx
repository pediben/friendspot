/**
 * Create Private Room
 *
 * Lets a circle member create a private sub-room in two modes:
 *
 *   Standard  — Zoom-like. Passcode is a 6-digit PIN. Server can see who is
 *               speaking (TLS only, not E2EE). Good for most private calls.
 *
 *   Encrypted — E2EE. The passphrase IS the LiveKit key seed; the server is
 *               blind to audio content. Best for sensitive conversations.
 *               UI MUST clearly distinguish this from Standard to avoid
 *               misleading users about the privacy level.
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { generateRoomCode, normalizeRoomCode } from "@/lib/roomCode";
import { generatePassphrase, normalizePassphrase } from "@/lib/passphrase";
import { Colors } from "@/constants/Colors";

type Mode = "standard" | "encrypted";

export default function CreatePrivateRoomScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();

  const [name, setName]         = useState("");
  const [mode, setMode]         = useState<Mode>("standard");
  const [passcode, setPasscode] = useState("");
  const [passphrase]            = useState(() => generatePassphrase(6));
  const [roomCode]              = useState(() => generateRoomCode(8));
  const [loading, setLoading]   = useState(false);
  const [created, setCreated]   = useState<{ id: string } | null>(null);

  const isEncrypted = mode === "encrypted";

  // ── Create the room ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert("Name required", "Give your room a name."); return; }

    if (mode === "standard") {
      if (passcode.length !== 6 || !/^\d{6}$/.test(passcode)) {
        Alert.alert("Passcode", "Enter exactly 6 digits.");
        return;
      }
    }

    setLoading(true);
    try {
      let newRoomId: string;

      if (mode === "standard") {
        const { data, error } = await supabase.rpc("create_standard_private_room", {
          p_circle_id: circleId,
          p_name:      name.trim(),
          p_room_code: normalizeRoomCode(roomCode),
          p_passcode:  passcode,
        });
        if (error || !data) throw new Error(error?.message ?? "Failed to create room");
        newRoomId = data as string;
      } else {
        // Encrypted — insert directly (no server-side passcode needed)
        const { data, error } = await supabase
          .from("circle_private_rooms")
          .insert({
            circle_id:   circleId,
            created_by:  (await supabase.auth.getUser()).data.user!.id,
            name:        name.trim(),
            room_mode:   "encrypted",
            room_code:   normalizeRoomCode(roomCode),
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message ?? "Failed to create room");
        newRoomId = data.id;
      }

      setCreated({ id: newRoomId });
    } catch (e: any) {
      Alert.alert("Couldn't create room", e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Navigate into the room ─────────────────────────────────────────────────
  const enterRoom = () => {
    if (!created) return;
    router.replace({
      pathname: "/(main)/circles/[id]/private-room/[roomId]" as any,
      params: {
        id: circleId,
        roomId: created.id,
        ...(isEncrypted ? { passphrase: normalizePassphrase(passphrase) } : {}),
      },
    });
  };

  // ── Rendered after creation: share the invite details ─────────────────────
  if (created) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>Room created 🎉</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Room Code</Text>
            <Text style={styles.codeText}>{roomCode}</Text>
            <Text style={styles.cardHint}>Share this with people you want to invite.</Text>
          </View>

          {isEncrypted ? (
            <View style={[styles.card, { borderColor: Colors.purple }]}>
              <View style={styles.encryptedBadge}>
                <Ionicons name="lock-closed" size={14} color={Colors.purple} />
                <Text style={styles.encryptedBadgeText}>End-to-End Encrypted</Text>
              </View>
              <Text style={styles.cardLabel}>Passphrase (encryption key)</Text>
              <Text style={styles.passphraseText}>{passphrase}</Text>
              <Text style={styles.cardHint}>
                Share this privately — it IS the encryption key. Anyone with it can
                decrypt the audio. Our servers never see it.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Passcode</Text>
              <Text style={styles.codeText}>{passcode}</Text>
              <Text style={styles.cardHint}>Share this along with the room code.</Text>
            </View>
          )}

          <TouchableOpacity style={styles.btn} onPress={enterRoom}>
            <Text style={styles.btnText}>Enter room</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Create form ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>New private room</Text>
        </View>

        {/* Name */}
        <Text style={styles.label}>Room name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Planning call"
          placeholderTextColor={Colors.textFaint}
          maxLength={60}
          returnKeyType="next"
        />

        {/* Mode toggle */}
        <View style={styles.modeSection}>
          <Text style={styles.label}>Privacy mode</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "standard" && styles.modeBtnActive]}
              onPress={() => setMode("standard")}
            >
              <Ionicons name="shield-checkmark" size={18} color={mode === "standard" ? Colors.text : Colors.textMuted} />
              <Text style={[styles.modeBtnText, mode === "standard" && styles.modeBtnTextActive]}>
                Standard
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "encrypted" && styles.modeBtnActive, mode === "encrypted" && styles.modeBtnEncrypted]}
              onPress={() => setMode("encrypted")}
            >
              <Ionicons name="lock-closed" size={18} color={mode === "encrypted" ? Colors.text : Colors.textMuted} />
              <Text style={[styles.modeBtnText, mode === "encrypted" && styles.modeBtnTextActive]}>
                Encrypted
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modeDesc}>
            {mode === "standard"
              ? "Protected by a passcode. Uses TLS, like a normal call. Friendspot's servers can see connection metadata."
              : "End-to-end encrypted. The passphrase is the encryption key — our servers are completely blind to your audio."}
          </Text>
        </View>

        {/* Standard: passcode input */}
        {mode === "standard" && (
          <>
            <Text style={styles.label}>Passcode (6 digits)</Text>
            <TextInput
              style={styles.input}
              value={passcode}
              onChangeText={(t) => setPasscode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={Colors.textFaint}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />
          </>
        )}

        {/* Encrypted: show generated passphrase */}
        {mode === "encrypted" && (
          <View style={[styles.card, { borderColor: Colors.purple }]}>
            <View style={styles.encryptedBadge}>
              <Ionicons name="lock-closed" size={14} color={Colors.purple} />
              <Text style={styles.encryptedBadgeText}>Auto-generated passphrase</Text>
            </View>
            <Text style={styles.passphraseText}>{passphrase}</Text>
            <Text style={styles.cardHint}>
              After creating the room, copy this and share it privately with your guests.
              This is the only way in — treat it like a password.
            </Text>
          </View>
        )}

        {/* Room code preview */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Room Code (auto-generated)</Text>
          <Text style={styles.codeText}>{roomCode}</Text>
          <Text style={styles.cardHint}>Share this code so people can find the room.</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.text} />
            : <Text style={styles.btnText}>Create room</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { padding: 24, paddingTop: 0, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  label: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  input: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    marginTop: -4,
  },
  modeSection: { gap: 10 },
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  modeBtnActive: { borderColor: Colors.green, backgroundColor: "rgba(74,222,128,0.08)" },
  modeBtnEncrypted: { borderColor: Colors.purple, backgroundColor: "rgba(124,58,237,0.1)" },
  modeBtnText: { color: Colors.textMuted, fontWeight: "600", fontSize: 14 },
  modeBtnTextActive: { color: Colors.text },
  modeDesc: { color: Colors.textFaint, fontSize: 13, lineHeight: 18 },

  // Cards
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  cardLabel: { fontSize: 12, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  cardHint: { fontSize: 13, color: Colors.textFaint, lineHeight: 18 },
  codeText: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 3,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  passphraseText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.purpleLight,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  encryptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(124,58,237,0.1)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  encryptedBadgeText: { color: Colors.purple, fontSize: 12, fontWeight: "600" },

  btn: {
    backgroundColor: Colors.purple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: Colors.text, fontWeight: "700", fontSize: 16 },
});
