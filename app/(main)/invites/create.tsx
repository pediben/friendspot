/**
 * Create Invite screen
 *
 * Step 1 — fill in event details + pick a Spot
 * Step 2 — creates the event, then goes to Send Invite (send.tsx)
 */
import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform, KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useAuthStore } from "@/hooks/useAuth";
import { useCircles } from "@/hooks/useCircles";
import { createEvent } from "@/hooks/useEvents";

const BG     = Colors.bg;
const CARD   = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.1)";
const TEXT   = Colors.text;
const MUTED  = Colors.textMuted;
const FAINT  = Colors.textFaint;
const SAGE   = Colors.sage;
const RED    = Colors.red;

function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const dateParts = dateStr.split("/").map(Number);
  if (dateParts.length !== 3 || dateParts.some(isNaN)) return null;
  const [month, day, year] = dateParts;
  const timeParts = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeParts) return null;
  let hour = parseInt(timeParts[1]);
  const minute = parseInt(timeParts[2]);
  const ampm = timeParts[3].toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const d = new Date(year, month - 1, day, hour, minute);
  return isNaN(d.getTime()) ? null : d;
}

export default function CreateInviteScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const me = session?.user.id ?? "";
  const { circles } = useCircles();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");
  const yyyy = tomorrow.getFullYear();
  const defaultDate = `${mm}/${dd}/${yyyy}`;

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [location,    setLocation]    = useState("");
  const [dateStr,     setDateStr]     = useState(defaultDate);
  const [timeStr,     setTimeStr]     = useState("12:00 PM");
  const [spotId,      setSpotId]      = useState<string | null>(circles[0]?.id ?? null);
  const [saving,      setSaving]      = useState(false);

  const dateError = dateStr.length > 0 && !parseDateTime(dateStr, timeStr);

  const handleCreate = async () => {
    if (saving) return; // guard against double-tap
    if (!title.trim()) { Alert.alert("Title required"); return; }
    if (!spotId)        { Alert.alert("Pick a Spot"); return; }
    const eventDate = parseDateTime(dateStr, timeStr);
    if (!eventDate) { Alert.alert("Invalid date/time", "Use MM/DD/YYYY and e.g. 7:00 PM"); return; }
    if (eventDate < new Date()) {
      Alert.alert("Date is in the past", "Please choose a future date for your event.");
      return;
    }

    setSaving(true);
    try {
      const eventId = await createEvent({
        circleId:    spotId,
        userId:      me,
        title:       title.trim(),
        description: description.trim() || undefined,
        eventDate,
        location:    location.trim() || undefined,
      });
      // Go straight to the invite compose screen
      router.replace({ pathname: "/(main)/invites/send", params: { eventId } } as any);
    } catch (e: any) {
      Alert.alert("Couldn't create invite", e.message);
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={styles.headerTitle}>New Invite</Text>
        <TouchableOpacity onPress={handleCreate} disabled={saving} hitSlop={12}>
          {saving
            ? <ActivityIndicator color={SAGE} />
            : <Text style={styles.nextBtn}>Next →</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Spot picker */}
        <Text style={styles.label}>Which Spot? *</Text>
        <Text style={styles.labelSub}>Pick the group of friends you're inviting</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spotScroll}>
          {circles.map(c => {
            const selected = c.id === spotId;
            const memberCount = (c as any).member_count ?? 0;
            const memberLabel = memberCount <= 1 ? "Just you" : `${memberCount} members`;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.spotChip, selected && styles.spotChipSelected]}
                onPress={() => setSpotId(c.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.spotIcon}>{c.icon?.startsWith("http") ? "📍" : (c.icon ?? "📍")}</Text>
                <Text style={[styles.spotName, selected && { color: TEXT }]} numberOfLines={1}>{c.name}</Text>
                <Text style={[styles.spotMeta, selected && { color: SAGE }]}>{memberLabel}</Text>
              </TouchableOpacity>
            );
          })}
          {/* Create new Spot */}
          <TouchableOpacity
            style={styles.newSpotChip}
            onPress={() => router.push("/(main)/circles" as any)}
            activeOpacity={0.75}
          >
            <Ionicons name="add-circle-outline" size={22} color={SAGE} />
            <Text style={styles.newSpotText}>New Spot</Text>
            <Text style={styles.spotMeta}>Create group</Text>
          </TouchableOpacity>
        </ScrollView>
        {circles.length === 0 && (
          <Text style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>
            No Spots yet — tap "New Spot" to create your first group
          </Text>
        )}

        {/* Title */}
        <Text style={styles.label}>Event name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Type your event name…"
          placeholderTextColor={MUTED}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={[styles.input, dateError && { borderColor: RED }]}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={MUTED}
          value={dateStr}
          onChangeText={setDateStr}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />

        {/* Time */}
        <Text style={styles.label}>Time</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 7:00 PM"
          placeholderTextColor={MUTED}
          value={timeStr}
          onChangeText={setTimeStr}
          maxLength={10}
        />

        {/* Location */}
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Where is it? (optional)"
          placeholderTextColor={MUTED}
          value={location}
          onChangeText={setLocation}
          maxLength={120}
        />

        {/* Description */}
        <Text style={styles.label}>Details</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Any extra info for your guests… (optional)"
          placeholderTextColor={MUTED}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
        />

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={saving} activeOpacity={0.8}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Create & Compose Invite</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle:    { fontSize: 18, fontWeight: "700", color: TEXT },
  nextBtn:        { fontSize: 16, fontWeight: "700", color: SAGE },
  content:        { padding: 20, gap: 6 },
  label:          { fontSize: 12, fontWeight: "700", color: FAINT, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 16, marginBottom: 6 },
  input:          { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT },
  multiline:      { minHeight: 100, textAlignVertical: "top" },
  // Spot picker
  labelSub:       { fontSize: 12, color: FAINT, marginTop: -6, marginBottom: 8 },
  spotScroll:     { marginBottom: 4 },
  spotChip:       { flexDirection: "column", alignItems: "center", gap: 3, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, marginRight: 8, minWidth: 80, maxWidth: 100 },
  spotChipSelected: { borderColor: SAGE, backgroundColor: "rgba(143,168,118,0.15)" },
  spotIcon:       { fontSize: 22, marginBottom: 2 },
  spotName:       { fontSize: 13, fontWeight: "700", color: MUTED, textAlign: "center" },
  spotMeta:       { fontSize: 11, color: FAINT, textAlign: "center" },
  newSpotChip:    { flexDirection: "column", alignItems: "center", gap: 3, borderWidth: 1.5, borderColor: SAGE, borderStyle: "dashed", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, marginRight: 8, minWidth: 80, justifyContent: "center" },
  newSpotText:    { fontSize: 13, fontWeight: "700", color: SAGE, textAlign: "center" },
  // Button
  createBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: SAGE, borderRadius: 14, paddingVertical: 15, marginTop: 24 },
  createBtnText:  { fontSize: 16, fontWeight: "700", color: "#fff" },
});
