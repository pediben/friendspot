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
import { StoryRing } from "@/components/ui/StoryRing";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const { session } = useAuthStore();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [hasStory, setHasStory] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;

    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error("[Profile] fetch error:", error.message);
        // Always exit the loading state — fall back to session info if no DB row
        setProfile(data ?? {
          id: session.user.id,
          display_name: session.user.email?.split("@")[0] ?? "Me",
          avatar_url: null,
          username: null,
          bio: null,
          job_title: null,
          company: null,
          phone: session.user.phone ?? null,
          coins: 0,
          venmo_username: null,
          paypal_email: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });

    supabase
      .from("stories")
      .select("id")
      .eq("author_id", session.user.id)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .then(({ data }) => setHasStory((data?.length ?? 0) > 0));
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
        <Text style={styles.heading}>Me</Text>
        {router.canGoBack() && (
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <StoryRing
          userId={session!.user.id}
          uri={profile.avatar_url}
          name={profile.display_name}
          size={72}
          hasStory={hasStory}
          hasUnseenStory={false}
        />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={styles.name}>{profile.display_name}</Text>
          {profile.phone ? <Text style={styles.phone}>{profile.phone}</Text> : null}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(main)/stories/add" as any)}
          style={styles.addStoryBtn}
        >
          <Ionicons name="add-circle" size={28} color={Colors.purple} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <MenuItem icon="create-outline"           label="Edit profile"    onPress={() => router.push("/(main)/profile/edit" as any)} />
        <MenuItem icon="swap-horizontal-outline"  label="Payment links"   onPress={() => router.push("/(main)/profile/payments" as any)} />
        <MenuItem icon="shield-checkmark-outline" label="Two-factor auth" onPress={() => router.push("/(main)/profile/two-factor" as any)} />
        <MenuItem icon="star-outline"               label="Friendspot Pro"  onPress={() => router.push("/(main)/pro" as any)} pro />
        <MenuItem icon="notifications-outline"    label="Notifications"   onPress={() => Alert.alert("Coming soon", "Notification settings are coming in a future update.")} />
        <MenuItem icon="lock-closed-outline"      label="Privacy"         onPress={() => Alert.alert("Coming soon", "Privacy settings are coming in a future update.")} />
        <MenuItem icon="help-circle-outline"      label="Help"            onPress={() => Alert.alert("Coming soon", "In-app help is coming soon. For now, email us at hello@friendspot.online.")} />
        <MenuItem icon="information-circle-outline" label="About Friendspot" onPress={() => router.push("/(main)/about" as any)} />
        <MenuItem icon="log-out-outline" label="Sign out" onPress={signOut} danger />
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
  pro,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  pro?: boolean;
}) {
  const SAGE = "#8FA876";
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={icon as any}
        size={20}
        color={danger ? Colors.red : pro ? SAGE : Colors.textMuted}
      />
      <Text style={[styles.menuLabel, danger && { color: Colors.red }, pro && { color: SAGE, fontWeight: "700" }]}>{label}</Text>
      {pro && (
        <View style={{ backgroundColor: "rgba(143,168,118,0.15)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: SAGE }}>UPGRADE</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={Colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 68,
    paddingBottom: 20,
  },
  heading: { fontSize: 36, fontWeight: "800", color: Colors.text, letterSpacing: -0.5 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
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
  addStoryBtn: { padding: 4 },
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
