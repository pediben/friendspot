/**
 * Edit Profile screen
 * Allows updating display name, bio, and avatar photo.
 */
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase, uploadFile, getSignedUrl } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";

const BG      = "#09090F";
const CARD_BG = "#111118";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT    = "#FFFFFF";
const MUTED   = "rgba(255,255,255,0.4)";
const FAINT   = "rgba(255,255,255,0.18)";

export default function EditProfileScreen() {
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [name, setName]         = useState("");
  const [bio, setBio]           = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);  // local pick
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null); // signed URL
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("display_name, bio, avatar_url")
      .eq("id", userId)
      .single()
      .then(async ({ data }) => {
        if (data) {
          setName(data.display_name ?? "");
          setBio(data.bio ?? "");
          if (data.avatar_url) {
            const url = await getSignedUrl("avatars", data.avatar_url);
            setCurrentAvatar(url);
          }
        }
        setLoading(false);
      });
  }, [userId]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a display name.");
      return;
    }
    if (!userId) return;
    setSaving(true);

    let avatarPath: string | undefined;
    if (avatarUri) {
      const blob = await (await fetch(avatarUri)).blob();
      const path = await uploadFile("avatars", userId, `${Date.now()}.jpg`, blob, "image/jpeg");
      if (path) avatarPath = path;
    }

    const update: Record<string, any> = {
      display_name: name.trim(),
      bio: bio.trim() || null,
    };
    if (avatarPath) update.avatar_url = avatarPath;

    const { error } = await supabase
      .from("profiles")
      .update(update as any)
      .eq("id", userId);

    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      router.back();
    }
  };

  const displayAvatar = avatarUri ?? currentAvatar;

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.heading}>Edit Profile</Text>
        <TouchableOpacity onPress={save} disabled={saving} style={styles.saveBtn}>
          {saving
            ? <ActivityIndicator color={Colors.purple} size="small" />
            : <Text style={styles.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarWrap} onPress={pickPhoto} activeOpacity={0.8}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={38} color={FAINT} />
            </View>
          )}
          <View style={styles.cameraChip}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.changePhoto}>Change photo</Text>

        {/* Name */}
        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={FAINT}
          value={name}
          onChangeText={setName}
          returnKeyType="next"
          maxLength={40}
        />

        {/* Bio */}
        <Text style={styles.label}>BIO <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="A line about yourself"
          placeholderTextColor={FAINT}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          maxLength={120}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  heading: { fontSize: 18, fontWeight: "700", color: TEXT },
  saveBtn: { width: 56, alignItems: "flex-end" },
  saveText: { fontSize: 16, fontWeight: "700", color: Colors.purple },

  body: { alignItems: "center", paddingTop: 12, paddingHorizontal: 24, paddingBottom: 60 },

  avatarWrap: { position: "relative", marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  cameraChip: {
    position: "absolute", bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.purple,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: BG,
  },
  changePhoto: { color: Colors.purple, fontSize: 14, marginBottom: 32 },

  label: {
    alignSelf: "flex-start",
    fontSize: 10, fontWeight: "700", color: FAINT,
    letterSpacing: 1.4, marginBottom: 10,
  },
  optional: { fontWeight: "400" },
  input: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: TEXT,
    borderWidth: 1, borderColor: BORDER,
    marginBottom: 24,
  },
  inputMulti: { height: 90, textAlignVertical: "top", paddingTop: 14 },
});
