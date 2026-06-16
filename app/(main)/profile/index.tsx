import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Profile } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const { session } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session?.user.id]);

  const signOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <Avatar uri={profile.avatar_url} name={profile.display_name} size={72} />
        <View style={{ marginLeft: 16 }}>
          <Text style={styles.name}>{profile.display_name}</Text>
          <Text style={styles.phone}>{profile.phone}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>
      </View>

      <View style={styles.section}>
        <MenuItem icon="create-outline" label="Edit profile" onPress={() => {}} />
        <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <MenuItem icon="lock-closed-outline" label="Privacy" onPress={() => {}} />
        <MenuItem icon="help-circle-outline" label="Help" onPress={() => {}} />
        <MenuItem
          icon="log-out-outline"
          label="Sign out"
          onPress={signOut}
          danger
        />
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={icon as any}
        size={20}
        color={danger ? Colors.red : Colors.textMuted}
      />
      <Text style={[styles.menuLabel, danger && { color: Colors.red }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 20, fontWeight: "700", color: Colors.text },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  name: { fontSize: 20, fontWeight: "700", color: Colors.text },
  phone: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  bio: { color: Colors.textMuted, fontSize: 13, marginTop: 6 },
  section: {
    marginHorizontal: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgCardBorder,
  },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text },
});
