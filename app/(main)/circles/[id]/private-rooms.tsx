/**
 * Private Rooms Landing Screen
 *
 * Shows active private rooms for this circle and provides two entry points:
 *   - "Create private room" → /private-room/create
 *   - "Join with a code"   → /private-room/join
 *
 * Private rooms are hidden from users outside the circle via RLS.
 * Tapping an active room goes to join.tsx for the code/passcode step.
 *
 * Room modes explained clearly in the UI:
 *   Standard  — passcode-protected, TLS only (like a normal call)
 *   Encrypted — E2EE, passphrase is the key, server is blind
 */

import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { CirclePrivateRoom } from "@/types/database";
import { Colors } from "@/constants/Colors";

export default function PrivateRoomsScreen() {
  const { id: circleId } = useLocalSearchParams<{ id: string }>();

  const [rooms, setRooms]       = useState<CirclePrivateRoom[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data } = await supabase
      .from("circle_private_rooms")
      .select("*")
      .eq("circle_id", circleId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    setRooms((data as CirclePrivateRoom[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [circleId]);

  // Refresh list when navigating back to this screen
  useFocusEffect(useCallback(() => { fetchRooms(); }, [fetchRooms]));

  const renderRoom = ({ item }: { item: CirclePrivateRoom }) => {
    const isEncrypted = item.room_mode === "encrypted";
    const displayCode = item.room_code.replace(/(.{4})(?=.)/g, "$1-");

    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={() =>
          router.push({
            pathname: "/(main)/circles/[id]/private-room/join" as any,
            params: { id: circleId },
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.roomIcon}>
          <Ionicons
            name={isEncrypted ? "lock-closed" : "shield-checkmark"}
            size={22}
            color={isEncrypted ? Colors.purple : Colors.green}
          />
        </View>

        <View style={styles.roomInfo}>
          <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.roomMeta}>
            <View style={[styles.modePill, isEncrypted ? styles.modePillEncrypted : styles.modePillStandard]}>
              <Text style={[styles.modePillText, isEncrypted ? styles.modePillTextEncrypted : styles.modePillTextStandard]}>
                {isEncrypted ? "E2E Encrypted" : "Standard"}
              </Text>
            </View>
            <Text style={styles.roomCode}>{displayCode}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Private Rooms</Text>
      </View>

      {/* Explainer card */}
      <View style={styles.explainerCard}>
        <Text style={styles.explainerTitle}>How private rooms work</Text>
        <View style={styles.modeRow}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.modeTitle}>Standard</Text>
            <Text style={styles.modeDesc}>
              Protected by a 6-digit passcode. Uses TLS — the same security as a normal
              phone call. Friendspot servers can see connection metadata.
            </Text>
          </View>
        </View>
        <View style={styles.modeRow}>
          <Ionicons name="lock-closed" size={18} color={Colors.purple} />
          <View style={{ flex: 1 }}>
            <Text style={styles.modeTitle}>End-to-End Encrypted</Text>
            <Text style={styles.modeDesc}>
              The passphrase is your encryption key. Our servers are completely blind to
              your audio. Share the passphrase privately with each participant.
            </Text>
          </View>
        </View>
      </View>

      {/* Active rooms */}
      {loading ? (
        <ActivityIndicator color={Colors.purple} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          renderItem={renderRoom}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRooms(true)}
              tintColor={Colors.purple}
            />
          }
          ListHeaderComponent={
            rooms.length > 0 ? (
              <Text style={styles.sectionTitle}>Active rooms</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔒</Text>
              <Text style={styles.emptyText}>No active private rooms in this circle.</Text>
              <Text style={styles.emptyHint}>Create one or ask someone for a room code.</Text>
            </View>
          }
          contentContainerStyle={{ padding: 20 }}
        />
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnCreate]}
          onPress={() =>
            router.push({
              pathname: "/(main)/circles/[id]/private-room/create" as any,
              params: { id: circleId },
            })
          }
        >
          <Ionicons name="add-circle" size={20} color={Colors.text} />
          <Text style={styles.actionBtnText}>Create a room</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnJoin]}
          onPress={() =>
            router.push({
              pathname: "/(main)/circles/[id]/private-room/join" as any,
              params: { id: circleId },
            })
          }
        >
          <Ionicons name="enter-outline" size={20} color={Colors.purple} />
          <Text style={[styles.actionBtnText, { color: Colors.purple }]}>Join with code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },

  // Explainer card
  explainerCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  explainerTitle: { fontSize: 13, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  modeRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  modeTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  modeDesc: { fontSize: 13, color: Colors.textFaint, lineHeight: 18 },

  // Room list
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  roomInfo: { flex: 1, gap: 4 },
  roomName: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  roomMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  modePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modePillStandard: { backgroundColor: "rgba(74,222,128,0.12)" },
  modePillEncrypted: { backgroundColor: "rgba(124,58,237,0.12)" },
  modePillText: { fontSize: 11, fontWeight: "600" },
  modePillTextStandard: { color: Colors.green },
  modePillTextEncrypted: { color: Colors.purple },
  roomCode: { color: Colors.textFaint, fontSize: 12, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },

  // Empty
  empty: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: Colors.text, fontSize: 16, fontWeight: "600", textAlign: "center" },
  emptyHint: { color: Colors.textMuted, fontSize: 14, textAlign: "center" },

  // Action buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.bgCardBorder,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnCreate: { backgroundColor: Colors.purple },
  actionBtnJoin: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderWidth: 1,
    borderColor: Colors.purple,
  },
  actionBtnText: { color: Colors.text, fontWeight: "700", fontSize: 14 },
});

// Platform needed for monospace font
import { Platform } from "react-native";
