/**
 * Live screen — Room and Private Call across all Spots.
 */
import { useState, useEffect } from "react";
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCircles } from "@/hooks/useCircles";
import { CircleWithMembers } from "@/types/database";
import { Colors } from "@/constants/Colors";
import { LogoMark } from "@/components/ui/LogoMark";

const BG    = Colors.bg;
const TEXT  = Colors.text;
const MUTED = Colors.textMuted;
const FAINT = Colors.textFaint;
const SAGE  = Colors.sage;
const CARD  = "rgba(255,255,255,0.04)";

const PALETTE: Record<string, string> = {
  sage:   "#8FA876",
  violet: "#8B5CF6",
  teal:   "#14B8A6",
  rose:   "#F43F5E",
  blue:   "#3B82F6",
  gold:   "#C9A84C",
};

function getAccent(colorId?: string | null) {
  return PALETTE[colorId ?? "sage"] ?? SAGE;
}

export default function LiveScreen() {
  const { circles, loading } = useCircles();
  const insets = useSafeAreaInsets();
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("live_hint_dismissed").then(v => { if (v) setShowHint(false); });
  }, []);
  const dismissHint = () => { setShowHint(false); AsyncStorage.setItem("live_hint_dismissed", "1"); };

  const renderSpot = ({ item }: { item: CircleWithMembers }) => {
    const accent = getAccent(item.icon);
    const memberCount = item.members?.length ?? 0;

    return (
      <View style={[styles.card, { borderColor: `${accent}22` }]}>
        {/* Spot header */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => router.push(`/(main)/circles/${item.id}` as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.spotDot, { backgroundColor: accent }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.spotName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.spotSub}>{memberCount} member{memberCount !== 1 ? "s" : ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={FAINT} />
        </TouchableOpacity>

        {/* Voice buttons */}
        <View style={styles.btnRow}>
          {/* Open Room */}
          <TouchableOpacity
            style={styles.btnGreen}
            onPress={() => router.push(`/(main)/circles/${item.id}/room` as any)}
            activeOpacity={0.75}
          >
            <View style={styles.liveDot} />
            <Text style={[styles.btnLabel, { color: Colors.green }]}>Room</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.green} />
          </TouchableOpacity>

          {/* Private Call */}
          <TouchableOpacity
            style={[styles.btnAccent, { backgroundColor: `${accent}14`, borderColor: `${accent}33` }]}
            onPress={() => router.push(`/(main)/circles/${item.id}/private-rooms` as any)}
            activeOpacity={0.75}
          >
            <Ionicons name="lock-closed" size={13} color={accent} />
            <Text style={[styles.btnLabel, { color: accent }]}>Private</Text>
            <Ionicons name="chevron-forward" size={14} color={accent} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <LogoMark size={28} />
            <Text style={styles.heading}>Live</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.glassBtn} onPress={() => router.push("/(main)/profile" as any)}>
              <Ionicons name="person-circle-outline" size={20} color="rgba(244,245,240,0.7)" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.sub}>Join a room or start a private call</Text>
      </View>

      {showHint && (
        <TouchableOpacity style={styles.hintBanner} onPress={dismissHint} activeOpacity={0.8}>
          <Ionicons name="mic-outline" size={18} color={SAGE} />
          <Text style={styles.hintText}>
            Jump into a voice room with your Spot, or start a private call with any friend.
          </Text>
          <Text style={styles.hintClose}>✕</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator color={SAGE} style={{ marginTop: 80 }} />
      ) : circles.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.emptyTitle}>Voice rooms for your crew</Text>
          <Text style={styles.emptyBody}>
            Create a Spot and drop into a live voice room — or start a private call anytime.
          </Text>

          <Text style={styles.demoLabel}>PREVIEW</Text>

          {/* Demo card 1 */}
          <View style={[styles.card, styles.demoCard, { borderColor: "rgba(143,168,118,0.15)" }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.spotDot, { backgroundColor: SAGE }]} />
              <View style={{ flex: 1 }}>
                <View style={[styles.demoLine, { width: "50%", height: 13 }]} />
                <View style={[styles.demoLine, { width: "25%", height: 10, marginTop: 5, opacity: 0.4 }]} />
              </View>
            </View>
            <View style={styles.btnRow}>
              <View style={[styles.btnGreen, { opacity: 0.55, flex: 1 }]}>
                <View style={styles.liveDot} />
                <Text style={[styles.btnLabel, { color: Colors.green }]}>Room</Text>
              </View>
              <View style={[styles.btnAccent, { opacity: 0.45, flex: 1, backgroundColor: "rgba(143,168,118,0.14)", borderColor: "rgba(143,168,118,0.3)" }]}>
                <Ionicons name="lock-closed" size={13} color={SAGE} />
                <Text style={[styles.btnLabel, { color: SAGE }]}>Private</Text>
              </View>
            </View>
          </View>

          {/* Demo card 2 */}
          <View style={[styles.card, styles.demoCard, { borderColor: "rgba(139,92,246,0.15)" }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.spotDot, { backgroundColor: "#8B5CF6" }]} />
              <View style={{ flex: 1 }}>
                <View style={[styles.demoLine, { width: "40%", height: 13 }]} />
                <View style={[styles.demoLine, { width: "20%", height: 10, marginTop: 5, opacity: 0.4 }]} />
              </View>
            </View>
            <View style={styles.btnRow}>
              <View style={[styles.btnGreen, { opacity: 0.45, flex: 1 }]}>
                <View style={styles.liveDot} />
                <Text style={[styles.btnLabel, { color: Colors.green }]}>Room</Text>
              </View>
              <View style={[styles.btnAccent, { opacity: 0.35, flex: 1, backgroundColor: "rgba(139,92,246,0.14)", borderColor: "rgba(139,92,246,0.3)" }]}>
                <Ionicons name="lock-closed" size={13} color="#8B5CF6" />
                <Text style={[styles.btnLabel, { color: "#8B5CF6" }]}>Private</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(main)/circles")}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyBtnText}>Create a Spot</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(item) => item.id}
          renderItem={renderSpot}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  glassBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heading: { fontSize: 32, fontWeight: "800", color: TEXT, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: MUTED, marginTop: 2 },
  hintBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: "rgba(143,168,118,0.1)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.25)",
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14,
    minHeight: 64,
  },
  hintText: { flex: 1, fontSize: 13, color: MUTED, lineHeight: 19 },
  hintClose: { color: "rgba(255,255,255,0.45)", fontSize: 18, lineHeight: 18 },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },

  card: {
    backgroundColor: "#13150F",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  spotDot: { width: 10, height: 10, borderRadius: 5 },
  spotName: { fontSize: 16, fontWeight: "700", color: TEXT },
  spotSub:  { fontSize: 12, color: MUTED, marginTop: 1 },

  btnRow: { flexDirection: "row", gap: 8 },

  btnGreen: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(74,222,128,0.10)",
    borderColor: "rgba(74,222,128,0.22)",
  },
  btnAccent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  btnLabel: { flex: 1, fontSize: 14, fontWeight: "700" },
  liveDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.green,
  },

  emptyScroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120, alignItems: "center" },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: TEXT, marginBottom: 10, textAlign: "center" },
  emptyBody:  { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  demoLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.2)", letterSpacing: 1.4, marginBottom: 12, alignSelf: "flex-start" },
  demoCard: { opacity: 0.6, width: "100%" },
  demoLine: { borderRadius: 7, backgroundColor: "rgba(255,255,255,0.15)" },
  emptyBtn: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SAGE,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 28,
  },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
