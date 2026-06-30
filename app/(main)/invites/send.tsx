/**
 * Send Invite screen
 *
 * Shows event details, lets the user pick a cover photo, compose a message,
 * and share the invite. Also offers "Add to my Calendar" via expo-calendar.
 */
import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Image, Share, Alert, Platform, ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/Colors";
import { useEventDetail } from "@/hooks/useEvents";

// expo-calendar is optional — user must run: npx expo install expo-calendar
let Calendar: any = null;
try { Calendar = require("expo-calendar"); } catch {}

const BG     = Colors.bg;
const CARD   = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.1)";
const TEXT   = Colors.text;
const MUTED  = Colors.textMuted;
const FAINT  = Colors.textFaint;
const SAGE   = Colors.sage;
const GREEN  = Colors.green;

function formatFull(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function buildInviteText(params: {
  title: string;
  date: string;
  location?: string | null;
  circle: string;
  note: string;
}) {
  const lines: string[] = [
    `🎉 You're invited to ${params.title}!`,
    ``,
    `📅 ${params.date}`,
  ];
  if (params.location) lines.push(`📍 ${params.location}`);
  lines.push(`👥 ${params.circle}`);
  if (params.note.trim()) {
    lines.push(``);
    lines.push(params.note.trim());
  }
  lines.push(``);
  lines.push(`Open Friendspot to RSVP 👇`);
  lines.push(`friendspot://`);
  return lines.join("\n");
}

export default function SendInviteScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const { event, loading } = useEventDetail(eventId);

  const [photo,   setPhoto]   = useState<string | null>(null);
  const [note,    setNote]    = useState("");
  const [calBusy, setCalBusy] = useState(false);
  const [calDone, setCalDone] = useState(false);

  // ── Pick photo ──────────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photo library in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  // ── Share invite ─────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!event) return;
    const text = buildInviteText({
      title:    event.title,
      date:     formatFull(event.event_date),
      location: event.location,
      circle:   "(your Spot)",
      note,
    });
    try {
      await Share.share({ message: text });
    } catch (e: any) {
      console.warn("[SendInvite] share error", e.message);
    }
  };

  // ── Add to iOS Calendar ──────────────────────────────────────────────────────
  const addToCalendar = async () => {
    if (!event) return;
    if (!Calendar) {
      Alert.alert(
        "expo-calendar not installed",
        'Run "npx expo install expo-calendar" then rebuild the app.',
      );
      return;
    }
    setCalBusy(true);
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow calendar access in Settings.");
        setCalBusy(false);
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find((c: any) => c.allowsModifications) ?? calendars[0];
      if (!defaultCal) throw new Error("No writable calendar found");

      const startDate = new Date(event.event_date);
      const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hr

      await Calendar.createEventAsync(defaultCal.id, {
        title:    event.title,
        startDate,
        endDate,
        location: event.location ?? undefined,
        notes:    event.description ?? undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setCalDone(true);
    } catch (e: any) {
      Alert.alert("Couldn't add event", e.message);
    } finally {
      setCalBusy(false);
    }
  };

  if (loading || !event) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={SAGE} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Invite</Text>
        <TouchableOpacity onPress={handleShare} hitSlop={12}>
          <Text style={styles.shareBtn}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover photo */}
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8} style={styles.photoPicker}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.coverPhoto} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={32} color={MUTED} />
              <Text style={styles.photoHint}>Add a cover photo</Text>
              <Text style={styles.photoHintSub}>Tap to pick from your library</Text>
            </View>
          )}
          {photo && (
            <View style={styles.changePhotoOverlay}>
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={styles.changePhotoText}>Change</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Event details card */}
        <View style={styles.detailCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={SAGE} />
            <Text style={styles.metaText}>{formatFull(event.event_date)}</Text>
          </View>

          {event.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={SAGE} />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          ) : null}

          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}
        </View>

        {/* Personal note */}
        <Text style={styles.label}>Personal note (optional)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a message to your invite…"
          placeholderTextColor={MUTED}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={300}
        />

        {/* Preview */}
        <Text style={styles.label}>Invite preview</Text>
        <View style={styles.previewBox}>
          <Text style={styles.previewText}>
            {buildInviteText({
              title:    event.title,
              date:     formatFull(event.event_date),
              location: event.location,
              circle:   "your Spot",
              note,
            })}
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="send-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Share Invite</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, calDone && { borderColor: GREEN }]}
          onPress={calDone ? undefined : addToCalendar}
          activeOpacity={calDone ? 1 : 0.8}
          disabled={calBusy}
        >
          {calBusy ? (
            <ActivityIndicator color={SAGE} size="small" />
          ) : calDone ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color={GREEN} />
              <Text style={[styles.secondaryBtnText, { color: GREEN }]}>Added to Calendar</Text>
            </>
          ) : (
            <>
              <Ionicons name="calendar-outline" size={18} color={SAGE} />
              <Text style={styles.secondaryBtnText}>Add to my Calendar</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: BG },
  header:             { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle:        { fontSize: 18, fontWeight: "700", color: TEXT },
  shareBtn:           { fontSize: 16, fontWeight: "700", color: SAGE },
  content:            { padding: 20, gap: 10 },
  // Photo
  photoPicker:        { borderRadius: 16, overflow: "hidden", backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, marginBottom: 6 },
  photoPlaceholder:   { height: 180, alignItems: "center", justifyContent: "center", gap: 6 },
  coverPhoto:         { width: "100%", height: 180 },
  photoHint:          { fontSize: 15, fontWeight: "600", color: MUTED },
  photoHintSub:       { fontSize: 12, color: FAINT },
  changePhotoOverlay: { position: "absolute", bottom: 10, right: 12, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  changePhotoText:    { fontSize: 12, fontWeight: "600", color: "#fff" },
  // Event detail card
  detailCard:         { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 16, gap: 8 },
  eventTitle:         { fontSize: 20, fontWeight: "800", color: TEXT },
  metaRow:            { flexDirection: "row", alignItems: "center", gap: 7 },
  metaText:           { fontSize: 14, color: MUTED },
  description:        { fontSize: 14, color: MUTED, marginTop: 4, lineHeight: 20 },
  // Note input
  label:              { fontSize: 12, fontWeight: "700", color: FAINT, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 6 },
  noteInput:          { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, minHeight: 90, textAlignVertical: "top" },
  // Preview
  previewBox:         { backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14 },
  previewText:        { fontSize: 13, color: MUTED, lineHeight: 20 },
  // Buttons
  primaryBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: SAGE, borderRadius: 14, paddingVertical: 15, marginTop: 10 },
  primaryBtnText:     { fontSize: 16, fontWeight: "700", color: "#fff" },
  secondaryBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: SAGE, borderRadius: 14, paddingVertical: 14 },
  secondaryBtnText:   { fontSize: 15, fontWeight: "600", color: SAGE },
});
