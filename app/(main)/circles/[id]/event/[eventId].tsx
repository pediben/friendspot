/**
 * Event detail screen — shows event info, RSVP buttons, and full guest list.
 */
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Share, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useAuthStore } from "@/hooks/useAuth";
import { useEventDetail, submitRsvp, RsvpStatus, RsvpGuest } from "@/hooks/useEvents";
import { Avatar } from "@/components/ui/Avatar";

const BG    = Colors.bg;
const CARD  = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT  = Colors.text;
const MUTED = Colors.textMuted;
const FAINT = Colors.textFaint;
const SAGE  = Colors.sage;
const GREEN = Colors.green;
const ORANGE = Colors.orange;
const RED   = Colors.red;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function GuestSection({ title, guests, color }: { title: string; guests: RsvpGuest[]; color: string }) {
  if (!guests.length) return null;
  return (
    <View style={styles.guestSection}>
      <Text style={[styles.guestHeading, { color }]}>{title} ({guests.length})</Text>
      {guests.map(g => (
        <View key={g.user_id} style={styles.guestRow}>
          <Avatar uri={g.avatar_url} name={g.display_name} size={32} />
          <Text style={styles.guestName}>{g.display_name}</Text>
        </View>
      ))}
    </View>
  );
}

export default function EventDetailScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const me = session?.user.id ?? "";

  const { event, guests, loading, refresh } = useEventDetail(eventId);

  const going    = guests.filter(g => g.status === "going");
  const maybe    = guests.filter(g => g.status === "maybe");
  const cantGo   = guests.filter(g => g.status === "cant_go");
  const myRsvp   = event?.my_rsvp ?? null;

  const handleRsvp = async (status: RsvpStatus) => {
    try {
      await submitRsvp(eventId, me, status);
      refresh();
    } catch (e: any) {
      Alert.alert("Couldn't save RSVP", e.message);
    }
  };

  const handleShare = () => {
    if (!event) return;
    const dateStr = formatDate(event.event_date);
    const locationStr = event.location ? `\n📍 ${event.location}` : "";
    Share.share({
      message: `You're invited to ${event.title}!\n📅 ${dateStr}${locationStr}\n\nJoin us on Friendspot: https://friendspot.app/join/${id}`,
    });
  };

  if (loading || !event) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={SAGE} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
        <TouchableOpacity onPress={handleShare} hitSlop={12}>
          <Ionicons name="share-outline" size={24} color={SAGE} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>

        {/* Event info card */}
        <View style={styles.infoCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={15} color={SAGE} />
            <Text style={styles.metaText}>{formatDate(event.event_date)}</Text>
          </View>

          {event.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={15} color={SAGE} />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          ) : null}

          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}
        </View>

        {/* RSVP buttons */}
        <Text style={styles.sectionLabel}>Will you be there?</Text>
        <View style={styles.rsvpRow}>
          <RsvpButton
            label="✅ Going"
            active={myRsvp === "going"}
            activeColor={GREEN}
            onPress={() => handleRsvp("going")}
          />
          <RsvpButton
            label="🤔 Maybe"
            active={myRsvp === "maybe"}
            activeColor={ORANGE}
            onPress={() => handleRsvp("maybe")}
          />
          <RsvpButton
            label="❌ Can't go"
            active={myRsvp === "cant_go"}
            activeColor={RED}
            onPress={() => handleRsvp("cant_go")}
          />
        </View>

        {/* Share invite */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={18} color={SAGE} />
          <Text style={styles.shareBtnText}>Invite friends via WhatsApp / iMessage</Text>
        </TouchableOpacity>

        {/* Guest list */}
        <Text style={styles.sectionLabel}>Guests</Text>
        {!guests.length ? (
          <Text style={styles.noGuests}>No RSVPs yet — be the first!</Text>
        ) : (
          <>
            <GuestSection title="Going"    guests={going}  color={GREEN}  />
            <GuestSection title="Maybe"    guests={maybe}  color={ORANGE} />
            <GuestSection title="Can't go" guests={cantGo} color={RED}    />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RsvpButton({ label, active, activeColor, onPress }: {
  label: string; active: boolean; activeColor: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.rsvpBtn, active && { borderColor: activeColor, backgroundColor: `${activeColor}18` }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.rsvpBtnText, active && { color: activeColor, fontWeight: "700" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle:  { fontSize: 17, fontWeight: "700", color: TEXT, flex: 1, marginHorizontal: 12 },
  content:      { padding: 16 },
  infoCard:     { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 18, marginBottom: 20 },
  eventTitle:   { fontSize: 22, fontWeight: "800", color: TEXT, marginBottom: 12 },
  metaRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  metaText:     { fontSize: 14, color: MUTED, flex: 1 },
  description:  { fontSize: 14, color: MUTED, marginTop: 10, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: FAINT, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  rsvpRow:      { flexDirection: "row", gap: 8, marginBottom: 14 },
  rsvpBtn:      { flex: 1, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  rsvpBtnText:  { fontSize: 13, color: MUTED, fontWeight: "500" },
  shareBtn:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14, marginBottom: 20 },
  shareBtnText: { fontSize: 14, color: SAGE, fontWeight: "600" },
  guestSection: { marginBottom: 14 },
  guestHeading: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  guestRow:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  guestName:    { fontSize: 15, color: TEXT },
  noGuests:     { fontSize: 14, color: FAINT, textAlign: "center", marginTop: 12 },
});
