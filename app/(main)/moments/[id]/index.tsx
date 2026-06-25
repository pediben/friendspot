/**
 * MomentDetailScreen
 * Three tabs: Album | Expenses | Secret Planning (hidden from honoree)
 */
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase, uploadFile } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Moment, Photo } from "@/types/database";
import { getSignedUrl } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";
import { Avatar } from "@/components/ui/Avatar";

type Tab = "album" | "guests" | "planning";

export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [moment, setMoment] = useState<Moment | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("album");
  const [attendees, setAttendees] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isInPlanningGroup, setIsInPlanningGroup] = useState(false);

  useEffect(() => {
    loadMoment();
  }, [id]);

  const loadMoment = async () => {
    const [momentRes, photosRes, attendeesRes, planningRes] = await Promise.all([
      supabase.from("moments").select("*").eq("id", id).single(),
      supabase.from("photos").select("*").eq("moment_id", id).order("created_at"),
      supabase
        .from("moment_attendees")
        .select("*, user:profiles(*)")
        .eq("moment_id", id),
      supabase.from("moment_attendees").select("user_id").eq("moment_id", id).eq("user_id", userId ?? ""),
    ]);

    setMoment(momentRes.data);
    const fetchedPhotos = (photosRes.data ?? []) as Photo[];
    setPhotos(fetchedPhotos);

    // Resolve signed URLs for all photos
    const urlMap: Record<string, string> = {};
    await Promise.all(
      fetchedPhotos.map(async (p) => {
        const url = await getSignedUrl("photos", p.image_url);
        if (url) urlMap[p.id] = url;
      })
    );
    setPhotoUrls(urlMap);

    setAttendees(attendeesRes.data ?? []);
    setIsInPlanningGroup((planningRes.data ?? []).length > 0);
    setLoading(false);
  };

  const addPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;

    for (const asset of result.assets) {
      // Use FormData — fetch().blob() returns empty blobs for local photo URIs in RN
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
          moment_id: id,
          uploader_id: userId!,
          image_url: storagePath,
        });
      } else {
        console.error("[addPhoto]", error.message);
      }
    }
    loadMoment();
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "album", label: "Album", icon: "images-outline" },
    { key: "guests", label: "Guests", icon: "people-outline" },
    ...(isInPlanningGroup ? [{ key: "planning" as Tab, label: "Secret", icon: "lock-closed-outline" }] : []),
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {moment?.title ?? "Moment"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
          >
            <Ionicons
              name={t.icon as any}
              size={16}
              color={activeTab === t.key ? Colors.purple : Colors.textMuted}
            />
            <Text
              style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Album tab */}
      {activeTab === "album" && (
        <ScrollView contentContainerStyle={styles.grid}>
          <TouchableOpacity style={styles.addPhotoBtn} onPress={addPhoto}>
            <Ionicons name="add-circle-outline" size={32} color={Colors.purple} />
            <Text style={styles.addPhotoText}>Add photos</Text>
          </TouchableOpacity>
          {photos.map((p) => (
            photoUrls[p.id] ? (
              <Image
                key={p.id}
                source={{ uri: photoUrls[p.id] }}
                style={styles.photo}
              />
            ) : (
              <View key={p.id} style={[styles.photo, styles.photoLoading]}>
                <ActivityIndicator color={Colors.textFaint} size="small" />
              </View>
            )
          ))}
        </ScrollView>
      )}

      {/* Guests tab */}
      {activeTab === "guests" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {attendees.length === 0 ? (
            <View style={styles.guestsEmpty}>
              <Ionicons name="people-outline" size={40} color={Colors.textFaint} style={{ marginBottom: 12 }} />
              <Text style={styles.guestsEmptyTitle}>No guests yet</Text>
              <Text style={styles.guestsEmptyBody}>
                Share this moment with your group and track who's coming.
              </Text>
            </View>
          ) : (
            attendees.map((a) => (
              <View key={a.user_id} style={styles.guestRow}>
                <Avatar uri={a.user?.avatar_url} name={a.user?.display_name} size={38} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.guestName}>{a.user?.display_name ?? "Member"}</Text>
                  <Text style={styles.guestStatus}>
                    {a.rsvp_status === "going" ? "✓ Going" :
                     a.rsvp_status === "not_going" ? "✗ Not going" : "Invited"}
                  </Text>
                </View>
                <View style={[styles.rsvpBadge,
                  a.rsvp_status === "going" ? styles.rsvpGoing :
                  a.rsvp_status === "not_going" ? styles.rsvpNo : styles.rsvpPending
                ]}>
                  <Text style={styles.rsvpBadgeText}>
                    {a.rsvp_status === "going" ? "Going" :
                     a.rsvp_status === "not_going" ? "Can't make it" : "Pending"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Secret Planning tab */}
      {activeTab === "planning" && (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ fontSize: 40 }}>🤫</Text>
          <Text style={styles.secretTitle}>Secret planning</Text>
          <Text style={styles.secretBody}>
            Only your planning group can see this.{"\n"}
            {moment?.honoree_id
              ? "The honoree doesn't know this exists."
              : "Coordinate privately here."}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginHorizontal: 8,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgCardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.purple },
  tabLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  tabLabelActive: { color: Colors.purple },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 4,
    gap: 4,
  },
  addPhotoBtn: {
    width: "47%",
    aspectRatio: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderStyle: "dashed",
    margin: 4,
  },
  addPhotoText: { color: Colors.purple, fontSize: 13, marginTop: 6 },
  photo: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 12,
    margin: 4,
    backgroundColor: Colors.bgCard,
  },
  photoLoading: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Guests tab
  guestsEmpty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  guestsEmptyTitle: {
    fontSize: 18, fontWeight: "700", color: Colors.text,
    marginBottom: 8,
  },
  guestsEmptyBody: {
    fontSize: 14, color: Colors.textMuted,
    textAlign: "center", lineHeight: 20,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  guestName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  guestStatus: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rsvpBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  rsvpGoing: { backgroundColor: "rgba(74,222,128,0.15)" },
  rsvpNo: { backgroundColor: "rgba(248,113,113,0.12)" },
  rsvpPending: { backgroundColor: "rgba(255,255,255,0.06)" },
  rsvpBadgeText: { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  secretTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  secretBody: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 32,
  },
});
