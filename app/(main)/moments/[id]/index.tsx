/**
 * MomentDetailScreen — Invitation-first design.
 *
 * Features:
 * - Location + countdown in hero
 * - Reaction strip (🎉 🔥 ❤️)
 * - RSVP: Going / Can't make it with guest note
 * - Guest list with name, rsvp badge, note
 * - Bring-something / contributions list
 * - Nudge button (host only) — notifies pending guests
 * - Album (secondary, via header icon)
 * - Secret planning (secondary, via header icon)
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
  Linking,
  Modal,
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

const REACTIONS = ["🎉", "🔥", "❤️", "😂", "👏"];

type Tab = "guests" | "album" | "planning";
type Attendee = {
  user_id: string;
  rsvp_status: "invited" | "going" | "maybe" | "declined";
  note?: string | null;
  user?: { display_name: string; avatar_url: string | null };
};
type Contribution = {
  id: string;
  label: string;
  claimed_by: string | null;
  created_by: string;
  claimer?: { display_name: string; avatar_url: string | null } | null;
  creator?: { display_name: string } | null;
};

export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [moment, setMoment]               = useState<Moment | null>(null);
  const [attendees, setAttendees]         = useState<Attendee[]>([]);
  const [reactions, setReactions]         = useState<Record<string, number>>({});
  const [myReactions, setMyReactions]     = useState<Set<string>>(new Set());
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [photos, setPhotos]               = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls]         = useState<Record<string, string>>({});
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState<Tab>("guests");
  const [isPlanner, setIsPlanner]         = useState(false);
  const [myNote, setMyNote]               = useState("");
  const [savingNote, setSavingNote]       = useState(false);
  const [rsvpLoading, setRsvpLoading]     = useState(false);
  const [nudging, setNudging]             = useState(false);
  const [showAddItem, setShowAddItem]     = useState(false);
  const [newItem, setNewItem]             = useState("");

  const myAttendee = attendees.find(a => a.user_id === userId);
  const myRsvp = myAttendee?.rsvp_status ?? null;
  const isHost = moment?.created_by === userId;

  const going    = attendees.filter(a => a.rsvp_status === "going");
  const declined = attendees.filter(a => a.rsvp_status === "declined");
  const pending  = attendees.filter(a => a.rsvp_status === "invited" || a.rsvp_status === "maybe");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    const [momentRes, attendeesRes, reactionsRes, myReactRes, contribRes, photosRes, plannerRes] =
      await Promise.all([
        supabase.from("moments").select("*").eq("id", id).single(),
        supabase.from("moment_attendees").select("*, user:profiles(*)").eq("moment_id", id),
        supabase.from("moment_reactions").select("emoji").eq("moment_id", id),
        supabase.from("moment_reactions").select("emoji").eq("moment_id", id).eq("user_id", userId ?? ""),
        supabase.from("moment_contributions")
          .select("*, claimer:profiles!claimed_by(*), creator:profiles!created_by(display_name)")
          .eq("moment_id", id)
          .order("created_at"),
        supabase.from("photos").select("*").eq("moment_id", id).order("created_at"),
        supabase.from("moment_attendees").select("user_id").eq("moment_id", id).eq("user_id", userId ?? ""),
      ]);

    setMoment(momentRes.data);

    const fetched = (attendeesRes.data ?? []) as Attendee[];
    setAttendees(fetched);
    const me = fetched.find(a => a.user_id === userId);
    if (me?.note) setMyNote(me.note);

    // Tally reactions
    const tally: Record<string, number> = {};
    (reactionsRes.data ?? []).forEach((r: any) => {
      tally[r.emoji] = (tally[r.emoji] ?? 0) + 1;
    });
    setReactions(tally);
    setMyReactions(new Set((myReactRes.data ?? []).map((r: any) => r.emoji)));

    setContributions((contribRes.data ?? []) as Contribution[]);
    setIsPlanner((plannerRes.data ?? []).length > 0);

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

  const toggleReaction = async (emoji: string) => {
    if (!userId) return;
    if (myReactions.has(emoji)) {
      await supabase.from("moment_reactions").delete()
        .eq("moment_id", id).eq("user_id", userId).eq("emoji", emoji);
    } else {
      await supabase.from("moment_reactions").upsert({ moment_id: id, user_id: userId, emoji });
    }
    load();
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

  const nudgePending = async () => {
    if (!userId || pending.length === 0) return;
    setNudging(true);
    // Insert a notification for each pending attendee
    await supabase.from("notifications").insert(
      pending.map(a => ({
        user_id: a.user_id,
        type: "moment_nudge",
        title: `Are you coming to ${moment?.title ?? "the event"}?`,
        body: "The host wants to know — are you going?",
        data: { moment_id: id },
      }))
    );
    setNudging(false);
    Alert.alert("Nudge sent!", `${pending.length} pending guest${pending.length > 1 ? "s" : ""} notified.`);
  };

  const claimContribution = async (contrib: Contribution) => {
    if (!userId) return;
    if (contrib.claimed_by && contrib.claimed_by !== userId) {
      Alert.alert("Already claimed", `${contrib.claimer?.display_name} is already bringing this.`);
      return;
    }
    const newVal = contrib.claimed_by === userId ? null : userId;
    await supabase.from("moment_contributions").update({ claimed_by: newVal }).eq("id", contrib.id);
    load();
  };

  const addContribution = async () => {
    if (!userId || !newItem.trim()) return;
    await supabase.from("moment_contributions").insert({
      moment_id: id,
      label: newItem.trim(),
      created_by: userId,
    });
    setNewItem("");
    setShowAddItem(false);
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
      const { error } = await supabase.storage.from("photos")
        .upload(storagePath, form as any, { contentType: mime, upsert: false });
      if (!error) {
        await supabase.from("photos").insert({ moment_id: id, uploader_id: userId!, image_url: storagePath });
      }
    }
    load();
  };

  const openMaps = (location: string) => {
    const encoded = encodeURIComponent(location);
    Linking.openURL(`https://maps.apple.com/?q=${encoded}`).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`)
    );
  };

  const countdown = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (diff < 0) return null;
    if (diff === 0) return "Today!";
    if (diff === 1) return "Tomorrow!";
    return `In ${diff} days`;
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={SAGE} />
      </View>
    );
  }

  const dateStr    = formatDate(moment?.event_date ?? null);
  const countdownStr = countdown(moment?.event_date ?? null);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {isHost && pending.length > 0 && (
            <TouchableOpacity style={[styles.headerIconBtn, { borderColor: "rgba(143,168,118,0.3)" }]}
              onPress={nudgePending} disabled={nudging}>
              {nudging
                ? <ActivityIndicator size="small" color={SAGE} />
                : <Ionicons name="notifications-outline" size={18} color={SAGE} />
              }
            </TouchableOpacity>
          )}
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
            <View style={styles.heroPills}>
              {dateStr && (
                <View style={styles.pill}>
                  <Ionicons name="calendar-outline" size={13} color={SAGE} />
                  <Text style={styles.pillText}>{dateStr}</Text>
                </View>
              )}
              {countdownStr && (
                <View style={[styles.pill, { backgroundColor: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.25)" }]}>
                  <Text style={[styles.pillText, { color: Colors.green }]}>{countdownStr}</Text>
                </View>
              )}
            </View>
            {moment?.location && (
              <TouchableOpacity style={styles.locationRow} onPress={() => openMaps(moment.location!)}>
                <Ionicons name="location-outline" size={14} color={MUTED} />
                <Text style={styles.locationText}>{moment.location}</Text>
                <Ionicons name="open-outline" size={12} color={FAINT} />
              </TouchableOpacity>
            )}
          </View>

          {/* Reactions */}
          <View style={styles.reactionsRow}>
            {REACTIONS.map(emoji => {
              const count = reactions[emoji] ?? 0;
              const mine = myReactions.has(emoji);
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionBtn, mine && styles.reactionBtnActive]}
                  onPress={() => toggleReaction(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {count > 0 && <Text style={[styles.reactionCount, mine && { color: SAGE }]}>{count}</Text>}
                </TouchableOpacity>
              );
            })}
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

          {/* My RSVP */}
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
                  <LinearGradient colors={["rgba(74,222,128,0.25)", "rgba(74,222,128,0.12)"]} style={styles.rsvpBtnInner}>
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

            {myRsvp && (
              <View style={styles.noteBox}>
                <TextInput
                  style={styles.noteInput}
                  placeholder={myRsvp === "going" ? "Leave a message... 🥳" : "Let them know..."}
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

          {/* Bring something list */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>BRING SOMETHING</Text>
              <TouchableOpacity style={styles.sectionAddBtn} onPress={() => setShowAddItem(true)}>
                <Ionicons name="add" size={16} color={SAGE} />
                <Text style={styles.sectionAddText}>Add item</Text>
              </TouchableOpacity>
            </View>
            {contributions.length === 0 ? (
              <TouchableOpacity style={styles.emptyContrib} onPress={() => setShowAddItem(true)}>
                <Text style={styles.emptyContribText}>
                  + Add something to the list — wine, dessert, games...
                </Text>
              </TouchableOpacity>
            ) : (
              contributions.map((c) => {
                const isMine = c.claimed_by === userId;
                const taken  = !!c.claimed_by && !isMine;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.contribRow, taken && styles.contribRowTaken]}
                    onPress={() => claimContribution(c)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.contribCheck, isMine && styles.contribCheckMine, taken && styles.contribCheckTaken]}>
                      {(isMine || taken) && <Ionicons name="checkmark" size={13} color={isMine ? SAGE : MUTED} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.contribLabel, taken && { color: MUTED }]}>{c.label}</Text>
                      {c.claimer && (
                        <Text style={styles.contribClaimer}>
                          {isMine ? "You're bringing this" : `${c.claimer.display_name} is bringing this`}
                        </Text>
                      )}
                    </View>
                    {!c.claimed_by && (
                      <Text style={styles.contribClaim}>Claim</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Guest list */}
          {attendees.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>GUESTS</Text>
              {going.concat(pending).concat(declined).map((a) => (
                <View key={a.user_id} style={styles.guestRow}>
                  <Avatar uri={a.user?.avatar_url ?? null} name={a.user?.display_name ?? "?"} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.guestName}>{a.user?.display_name ?? "Member"}</Text>
                    {a.note ? <Text style={styles.guestNote}>{a.note}</Text> : null}
                  </View>
                  <View style={[
                    styles.rsvpTag,
                    a.rsvp_status === "going"    ? styles.rsvpTagGoing :
                    a.rsvp_status === "declined" ? styles.rsvpTagNo   : styles.rsvpTagPending
                  ]}>
                    <Text style={[
                      styles.rsvpTagText,
                      a.rsvp_status === "going"    ? { color: Colors.green } :
                      a.rsvp_status === "declined" ? { color: "#FCA5A5" }   : { color: MUTED }
                    ]}>
                      {a.rsvp_status === "going"    ? "Going" :
                       a.rsvp_status === "declined" ? "Can't" : "Pending"}
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

      {/* ── Secret Planning tab ── */}
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

      {/* ── Add item modal ── */}
      <Modal visible={showAddItem} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddItem(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.addItemSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.addItemTitle}>Add to the list</Text>
          <TextInput
            style={styles.addItemInput}
            placeholder="e.g. Wine, Dessert, Board game..."
            placeholderTextColor={FAINT}
            value={newItem}
            onChangeText={setNewItem}
            autoFocus
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={addContribution}
          />
          <TouchableOpacity
            style={[styles.addItemBtn, !newItem.trim() && { opacity: 0.4 }]}
            onPress={addContribution}
            disabled={!newItem.trim()}
          >
            <Text style={styles.addItemBtnText}>Add to list</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },

  subHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  subHeaderTitle: { fontSize: 16, fontWeight: "700", color: TEXT },

  // Hero
  hero: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16 },
  heroTitle: {
    fontSize: 30, fontWeight: "800", color: TEXT,
    letterSpacing: -0.5, marginBottom: 12,
  },
  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(143,168,118,0.12)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.25)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  pillText: { fontSize: 13, fontWeight: "600", color: SAGE },
  locationRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  locationText: { fontSize: 13, color: MUTED, flex: 1 },

  // Reactions
  reactionsRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 22, paddingBottom: 16, flexWrap: "wrap",
  },
  reactionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  reactionBtnActive: {
    borderColor: "rgba(143,168,118,0.35)",
    backgroundColor: "rgba(143,168,118,0.1)",
  },
  reactionEmoji: { fontSize: 18 },
  reactionCount: { fontSize: 13, fontWeight: "700", color: MUTED },

  // RSVP counts
  countsRow: {
    flexDirection: "row", marginHorizontal: 20,
    backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 18, marginBottom: 20,
  },
  countBox: { flex: 1, alignItems: "center" },
  countNum: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  countLabel: { fontSize: 11, color: MUTED, marginTop: 2, letterSpacing: 0.3 },
  countDivider: { width: 1, backgroundColor: BORDER },

  // RSVP buttons
  rsvpSection: { paddingHorizontal: 20, marginBottom: 28 },
  rsvpPrompt: {
    fontSize: 12, fontWeight: "700", color: MUTED,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12,
  },
  rsvpBtns: { flexDirection: "row", gap: 10, marginBottom: 12 },
  rsvpBtn: {
    flex: 1, borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
  },
  rsvpBtnGoing:   { borderColor: "rgba(74,222,128,0.35)" },
  rsvpBtnDeclined:{ borderColor: "rgba(248,113,113,0.3)" },
  rsvpBtnInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, paddingHorizontal: 12,
  },
  rsvpBtnText: { fontSize: 14, fontWeight: "700", color: MUTED },

  noteBox: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 14,
  },
  noteInput: { fontSize: 14, color: TEXT, minHeight: 40, textAlignVertical: "top" },
  noteSaveBtn: {
    alignSelf: "flex-end", marginTop: 8,
    backgroundColor: "rgba(143,168,118,0.15)", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 7,
    borderWidth: 1, borderColor: "rgba(143,168,118,0.3)",
  },
  noteSaveBtnText: { fontSize: 13, fontWeight: "700", color: SAGE },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionLabel: {
    flex: 1, fontSize: 10, fontWeight: "700",
    color: FAINT, letterSpacing: 1.4,
  },
  sectionAddBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(143,168,118,0.1)",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(143,168,118,0.25)",
  },
  sectionAddText: { fontSize: 12, fontWeight: "700", color: SAGE },

  // Contributions
  emptyContrib: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, borderStyle: "dashed",
    padding: 18, alignItems: "center",
  },
  emptyContribText: { color: FAINT, fontSize: 13, textAlign: "center" },
  contribRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 14, marginBottom: 8,
  },
  contribRowTaken: { opacity: 0.65 },
  contribCheck: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  contribCheckMine: { borderColor: SAGE, backgroundColor: "rgba(143,168,118,0.15)" },
  contribCheckTaken: { borderColor: FAINT },
  contribLabel: { fontSize: 15, fontWeight: "600", color: TEXT },
  contribClaimer: { fontSize: 12, color: MUTED, marginTop: 2 },
  contribClaim: { fontSize: 12, fontWeight: "700", color: SAGE },

  // Guests
  guestRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: CARD, borderRadius: 18, borderWidth: 1,
    borderColor: BORDER, padding: 14, marginBottom: 8,
  },
  guestName: { fontSize: 15, fontWeight: "600", color: TEXT },
  guestNote: { fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 17 },
  rsvpTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  rsvpTagGoing:   { backgroundColor: "rgba(74,222,128,0.12)" },
  rsvpTagNo:      { backgroundColor: "rgba(248,113,113,0.1)" },
  rsvpTagPending: { backgroundColor: "rgba(255,255,255,0.05)" },
  rsvpTagText:    { fontSize: 11, fontWeight: "700" },

  // Album
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 4, gap: 4 },
  addPhotoBtn: {
    width: "47%", aspectRatio: 1, backgroundColor: CARD, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: BORDER, borderStyle: "dashed", margin: 4,
  },
  addPhotoText: { color: SAGE, fontSize: 12, marginTop: 6 },
  photo: { width: "47%", aspectRatio: 1, borderRadius: 14, margin: 4, backgroundColor: CARD },

  // Secret
  secretTitle: { fontSize: 20, fontWeight: "700", color: TEXT, marginBottom: 8, textAlign: "center" },
  secretBody:  { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 22 },

  // Add item modal
  modalOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  addItemSheet: {
    backgroundColor: "#141613",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 48, paddingTop: 16,
    marginTop: "auto",
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center", marginBottom: 24,
  },
  addItemTitle: { fontSize: 20, fontWeight: "800", color: TEXT, marginBottom: 20 },
  addItemInput: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 18, paddingVertical: 15,
    fontSize: 16, color: TEXT, marginBottom: 16,
  },
  addItemBtn: {
    backgroundColor: SAGE, borderRadius: 16,
    paddingVertical: 16, alignItems: "center",
  },
  addItemBtnText: { fontSize: 15, fontWeight: "800", color: BG },
});
