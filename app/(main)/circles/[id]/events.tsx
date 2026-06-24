/**
 * Events list screen — all upcoming (and past) events for a Spot.
 */
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useEvents, SpotEvent } from "@/hooks/useEvents";

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
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function EventCard({ event, circleId }: { event: SpotEvent; circleId: string }) {
  const isPast = new Date(event.event_date) < new Date();
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/(main)/circles/${circleId}/event/${event.id}` as any)}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, isPast && { opacity: 0.5 }]}>{event.title}</Text>
        {event.my_rsvp === "going"   && <Text style={[styles.badge, { color: GREEN  }]}>Going ✓</Text>}
        {event.my_rsvp === "maybe"   && <Text style={[styles.badge, { color: ORANGE }]}>Maybe</Text>}
        {event.my_rsvp === "cant_go" && <Text style={[styles.badge, { color: RED    }]}>Can't go</Text>}
        {!event.my_rsvp             && !isPast && <Text style={[styles.badge, { color: FAINT }]}>RSVP</Text>}
      </View>

      <View style={styles.cardMeta}>
        <Ionicons name="calendar-outline" size={13} color={MUTED} />
        <Text style={styles.metaText}>{formatDate(event.event_date)}</Text>
      </View>

      {event.location ? (
        <View style={styles.cardMeta}>
          <Ionicons name="location-outline" size={13} color={MUTED} />
          <Text style={styles.metaText}>{event.location}</Text>
        </View>
      ) : null}

      <View style={styles.counts}>
        <Text style={styles.countText}>✅ {event.going_count ?? 0} going</Text>
        <Text style={styles.countText}>🤔 {event.maybe_count ?? 0} maybe</Text>
        <Text style={styles.countText}>❌ {event.cant_go_count ?? 0} can't go</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function EventsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { events, loading, refresh } = useEvents(id);

  const upcoming = events.filter(e => new Date(e.event_date) >= new Date());
  const past     = events.filter(e => new Date(e.event_date) <  new Date());

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity
          onPress={() => router.push(`/(main)/circles/${id}/event/create` as any)}
          hitSlop={12}
        >
          <Ionicons name="add" size={28} color={SAGE} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={SAGE} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[
            ...(upcoming.length ? [{ type: "header", label: "Upcoming" } as any] : []),
            ...upcoming.map(e => ({ type: "event", event: e })),
            ...(past.length     ? [{ type: "header", label: "Past"     } as any] : []),
            ...past.map(e     => ({ type: "event", event: e })),
          ]}
          keyExtractor={(item, i) => item.type === "event" ? item.event.id : `h-${i}`}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          onRefresh={refresh}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyBody}>Tap + to plan something fun</Text>
            </View>
          }
          renderItem={({ item }) =>
            item.type === "header" ? (
              <Text style={styles.sectionLabel}>{item.label}</Text>
            ) : (
              <EventCard event={item.event} circleId={id} />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT },
  sectionLabel:{ fontSize: 12, fontWeight: "700", color: FAINT, textTransform: "uppercase", letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  card:        { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle:   { fontSize: 16, fontWeight: "700", color: TEXT, flex: 1, marginRight: 8 },
  badge:       { fontSize: 13, fontWeight: "600" },
  cardMeta:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  metaText:    { fontSize: 13, color: MUTED },
  counts:      { flexDirection: "row", gap: 14, marginTop: 10 },
  countText:   { fontSize: 12, color: MUTED },
  empty:       { alignItems: "center", marginTop: 80 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { fontSize: 18, fontWeight: "700", color: TEXT, marginBottom: 6 },
  emptyBody:   { fontSize: 14, color: MUTED },
});
