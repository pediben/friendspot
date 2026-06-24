/**
 * Add Story screen — pick photo, optional caption, post for 24h.
 */
import { useState } from "react";
import {
  View, Text, Image, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase, uploadFile } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";

const BG     = "#09090F";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT   = "#FFFFFF";
const FAINT  = "rgba(255,255,255,0.18)";

export default function AddStoryScreen() {
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption]   = useState("");
  const [posting, setPosting]   = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const post = async () => {
    if (!photoUri || !userId) return;
    setPosting(true);
    try {
      const blob = await (await fetch(photoUri)).blob();
      const path = await uploadFile("stories", userId, `${Date.now()}.jpg`, blob, "image/jpeg");
      if (!path) throw new Error("Upload failed");

      const { error } = await supabase.from("stories").insert({
        author_id:  userId,
        media_url:  path,
        media_type: "photo",
        caption:    caption.trim() || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;

      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.heading}>New Story</Text>
        <TouchableOpacity
          onPress={post}
          disabled={!photoUri || posting}
          style={[styles.postBtn, (!photoUri || posting) && { opacity: 0.4 }]}
        >
          {posting
            ? <ActivityIndicator color={Colors.purple} size="small" />
            : <Text style={styles.postText}>Share</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Photo picker */}
      <TouchableOpacity
        style={[styles.photoArea, photoUri ? styles.photoAreaFilled : null]}
        onPress={pickPhoto}
        activeOpacity={0.8}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Ionicons name="image-outline" size={52} color={FAINT} />
            <Text style={styles.photoHint}>Tap to pick a photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Caption */}
      <View style={styles.captionWrap}>
        <TextInput
          style={styles.captionInput}
          placeholder="Add a caption… (optional)"
          placeholderTextColor={FAINT}
          value={caption}
          onChangeText={setCaption}
          maxLength={200}
          multiline
        />
      </View>

      <Text style={styles.hint}>Stories disappear after 24 hours.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  backBtn:  { width: 40, alignItems: "flex-start" },
  heading:  { fontSize: 18, fontWeight: "700", color: TEXT },
  postBtn:  { width: 56, alignItems: "flex-end" },
  postText: { fontSize: 16, fontWeight: "700", color: Colors.purple },

  photoArea: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    aspectRatio: 9 / 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAreaFilled: { borderStyle: "solid", borderColor: "transparent" },
  preview: { width: "100%", height: "100%" },
  photoEmpty: { alignItems: "center", gap: 12 },
  photoHint: { color: FAINT, fontSize: 14 },

  captionWrap: { marginHorizontal: 20, marginTop: 16 },
  captionInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14, padding: 16,
    fontSize: 15, color: TEXT,
    borderWidth: 1, borderColor: BORDER,
    minHeight: 72, textAlignVertical: "top",
  },

  hint: { textAlign: "center", color: FAINT, fontSize: 12, marginTop: 12 },
});
