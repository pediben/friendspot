/**
 * Contact Import Screen
 * Reads device contacts, finds which ones are already on Friendzone,
 * and lets the user invite others. This is the cold-start flywheel.
 */
import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from "react-native";
import * as Contacts from "expo-contacts";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/Colors";

interface ContactMatch {
  contact: Contacts.Contact;
  profile: Profile | null; // null = not on Friendzone yet
}

export default function ContactsScreen() {
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      setLoading(false);
      return;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
    });

    // Extract all phone numbers
    const phones: string[] = [];
    data.forEach((c) => {
      c.phoneNumbers?.forEach((p) => {
        const normalized = p.number?.replace(/\D/g, "") ?? "";
        if (normalized.length >= 10) phones.push(normalized);
      });
    });

    // Batch query Supabase for matches
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("phone", phones.map((p) => `+1${p.slice(-10)}`));

    const profileMap = new Map((profiles ?? []).map((p) => [p.phone?.slice(-10) ?? "", p]));

    const result: ContactMatch[] = data
      .filter((c) => c.phoneNumbers?.length)
      .map((c) => {
        const normalized = c.phoneNumbers![0].number?.replace(/\D/g, "").slice(-10) ?? "";
        return { contact: c, profile: profileMap.get(normalized) ?? null };
      })
      .sort((a, b) => (b.profile ? 1 : 0) - (a.profile ? 1 : 0));

    setMatches(result);
    setLoading(false);
  };

  const invite = async (contact: Contacts.Contact) => {
    await Share.share({
      message: `Hey! Join me on Friendzone — the private app for real friend groups. Download: https://friendzone.app/invite`,
    });
  };

  const skip = () => router.replace("/(main)/circles");

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.purple} size="large" />
        <Text style={styles.loadingText}>Finding your people…</Text>
      </View>
    );
  }

  const onApp = matches.filter((m) => m.profile);
  const notOnApp = matches.filter((m) => !m.profile);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Who's already here?</Text>
      <Text style={styles.subtitle}>
        {onApp.length} of your contacts are on Friendzone.
      </Text>

      <FlatList
        data={[...onApp, ...notOnApp]}
        keyExtractor={(item, i) => item.contact.id ?? String(i)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar
              uri={item.profile?.avatar_url ?? null}
              name={item.contact.name ?? "?"}
              size={44}
            />
            <View style={styles.info}>
              <Text style={styles.name}>{item.contact.name}</Text>
              {item.profile ? (
                <Text style={styles.badge}>✅ On Friendzone</Text>
              ) : (
                <Text style={styles.phone}>
                  {item.contact.phoneNumbers?.[0]?.number}
                </Text>
              )}
            </View>
            {!item.profile && (
              <TouchableOpacity
                onPress={() => invite(item.contact)}
                style={styles.inviteBtn}
              >
                <Text style={styles.inviteText}>Invite</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <TouchableOpacity style={styles.continueBtn} onPress={skip}>
        <Text style={styles.continueBtnText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F1A" },
  center: { alignItems: "center", justifyContent: "center" },
  loadingText: { color: "rgba(255,255,255,0.5)", marginTop: 16, fontSize: 16 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 80,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  info: { flex: 1, marginLeft: 12 },
  name: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  badge: { color: "#4ADE80", fontSize: 13, marginTop: 2 },
  phone: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  inviteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.purple,
  },
  inviteText: { color: Colors.purple, fontSize: 14, fontWeight: "600" },
  continueBtn: {
    position: "absolute",
    bottom: 48,
    right: 24,
    left: 24,
    backgroundColor: Colors.purple,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
