import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase, uploadFile } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";

export default function ProfileSetupScreen() {
  const [name, setName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Add your name", "We need something to call you.");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      Alert.alert("Session expired", "Please sign in again.");
      router.replace("/(auth)/phone");
      return;
    }

    let avatarUrl: string | null = null;

    if (avatarUri) {
      try {
        const blob = await (await fetch(avatarUri)).blob();
        const path = await uploadFile("avatars", user.id, `${Date.now()}.jpg`, blob, "image/jpeg");
        if (path) avatarUrl = path;
        else Alert.alert("Photo not saved", "Your profile was saved but the photo couldn't upload. You can add it later.");
      } catch {
        // Non-fatal — continue without photo
      }
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: name.trim(), avatar_url: avatarUrl })
      .eq("id", user.id);

    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }

    // Stamp display_name in auth metadata so returning-user check works
    await supabase.auth.updateUser({ data: { display_name: name.trim() } });

    setLoading(false);
    router.replace("/(main)/circles");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set up your profile</Text>
      <Text style={styles.subtitle}>Just the basics — this is friends only.</Text>

      <TouchableOpacity onPress={pickAvatar} style={styles.avatarPicker}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>📷</Text>
          </View>
        )}
        <Text style={styles.avatarLabel}>Add photo</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor="rgba(255,255,255,0.35)"
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={save}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C0D0B",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  title: { fontSize: 30, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 40,
  },
  avatarPicker: { alignItems: "center", marginBottom: 32 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    borderStyle: "dashed",
  },
  avatarPlaceholderText: { fontSize: 32 },
  avatarLabel: { color: Colors.purple, marginTop: 10, fontSize: 15 },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  button: {
    backgroundColor: Colors.purple,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
