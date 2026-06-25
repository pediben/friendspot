/**
 * MomentDetailScreen — Invitation-first design.
 *
 * Primary view: RSVP summary + guest list with notes.
 * Secondary: Album (post-event photos), Secret planning (organizers only).
 */
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getSignedUrl } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Moment, Photo } from "@/types/database";
import { Colors } from "@/constants/Colors";
import { Avatar } from "@/components/ui/Avatar";

// ─── Design tokens ───────────────────────────────────────────────
const BG     = "#0C0D0B";
const CARD   = "#13150F";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT   = "#F4F5F0";
const MUTED  = "rgba(244,245,240,0.5)";
const FAINT  = "rgba(244,245,240,0.18)";
const SAGE   = "#8FA876";

type Tab = "guests" | "album" | "planning";

type Attendee = {
  user_id: string;
  rsvp_status: "invited" | "going" | "maybe" | "declined";
  note?: string | null;
  user?: { display_name: string; avatar_url: string | null };
};

export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [moment, setMoment]         = useState<Moment | null>(null);
  const [attendees, setAttendees]   = useState<Attendee[]>([]);
  const [photos, setPhotos]         = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls]   = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<Tab>("guests");
  const [isPlanner, setIsPlanner]   = useState(false);
  const [myNote, setMyNote]         = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const myAttendee = attendees.find(a => a.user_id === userId);
  const myRsvp = myAttendee?.rsvp_status ?? null;

  const going    = attendees.filter(a => a.rsvp_status === "going");
  const declined = attendees.filter(a => a.rsvp_status === "declined");
  const pending  = attendees.filter(a => a.rsvp_status === "invited" || a.rsvp_status === "maybe");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    const [momentRes, attendeesRes, photosRes, plannerRes] = await Promise.all([
      supabase.from("moments").select("*").eq("id", id).single(),
      supabase.from("moment_attendees").select("*, user:profiles(*)").eq("moment_id", id),
      supabase.from("photos").select("*").eq("moment_id", id).order("created_at"),
      supabase.from("moment_attendees").select("user_id").eq("moment_id", id).eq("user_id", userId ?? ""),
    ]);

    setMoment(momentRes.data);
    const fetched = (attendeesRes.data ?? []) as Attendee[];
    setAttendees(fetched);

    const me = fetched.find(a => a.user_id === userId);
    if (me?.note) setMyNote(me.note);

    setIsPlanner((plannerRes.data ?? []).length > 0);

    // Load photos
    const fetchedPhotos = (photosRes.data ?? []) as Photo[];
    setPhotos(fetchedPhotos);
    const urlMap: Record<string, string> = {};
    await Promise.all(fetchedPhotos.map(async (p) => {
      const url = await getSignedUrl("photos", p.image_url);
      if (url) urlMap[p.id] = url;
    }));
    setPhotoUrls(urlMap);

    setLoading(false);
  };

  const setRsvp = async (status: "going" | "declined") => {
    if (!userId) return;
    setRsvpLoading(true);
    if (myAttendee) {
      await supabase.from("moment_attendees")
        .update({ rsvp_status: status })
        .eq("moment_id", id).eq("user_id", userId);
    } else {
      await supabase.from("moment_attendees")
        .insert({ moment_id: id, user_id: userId, rsvp_status: status });
    }
    setRsvpLoading(false);
    load();
  };

  const saveNote = async () => {
    if (!userId || !myNote.trim()) return;
    setSavingNote(true);
    await supabase.from("moment_attendees")
      .update({ note: myNote.trim() } as any)
      .eq("moment_id", id).eq("user_id", userId);
    setSavingNote(false);
    load();
  };

  const addPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;

    for (const asset of result.assets) {
      const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      const fileName = `${id}/${Date.now()}.${ext}`;
      const storagePath = `${userId!}/${fileName}`;

      const form = new FormData();
      form.append("file", { uri: asset.uri, type: mime, name: fileName } as any);

      const { error } = await supabase.storage
        .from("photos")
        .upload(storagePath, form as any, { contentType: mime, upsert: false });

      if (!error) {
        await supabase.from("photos").insert({
          moment_id: id, uploader_id: userId!, image_url: storagePath,
        });
      }
    }
    load();
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={SAGE} />
      </View>
    );
  }

  const dateStr = formatDate(moment?.event_date ?? null);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {isPlanner && (
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setActiveTab("planning")}>
              <Ionicons name="lock-closed-outline" size={18} color={SAGE} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setActiveTab("album")}>
            <Ionicons name="images-outline" size={18} color={MUTED} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Guests / Invitation tab (primary) ── */}
      {activeTab === "guests" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Event hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{moment?.title ?? "Moment"}</Text>
            {dateStr && (
              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={13} color={SAGE} />
                <Text style={styles.datePillText}>{dateStr}</Text>
              </View>
            )}
          </View>

          {/* RSVP counts */}
          <View style={styles.countsRow}>
            <View style={styles.countBox}>
              <Text style={[styles.countNum, { color: Colors.green }]}>{going.length}</Text>
              <Text style={styles.countLabel}>Going</Text>
            </View>
            <View style={styles.countDivider} />
            <View style={styles.countBox}>
              <Text style={[styles.countNum, { color: "#FCA5A5" }]}>{declined.length}</Text>
              <Text style={styles.countLabel}>Can't make it</Text>
            </View>
            <View style={styles.countDivider} />
            <View style={styles.countBox}>
              <Text style={[styles.countNum, { color: MUTED }]}>{pending.length}</Text>
              <Text style={styles.countLabel}>Pending</Text>
            </View>
          </View>

          {/* My RSVP buttons */}
          <View style={styles.rsvpSection}>
            <Text style={styles.rsvpPrompt}>Are you going?</Text>
            <View style={styles.rsvpBtns}>
              <TouchableOpacity
                style={[styles.rsvpBtn, myRsvp === "going" && styles.rsvpBtnGoing]}
                onPress={() => setRsvp("going")}
                disabled={rsvpLoading}
                activeOpacity={0.75}
              >
                {myRsvp === "going" ? (
                  <LinearGradient colors={["rgba(74,222,128,0.3)", "rgba(74,222,128,0.15)"]} style={styles.rsvpBtnInner}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
                    <Text style={[styles.rsvpBtnText, { color: Colors.green }]}>I'm going!</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.rsvpBtnInner}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={MUTED} />
                    <Text style={styles.rsvpBtnText}>I'm going</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rsvpBtn, myRsvp === "declined" && styles.rsvpBtnDeclined]}
                onPress={() => setRsvp("declined")}
                disabled={rsvpLoading}
                activeOpacity={0.75}
              >
                {myRsvp === "declined" ? (
                  <LinearGradient colors={["rgba(248,113,113,0.2)", "rgba(248,113,113,0.08)"]} style={styles.rsvpBtnInner}>
                    <Ionicons name="close-circle" size={20} color="#FCA5A5" />
                    <Text style={[styles.rsvpBtnText, { color: "#FCA5A5" }]}>Can't make it</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.rsvpBtnInner}>
                    <Ionicons name="close-circle-outline" size={20} color={MUTED} />
                    <Text style={styles.rsvpBtnText}>Can't make it</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* My note */}
            {myRsvp && (
              <View style={styles.noteBox}>
                <TextInput
                  style={styles.noteInput}
                  placeholder={myRsvp === "going" ? "Leave a message for the group..." : "Let them know..."}
                  placeholderTextColor={FAINT}
                  value={myNote}
                  onChangeText={setMyNote}
                  multiline
                  maxLength={140}
                />
                {myNote.trim().length > 0 && (
                  <TouchableOpacity style={styles.noteSaveBtn} onPress={saveNote} disabled={savingNote}>
                    {savingNote
                      ? <ActivityIndicator size="small" color={SAGE} />
                      : <Text style={styles.noteSaveBtnText}>Save</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Guest list */}
          {attendees.length > 0 && (
            <View style={styles.guestList}>
              <Text style={styles.guestListLabel}>GUESTS</Text>
              {going.concat(pending).concat(declined).map((a) => (
                <View key={a.user_id} style={styles.guestRow}>
                  <Avatar uri={a.user?.avatar_url ?? null} name={a.user?.display_name ?? "?"} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.guestName}>{a.user?.display_name ?? "Member"}</Text>
                    {a.note ? <Text style={styles.guestNote}>{a.note}</Text> : null}
                  </View>
                  <View style={[
                    styles.rsvpTag,
                    a.rsvp_status === "going" ? styles.rsvpTagGoing :
                    a.rsvp_status === "declined" ? styles.rsvpTagNo : styles.rsvpTagPending
                  ]}>
                    <Text style={[
                      styles.rsvpTagText,
                      a.rsvp_status === "going" ? { color: Colors.green } :
                      a.rsvp_status === "declined" ? { color: "#FCA5A5" } : { color: MUTED }
                    ]}>
                      {a.rsvp_status === "going" ? "Going" :
                       a.rsvp_status === "declined" ? "Can't make it" : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Album tab ── */}
      {activeTab === "album" && (
        <View style={{ flex: 1 }}>
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setActiveTab("guests")} style={{ marginRight: 10 }}>
              <Ionicons name="chevron-back" size={20} color={MUTED} />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>Album</Text>
          </View>
          <ScrollView contentContainerStyle={styles.grid}>
            <TouchableOpacity style={styles.addPhotoBtn} onPress={addPhoto}>
              <Ionicons name="add-circle-outline" size={28} color={SAGE} />
              <Text style={styles.addPhotoText}>Add photos</Text>
            </TouchableOpacity>
            {photos.map((p) =>
              photoUrls[p.id] ? (
                <Image key={p.id} source={{ uri: photoUrls[p.id] }} style={styles.photo} />
              ) : (
                <View key={p.id} style={[styles.photo, { alignItems: "center", justifyContent: "center" }]}>
                  <ActivityIndicator color={FAINT} size="small" />
                </View>
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Secret planning tab ── */}
      {activeTab === "planning" && (
        <View style={{ flex: 1 }}>
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setActiveTab("guests")} style={{ marginRight: 10 }}>
              <Ionicons name="chevron-back" size={20} color={MUTED} />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>Secret Planning</Text>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
            <Ionicons name="lock-closed" size={40} color={SAGE} style={{ opacity: 0.5, marginBottom: 16 }} />
            <Text style={styles.secretTitle}>Secret planning</Text>
            <Text style={styles.secretBody}>
              Only your planning group can see this.{"\n"}
              {moment?.honoree_id
                ? "The honoree doesn't know this exists."
                : "Coordinate privately here."}
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },

  // Sub-header (album / planning)
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  subHeaderTitle: { fontSize: 16, fontWeight: "700", color: TEXT },

  // Hero
  hero: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  heroTitle: {
    fontSize: 32, fontWeight: "800", color: TEXT,
    letterSpacing: -0.6, marginBottom: 12,
  },
  datePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(143,168,118,0.12)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.25)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    alignSelf: "flex-start",
  },
  datePillText: { fontSize: 13, fontWeight: "600", color: SAGE },

  // RSVP counts
  countsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 18,
    marginBottom: 24,
  },
  countBox: { flex: 1, alignItems: "center" },
  countNum: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  countLabel: { fontSize: 11, color: MUTED, marginTop: 2, letterSpacing: 0.3 },
  countDivider: { width: 1, backgroundColor: BORDER },

  // RSVP buttons
  rsvpSection: { paddingHorizontal: 20, marginBottom: 32 },
  rsvpPrompt: {
    fontSize: 13, fontWeight: "700", color: MUTED,
    letterSpacing: 0.8, textTransform: "uppercase",
    marginBottom: 14,
  },
  rsvpBtns: { flexDirection: "row", gap: 10, marginBottom: 14 },
  rsvpBtn: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  rsvpBtnGoing: { borderColor: "rgba(74,222,128,0.35)" },
  rsvpBtnDeclined: { borderColor: "rgba(248,113,113,0.3)" },
  rsvpBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  rsvpBtnText: { fontSize: 14, fontWeight: "700", color: MUTED },

  // Note input
  noteBox: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  noteInput: {
    fontSize: 14, color: TEXT,
    minHeight: 44,
    textAlignVertical: "top",
  },
  noteSaveBtn: {
    alignSelf: "flex-end",
    marginTop: 8,
    backgroundColor: "rgba(143,168,118,0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(143,168,118,0.3)",
  },
  noteSaveBtnText: { fontSize: 13, fontWeight: "700", color: SAGE },

  // Guest list
  guestList: { paddingHorizontal: 20 },
  guestListLabel: {
    fontSize: 10, fontWeight: "700", color: FAINT,
    letterSpacing: 1.4, marginBottom: 12,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  guestName: { fontSize: 15, fontWeight: "600", color: TEXT },
  guestNote: { fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 17 },
  rsvpTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  rsvpTagGoing: { backgroundColor: "rgba(74,222,128,0.12)" },
  rsvpTagNo: { backgroundColor: "rgba(248,113,113,0.1)" },
  rsvpTagPending: { backgroundColor: "rgba(255,255,255,0.05)" },
  rsvpTagText: { fontSize: 11, fontWeight: "700" },

  // Album
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 4, gap: 4 },
  addPhotoBtn: {
    width: "47%", aspectRatio: 1,
    backgroundColor: CARD, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: BORDER, borderStyle: "dashed", margin: 4,
  },
  addPhotoText: { color: SAGE, fontSize: 12, marginTop: 6 },
  photo: { width: "47%", aspectRatio: 1, borderRadius: 14, margin: 4, backgroundColor: CARD },

  // Secret
  secretTitle: { fontSize: 20, fontWeight: "700", color: TEXT, marginBottom: 8, textAlign: "center" },
  secretBody: { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 22 },
});
