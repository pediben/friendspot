/**
 * Send Invite screen
 *
 * Shows an evite-style visual invite card, lets the user add a personal note,
 * share the invite, and add the event to any calendar on their device.
 */
import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Image, Share, Alert, Platform, ActivityIndicator,
  KeyboardAvoidingView, ActionSheetIOS,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/Colors";
import { useEventDetail } from "@/hooks/useEvents";

// expo-calendar is optional — installed via: npx expo install expo-calendar
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

const OCCASION_THEMES: Record<string, { emoji: string; label: string; gradients: [string, string, string, string]; accent: string }> = {
  birthday: { emoji: "🎂", label: "Birthday",  gradients: ["#4A0020", "#881337", "#BE185D", "#F472B6"], accent: "#F472B6" },
  party:    { emoji: "🎉", label: "Party",     gradients: ["#1E1040", "#3730A3", "#6D28D9", "#A78BFA"], accent: "#A78BFA" },
  dinner:   { emoji: "🍽️", label: "Dinner",    gradients: ["#3D1C02", "#92400E", "#B45309", "#F59E0B"], accent: "#F59E0B" },
  trip:     { emoji: "✈️", label: "Trip",      gradients: ["#0C1A40", "#1E3A8A", "#0369A1", "#38BDF8"], accent: "#38BDF8" },
  wedding:  { emoji: "💍", label: "Wedding",   gradients: ["#3B0764", "#7E22CE", "#A21CAF", "#E879F9"], accent: "#E879F9" },
  sports:   { emoji: "⚽", label: "Sports",    gradients: ["#052E16", "#14532D", "#15803D", "#4ADE80"], accent: "#4ADE80" },
  other:    { emoji: "📅", label: "Event",     gradients: ["#1E2B1A", "#2D4A24", "#3D6B35", "#8FA876"], accent: "#8FA876" },
};
function getTheme(occasion?: string) {
  return OCCASION_THEMES[occasion ?? "other"] ?? OCCASION_THEMES.other;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFull(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function buildInviteText(params: {
  title: string;
  date: string;
  location?: string | null;
  circle: string;
  note: string;
  eventId?: string;
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
  lines.push(`https://friendspot.online/events/${params.eventId}`);
  return lines.join("\n");
}

// ── Visual invite card ────────────────────────────────────────────────────────

function InviteCard({
  title,
  iso,
  location,
  circleName,
  note,
  photo,
  occasion,
}: {
  title: string;
  iso: string;
  location?: string | null;
  circleName: string;
  note: string;
  photo: string | null;
  occasion?: string;
}) {
  const theme = getTheme(occasion);
  return (
    <View style={card.root}>
      {/* Background: cover photo or gradient */}
      {photo ? (
        <Image source={{ uri: photo }} style={card.bg} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={theme.gradients}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={card.bg}
        />
      )}

      {/* Dark overlay for readability */}
      <View style={card.overlay} />

      {/* Card content */}
      <View style={card.content}>
        {/* Top label */}
        <View style={[card.hostBadge, { backgroundColor: theme.accent + "33", borderColor: theme.accent + "66" }]}>
          <Text style={[card.hostText, { color: theme.accent }]}>{theme.emoji}  You're invited · {theme.label}</Text>
        </View>

        {/* Event title */}
        <Text style={card.title}>{title}</Text>

        {/* Divider */}
        <View style={card.divider} />

        {/* Date & time */}
        <View style={card.metaRow}>
          <View style={[card.metaIcon, { backgroundColor: theme.accent + "33" }]}>
            <Ionicons name="calendar-outline" size={14} color={theme.accent} />
          </View>
          <View>
            <Text style={card.metaLabel}>{formatDate(iso)}</Text>
            <Text style={card.metaValue}>{formatTime(iso)}</Text>
          </View>
        </View>

        {/* Location */}
        {location ? (
          <View style={card.metaRow}>
            <View style={[card.metaIcon, { backgroundColor: theme.accent + "33" }]}>
              <Ionicons name="location-outline" size={14} color={theme.accent} />
            </View>
            <Text style={card.metaLabel} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}

        {/* Group */}
        <View style={card.metaRow}>
          <View style={[card.metaIcon, { backgroundColor: theme.accent + "33" }]}>
            <Ionicons name="people-outline" size={14} color={theme.accent} />
          </View>
          <Text style={card.metaLabel}>{circleName}</Text>
        </View>

        {/* Personal note */}
        {note.trim() ? (
          <View style={[card.noteBox, { borderLeftColor: theme.accent }]}>
            <Text style={card.noteText}>"{note.trim()}"</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={card.footer}>
          <Text style={card.footerText}>Friendspot</Text>
          <View style={[card.rsvpPill, { backgroundColor: theme.accent }]}>
            <Text style={card.rsvpText}>RSVP via app</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SendInviteScreen() {
  const { eventId, occasion } = useLocalSearchParams<{ eventId: string; occasion?: string }>();
  const insets = useSafeAreaInsets();
  const { event, loading } = useEventDetail(eventId);

  const [photo,   setPhoto]   = useState<string | null>(null);
  const [note,    setNote]    = useState("");
  const [calBusy, setCalBusy] = useState(false);
  const [calDone, setCalDone] = useState(false);

  // ── Pick cover photo ────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photo library in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  // ── Share invite ────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!event) return;
    const text = buildInviteText({
      title:    event.title,
      date:     formatFull(event.event_date),
      location: event.location,
      circle:   (event as any).circle_name ?? "your Spot",
      note,
      eventId,
    });
    try {
      await Share.share({ message: text });
    } catch (e: any) {
      console.warn("[SendInvite] share error", e.message);
    }
  };

  // ── Add to Calendar (with picker) ──────────────────────────────────────────
  const addToCalendar = async () => {
    if (!event) return;
    if (!Calendar) {
      Alert.alert(
        "Calendar not available",
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

      const allCals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writableCals = allCals.filter((c: any) => c.allowsModifications);
      if (writableCals.length === 0) throw new Error("No writable calendar found");

      const doSave = async (calId: string) => {
        const startDate = new Date(event.event_date);
        const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000);
        await Calendar.createEventAsync(calId, {
          title:    event.title,
          startDate,
          endDate,
          location: event.location ?? undefined,
          notes:    event.description ?? undefined,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        setCalDone(true);
      };

      // If only one writable calendar, save immediately
      if (writableCals.length === 1) {
        await doSave(writableCals[0].id);
        return;
      }

      // Multiple calendars — let user pick (iOS ActionSheet)
      if (Platform.OS === "ios") {
        const names = writableCals.map((c: any) => c.title);
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: "Add to which calendar?",
            options: [...names, "Cancel"],
            cancelButtonIndex: names.length,
          },
          async (idx) => {
            if (idx < writableCals.length) {
              setCalBusy(true);
              try { await doSave(writableCals[idx].id); }
              catch (e: any) { Alert.alert("Couldn't save", e.message); }
              finally { setCalBusy(false); }
            } else {
              setCalBusy(false);
            }
          }
        );
        // ActionSheet is async via callback — don't reset busy here
        return;
      } else {
        // Android: pick first writable
        await doSave(writableCals[0].id);
      }
    } catch (e: any) {
      Alert.alert("Couldn't add event", e.message);
    } finally {
      setCalBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={SAGE} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: "center", alignItems: "center", gap: 16 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
        <Text style={{ color: MUTED, fontSize: 16 }}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: SAGE, fontSize: 15, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const circleName = (event as any).circle_name ?? "your Spot";

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
        <Text style={styles.headerTitle}>Your Invite</Text>
        <TouchableOpacity onPress={handleShare} hitSlop={12}>
          <Text style={styles.shareBtn}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Visual invite card ── */}
        <InviteCard
          title={event.title}
          iso={event.event_date}
          location={event.location}
          circleName={circleName}
          note={note}
          photo={photo}
          occasion={occasion}
        />

        {/* Photo picker hint */}
        <TouchableOpacity onPress={pickPhoto} style={styles.photoHintRow} activeOpacity={0.7}>
          <Ionicons name={photo ? "image" : "image-outline"} size={16} color={SAGE} />
          <Text style={styles.photoHintText}>
            {photo ? "Change cover photo" : "Add a cover photo to the card"}
          </Text>
        </TouchableOpacity>

        {/* Personal note */}
        <Text style={styles.label}>Personal note (optional)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a message — it'll appear on the invite card…"
          placeholderTextColor={MUTED}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={200}
        />

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

// ── Styles ────────────────────────────────────────────────────────────────────

const card = StyleSheet.create({
  root:       { borderRadius: 20, overflow: "hidden", marginBottom: 4, aspectRatio: 4 / 5 },
  bg:         { ...StyleSheet.absoluteFillObject },
  overlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  content:    { flex: 1, padding: 24, justifyContent: "flex-end" },
  hostBadge:  { alignSelf: "flex-start", backgroundColor: "rgba(143,168,118,0.3)", borderWidth: 1, borderColor: "rgba(143,168,118,0.5)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  hostText:   { fontSize: 11, fontWeight: "700", color: SAGE, letterSpacing: 0.8, textTransform: "uppercase" },
  title:      { fontSize: 28, fontWeight: "900", color: "#fff", lineHeight: 34, marginBottom: 16 },
  divider:    { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 16 },
  metaRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  metaIcon:   { width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(143,168,118,0.2)", alignItems: "center", justifyContent: "center" },
  metaLabel:  { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "600", flex: 1 },
  metaValue:  { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  noteBox:    { marginTop: 8, marginBottom: 8, borderLeftWidth: 2, borderLeftColor: SAGE, paddingLeft: 12 },
  noteText:   { fontSize: 13, color: "rgba(255,255,255,0.75)", fontStyle: "italic", lineHeight: 19 },
  footer:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  footerText: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.4)", letterSpacing: 1 },
  rsvpPill:   { backgroundColor: SAGE, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  rsvpText:   { fontSize: 11, fontWeight: "700", color: "#0C0D0B", letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: BG },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle:    { fontSize: 18, fontWeight: "700", color: TEXT },
  shareBtn:       { fontSize: 16, fontWeight: "700", color: SAGE },
  content:        { padding: 16, gap: 10 },
  // Photo hint
  photoHintRow:   { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", paddingVertical: 6 },
  photoHintText:  { fontSize: 13, color: SAGE, fontWeight: "600" },
  // Note input
  label:          { fontSize: 12, fontWeight: "700", color: FAINT, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 6 },
  noteInput:      { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, minHeight: 80, textAlignVertical: "top" },
  // Buttons
  primaryBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: SAGE, borderRadius: 14, paddingVertical: 15, marginTop: 6 },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  secondaryBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: SAGE, borderRadius: 14, paddingVertical: 14 },
  secondaryBtnText:{ fontSize: 15, fontWeight: "600", color: SAGE },
});
