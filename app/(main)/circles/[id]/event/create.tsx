/**
 * Create Event screen — title, date/time, location, description.
 * Uses text inputs for date/time to avoid native module dependencies.
 */
import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform, KeyboardAvoidingView, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useAuthStore } from "@/hooks/useAuth";
import { createEvent } from "@/hooks/useEvents";

const BG     = Colors.bg;
const CARD   = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.1)";
const TEXT   = Colors.text;
const MUTED  = Colors.textMuted;
const SAGE   = Colors.sage;
const RED    = Colors.red;

/** Parse a "MM/DD/YYYY HH:MM" string into a Date, or null if invalid */
function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const d = new Date(`${dateStr} ${timeStr}`);
  return isNaN(d.getTime()) ? null : d;
}

export default function CreateEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const me = session?.user.id ?? "";

  // Default to tomorrow at noon
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }); // MM/DD/YYYY
  const defaultTime = "12:00 PM";

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [location,    setLocation]    = useState("");
  const [dateStr,     setDateStr]     = useState(defaultDate);
  const [timeStr,     setTimeStr]     = useState(defaultTime);
  const [saving,      setSaving]      = useState(false);

  const dateError = dateStr.length > 0 && !parseDateTime(dateStr, timeStr);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Title required"); return; }
    const eventDate = parseDateTime(dateStr, timeStr);
    if (!eventDate) { Alert.alert("Invalid date/time", "Use format MM/DD/YYYY and HH:MM AM/PM"); return; }

    setSaving(true);
    try {
      const eventId = await createEvent({
        circleId:    id,
        userId:      me,
        title:       title.trim(),
        description: description.trim() || undefined,
        eventDate,
        location:    location.trim() || undefined,
      });
      router.replace(`/(main)/circles/${id}/event/${eventId}` as any);
    } catch (e: any) {
      Alert.alert("Couldn't create event", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Event</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={12}>
          {saving
            ? <ActivityIndicator color={SAGE} />
            : <Text style={styles.saveBtn}>Create</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Birthday Party 🎂"
          placeholderTextColor={MUTED}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />

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

        <Text style={styles.label}>Time</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 7:00 PM"
          placeholderTextColor={MUTED}
          value={timeStr}
          onChangeText={setTimeStr}
          maxLength={10}
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Where is it? (optional)"
          placeholderTextColor={MUTED}
          value={location}
          onChangeText={setLocation}
          maxLength={120}
        />

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT },
  saveBtn:     { fontSize: 16, fontWeight: "700", color: SAGE },
  content:     { padding: 20, gap: 6 },
  label:       { fontSize: 13, fontWeight: "600", color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  input:       { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT },
  multiline:   { minHeight: 100, textAlignVertical: "top" },
});
