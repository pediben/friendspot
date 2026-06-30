/**
 * Invite tab — month calendar + upcoming events across all Spots.
 * Tap an event → send an invite for it.
 */
import { useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useAllEvents, AllEvent } from "@/hooks/useAllEvents";

const BG      = Colors.bg;
const CARD    = "rgba(255,255,255,0.04)";
const BORDER  = "rgba(255,255,255,0.08)";
const TEXT    = Colors.text;
const MUTED   = Colors.textMuted;
const FAINT   = Colors.textFaint;
const SAGE    = Colors.sage;
const GREEN   = Colors.green;
const ORANGE  = Colors.orange;
const RED_C   = Colors.red;

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ── Mini calendar ────────────────────────────────────────────────────────────

interface CalendarProps {
  year: number;
  month: number; // 0-indexed
  eventDays: Set<string>;
  selectedKey: string | null;
  onSelectDay: (key: string, date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

function MiniCalendar({ year, month, eventDays, selectedKey, onSelectDay, onPrev, onNext }: CalendarProps) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={cal.wrap}>
      {/* Month header */}
      <View style={cal.header}>
        <TouchableOpacity onPress={onPrev} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <Text style={cal.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={onNext} hitSlop={12}>
          <Ionicons name="chevron-forward" size={20} color={TEXT} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week row */}
      <View style={cal.row}>
        {DAYS_OF_WEEK.map(d => (
          <Text key={d} style={cal.dowLabel}>{d}</Text>
        ))}
      </View>

      {/* Day cells */}
      {Array.from({ length: cells.length / 7 }, (_, wi) => (
        <View key={wi} style={cal.row}>
          {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
            if (!day) return <View key={di} style={cal.cell} />;
            const key = `${year}-${month}-${day}`;
            const isToday    = key === todayKey;
            const isSelected = key === selectedKey;
            const hasEvent   = eventDays.has(key);
            return (
              <TouchableOpacity
                key={di}
                style={[cal.cell, isSelected && cal.cellSelected, isToday && !isSelected && cal.cellToday]}
                onPress={() => onSelectDay(key, new Date(year, month, day))}
                activeOpacity={0.7}
              >
                <Text style={[cal.dayNum, isSelected && cal.dayNumSelected, isToday && !isSelected && { color: SAGE }]}>
                  {day}
                </Text>
                {hasEvent && <View style={[cal.dot, isSelected && { backgroundColor: "#fff" }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const cal = StyleSheet.create({
  wrap:           { backgroundColor: CARD, borderRadius: 18, padding: 16, marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderColor: BORDER },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthLabel:     { fontSize: 16, fontWeight: "700", color: TEXT },
  row:            { flexDirection: "row" },
  dowLabel:       { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", color: FAINT, marginBottom: 6, textTransform: "uppercase" },
  cell:           { flex: 1, alignItems: "center", paddingVertical: 5, borderRadius: 8 },
  cellSelected:   { backgroundColor: SAGE },
  cellToday:      { borderWidth: 1, borderColor: SAGE, borderRadius: 8 },
  dayNum:         { fontSize: 13, color: TEXT },
  dayNumSelected: { color: "#fff", fontWeight: "700" },
  dot:            { width: 4, height: 4, borderRadius: 2, backgroundColor: SAGE, marginTop: 2 },
});

// ── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: AllEvent }) {
  const isPast = new Date(event.event_date) < new Date();
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: "/(main)/invites/send", params: { eventId: event.id } } as any)}
    >
      <View style={styles.cardRow}>
        <Text style={styles.circleIcon}>{event.circle_icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, isPast && { opacity: 0.45 }]}>{event.title}</Text>
          <Text style={styles.circleName}>{event.circle_name}</Text>
        </View>
        <View style={styles.inviteBtn}>
          <Ionicons name="send-outline" size={14} color={SAGE} />
          <Text style={styles.inviteBtnText}>Invite</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={12} color={MUTED} />
        <Text style={styles.metaText}>{formatEventDate(event.event_date)}</Text>
      </View>

      {event.location ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={MUTED} />
          <Text style={styles.metaText}>{event.location}</Text>
        </View>
      ) : null}

      <View style={styles.rsvpRow}>
        {event.my_rsvp === "going"   && <Text style={[styles.rsvpBadge, { color: GREEN  }]}>You're going ✓</Text>}
        {event.my_rsvp === "maybe"   && <Text style={[styles.rsvpBadge, { color: ORANGE }]}>Maybe</Text>}
        {event.my_rsvp === "cant_go" && <Text style={[styles.rsvpBadge, { color: RED_C  }]}>Can't go</Text>}
        {!event.my_rsvp && !isPast   && <Text style={[styles.rsvpBadge, { color: FAINT  }]}>Not RSVPed</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function InvitesScreen() {
  const insets = useSafeAreaInsets();
  const { events, loading, refresh } = useAllEvents();

  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Build set of day-keys that have events (for calendar dots)
  const eventDays = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    events.forEach(e => {
      const d = new Date(e.event_date);
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [events]);

  // Filtered events: if a day is selected show that day only, else show all upcoming
  const displayEvents = useMemo(() => {
    const now = new Date();
    if (!selectedKey) {
      return events.filter(e => new Date(e.event_date) >= now);
    }
    return events.filter(e => {
      const d = new Date(e.event_date);
      return toDateKey(d) === selectedKey;
    });
  }, [events, selectedKey]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedKey(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedKey(null);
  };

  const onSelectDay = (key: string, _date?: Date) => {
    setSelectedKey(prev => prev === key ? null : key);
  };

  const sectionLabel = selectedKey
    ? (() => {
        const [y, m, d] = selectedKey.split("-").map(Number);
        return new Date(y, m, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      })()
    : "Upcoming Events";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invite</Text>
        <TouchableOpacity
          onPress={() => router.push("/(main)/invites/create" as any)}
          hitSlop={12}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={SAGE} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayEvents}
        keyExtractor={item => item.id}
        onRefresh={refresh}
        refreshing={loading}
        ListHeaderComponent={
          <View>
            <MiniCalendar
              year={calYear}
              month={calMonth}
              eventDays={eventDays}
              selectedKey={selectedKey}
              onSelectDay={onSelectDay}
              onPrev={prevMonth}
              onNext={nextMonth}
            />
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>{sectionLabel}</Text>
              {selectedKey && (
                <TouchableOpacity onPress={() => setSelectedKey(null)} hitSlop={10}>
                  <Text style={styles.clearBtn}>Show all</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={SAGE} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>No events here</Text>
              <Text style={styles.emptyBody}>
                {selectedKey ? "Nothing planned on this day" : "Create an event in one of your Spots"}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <EventCard event={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle:   { fontSize: 24, fontWeight: "800", color: TEXT },
  addBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(143,168,118,0.15)", alignItems: "center", justifyContent: "center" },
  sectionRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  sectionLabel:  { fontSize: 13, fontWeight: "700", color: FAINT, textTransform: "uppercase", letterSpacing: 0.8 },
  clearBtn:      { fontSize: 13, color: SAGE, fontWeight: "600" },
  // Event card
  card:          { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  cardRow:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  circleIcon:    { fontSize: 22 },
  cardTitle:     { fontSize: 15, fontWeight: "700", color: TEXT },
  circleName:    { fontSize: 12, color: MUTED, marginTop: 1 },
  inviteBtn:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(143,168,118,0.15)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  inviteBtnText: { fontSize: 12, fontWeight: "700", color: SAGE },
  metaRow:       { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  metaText:      { fontSize: 12, color: MUTED },
  rsvpRow:       { marginTop: 6 },
  rsvpBadge:     { fontSize: 12, fontWeight: "600" },
  // Empty
  empty:         { alignItems: "center", marginTop: 60 },
  emptyIcon:     { fontSize: 42, marginBottom: 10 },
  emptyTitle:    { fontSize: 17, fontWeight: "700", color: TEXT, marginBottom: 4 },
  emptyBody:     { fontSize: 14, color: MUTED, textAlign: "center", paddingHorizontal: 32 },
});
