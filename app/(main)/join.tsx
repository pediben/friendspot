/**
 * Join via invite screen.
 * Reachable via:
 *   - Deep link: friendspot://join/XXXXXX
 *   - Manual code entry from the Spots home screen
 */
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { previewInvite, joinSpotByCode } from "@/lib/invites";
import { Colors } from "@/constants/Colors";

const BG     = "#09090F";
const CARD   = "#111118";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT   = "#FFFFFF";
const MUTED  = "rgba(255,255,255,0.4)";
const FAINT  = "rgba(255,255,255,0.18)";
const GOLD   = "#C9A84C";

type Preview = {
  code: string;
  circle: { id: string; name: string; icon: string | null };
  uses: number;
  max_uses: number;
};

export default function JoinScreen() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();

  const [code, setCode]         = useState((codeParam ?? "").toUpperCase());
  const [preview, setPreview]   = useState<Preview | null>(null);
  const [loading, setLoading]   = useState(false);
  const [joining, setJoining]   = useState(false);

  // Auto-preview if code came from a deep link
  useEffect(() => {
    if (codeParam && codeParam.length === 6) {
      lookupCode(codeParam.toUpperCase());
    }
  }, [codeParam]);

  const lookupCode = async (c: string) => {
    if (c.length !== 6) return;
    setLoading(true);
    setPreview(null);
    const result = await previewInvite(c);
    setLoading(false);
    if (result) {
      setPreview(result as Preview);
    } else {
      Alert.alert("Invalid code", "This invite doesn't exist or has expired.");
    }
  };

  const handleCodeChange = (val: string) => {
    const upper = val.toUpperCase().replace(/[^0-9A-HJKMNP-TV-Z]/g, "").slice(0, 6);
    setCode(upper);
    if (upper.length === 6) lookupCode(upper);
  };

  const join = async () => {
    if (!preview) return;
    setJoining(true);
    const result = await joinSpotByCode(code);
    setJoining(false);

    if (!result) {
      Alert.alert("Couldn't join", "Something went wrong. Try again.");
      return;
    }

    if (result.alreadyMember) {
      Alert.alert("Already in!", `You're already in "${result.circleName}".`);
      router.replace(`/(main)/circles/${result.circleId}` as any);
      return;
    }

    // Success — navigate into the Spot
    router.replace(`/(main)/circles/${result.circleId}` as any);
  };

  const spotName = preview?.circle?.name ?? "";

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={TEXT} />
      </TouchableOpacity>

      <Text style={styles.heading}>Join a Spot</Text>
      <Text style={styles.sub}>Enter the 6-character invite code.</Text>

      {/* Code input */}
      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={handleCodeChange}
        placeholder="A1B2C3"
        placeholderTextColor={FAINT}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        keyboardType="default"
        autoFocus={!codeParam}
      />

      {loading && (
        <ActivityIndicator color={GOLD} style={{ marginTop: 24 }} />
      )}

      {/* Spot preview */}
      {preview && !loading && (
        <View style={styles.previewCard}>
          <View style={styles.previewTop}>
            <View style={styles.spotIcon}>
              <Text style={styles.spotIconText}>
                {getInitials(spotName)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.spotName}>{spotName}</Text>
              <Text style={styles.spotMeta}>
                {preview.uses} {preview.uses === 1 ? "member" : "members"} · invite valid
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={Colors.green} />
          </View>

          <TouchableOpacity
            style={[styles.joinBtn, joining && { opacity: 0.6 }]}
            onPress={join}
            disabled={joining}
          >
            {joining
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.joinBtnText}>Join "{spotName}" →</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {!preview && !loading && code.length > 0 && code.length < 6 && (
        <Text style={styles.hint}>{6 - code.length} more characters…</Text>
      )}
    </View>
  );
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: BG,
    paddingHorizontal: 24, paddingTop: 60,
  },
  backBtn: { marginBottom: 32 },
  heading: { fontSize: 32, fontWeight: "800", color: TEXT, letterSpacing: -0.5, marginBottom: 8 },
  sub:     { fontSize: 15, color: MUTED, marginBottom: 36 },

  codeInput: {
    fontSize: 36,
    fontWeight: "800",
    color: GOLD,
    letterSpacing: 10,
    textAlign: "center",
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: 22,
    borderWidth: 1.5,
    borderColor: GOLD + "44",
  },

  previewCard: {
    marginTop: 28,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  previewTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  spotIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: GOLD + "22",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: GOLD + "44",
  },
  spotIconText: { fontSize: 18, fontWeight: "800", color: GOLD },
  spotName:     { fontSize: 18, fontWeight: "700", color: TEXT },
  spotMeta:     { fontSize: 13, color: MUTED, marginTop: 3 },

  joinBtn: {
    backgroundColor: GOLD,
    borderRadius: 30, paddingVertical: 15,
    alignItems: "center",
  },
  joinBtnText: { color: "#000", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },

  hint: { textAlign: "center", color: FAINT, fontSize: 14, marginTop: 20 },
});
