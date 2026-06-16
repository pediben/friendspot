/**
 * Join Private Room by Code
 *
 * Flow:
 *   1. User enters room code (XXXX-XXXX)
 *   2. We call find_private_room_by_code() to get the mode
 *   3a. Standard mode → ask for 6-digit passcode → call join_standard_private_room()
 *   3b. Encrypted mode → ask for passphrase (it's the E2EE key seed)
 *   4. Navigate to the private room screen
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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { normalizeRoomCode } from "@/lib/roomCode";
import { normalizePassphrase } from "@/lib/passphrase";
import { Colors } from "@/constants/Colors";

type Step = "code" | "secret";
type RoomMode = "standard" | "encrypted";

interface FoundRoom {
  id: string;
  circle_id: string;
  name: string;
  room_mode: RoomMode;
}

export default function JoinPrivateRoomScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();

  const [step, setStep]       = useState<Step>("code");
  const [code, setCode]       = useState("");
  const [secret, setSecret]   = useState("");
  const [room, setRoom]       = useState<FoundRoom | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Step 1: look up the room code ──────────────────────────────────────────
  const handleLookup = async () => {
    const clean = normalizeRoomCode(code);
    if (clean.length < 8) {
      Alert.alert("Invalid code", "Please enter the full 8-character room code.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("find_private_room_by_code", {
        p_code: clean,
      });

      if (error || !data || data.length === 0) {
        Alert.alert("Room not found", "Check the code and try again.");
        return;
      }

      setRoom(data[0] as FoundRoom);
      setStep("secret");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify secret and navigate ─────────────────────────────────────
  const handleJoin = async () => {
    if (!room) return;
    if (!secret.trim()) {
      Alert.alert(
        "Required",
        room.room_mode === "standard" ? "Enter the 6-digit passcode." : "Enter the passphrase."
      );
      return;
    }

    setLoading(true);
    try {
      if (room.room_mode === "standard") {
        const { data, error } = await supabase.rpc("join_standard_private_room", {
          p_code:     normalizeRoomCode(code),
          p_passcode: secret.trim(),
        });

        if (error || !data || data.length === 0) {
          const msg = error?.message ?? "Incorrect passcode";
          Alert.alert("Can't join", msg.includes("Incorrect") ? "Incorrect passcode." : msg);
          return;
        }

        router.replace({
          pathname: "/(main)/circles/[id]/private-room/[roomId]" as any,
          params: { id: circleId, roomId: room.id },
        });
      } else {
        // Encrypted: navigate with passphrase so it becomes the E2EE key
        router.replace({
          pathname: "/(main)/circles/[id]/private-room/[roomId]" as any,
          params: {
            id: circleId,
            roomId: room.id,
            passphrase: normalizePassphrase(secret),
          },
        });
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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
          <Text style={styles.title}>Join private room</Text>
        </View>

        {step === "code" ? (
          <>
            <Text style={styles.label}>Room code</Text>
            <Text style={styles.hint}>Enter the XXXX-XXXX code shared with you.</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="XXXX-XXXX"
              placeholderTextColor={Colors.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={9}
              onSubmitEditing={handleLookup}
              returnKeyType="next"
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLookup}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.text} />
                : <Text style={styles.btnText}>Next →</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.roomPill}>
              <Ionicons
                name={room?.room_mode === "encrypted" ? "lock-closed" : "shield-checkmark"}
                size={16}
                color={room?.room_mode === "encrypted" ? Colors.purple : Colors.green}
              />
              <Text style={styles.roomName}>{room?.name}</Text>
            </View>

            {room?.room_mode === "standard" ? (
              <>
                <Text style={styles.label}>Passcode</Text>
                <Text style={styles.hint}>Enter the 6-digit passcode for this room.</Text>
                <TextInput
                  style={styles.input}
                  value={secret}
                  onChangeText={setSecret}
                  placeholder="000000"
                  placeholderTextColor={Colors.textFaint}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  onSubmitEditing={handleJoin}
                  returnKeyType="join"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Passphrase</Text>
                <Text style={styles.hint}>
                  Enter the word passphrase shared with you. It's the encryption key — the host
                  never sees your audio on our servers.
                </Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                  value={secret}
                  onChangeText={setSecret}
                  placeholder="word-word-word-word-word-word"
                  placeholderTextColor={Colors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.text} />
                : <Text style={styles.btnText}>Join room</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setStep("code"); setSecret(""); setRoom(null); }}
              style={styles.changeCode}
            >
              <Text style={styles.changeCodeText}>← Change code</Text>
            </TouchableOpacity>
          </>
        )}
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
  hint: { fontSize: 14, color: Colors.textFaint, lineHeight: 20, marginTop: -8 },
  input: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 18,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  btn: {
    backgroundColor: Colors.purple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: Colors.text, fontWeight: "700", fontSize: 16 },
  roomPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  roomName: { color: Colors.text, fontWeight: "600", fontSize: 14 },
  changeCode: { alignSelf: "flex-start", marginTop: -4 },
  changeCodeText: { color: Colors.purple, fontSize: 14 },
});
