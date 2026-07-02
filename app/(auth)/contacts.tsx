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
import * as ExpoCrypto from "expo-crypto";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Profile } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/Colors";

interface ContactMatch {
  contact: Contacts.Contact;
  profile: Profile | null; // null = not on Friendzone yet
}

export default function ContactsScreen() {
  const { session } = useAuthStore();
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      // Extract all phone numbers, normalize to E.164
      const phones: string[] = [];
      data.forEach((c) => {
        c.phoneNumbers?.forEach((p) => {
          const digits = p.number?.replace(/\D/g, "") ?? "";
          if (digits.length >= 10) {
            // Only prepend +1 for bare 10-digit numbers; leave longer ones as-is
            const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`;
            phones.push(e164);
          }
        });
      });

      // Save to contact_imports (SHA-256 hashed for privacy)
      if (session?.user.id && phones.length > 0) {
        const uniquePhones = [...new Set(phones)];
        const rows = await Promise.all(
          uniquePhones.map(async (phone) => ({
            owner_id:   session.user.id,
            phone_hash: await ExpoCrypto.digestStringAsync(
              ExpoCrypto.CryptoDigestAlgorithm.SHA256,
              phone,
            ),
          }))
        );
        for (let i = 0; i < rows.length; i += 500) {
          await supabase
            .schema("friendspot")
            .from("contact_imports")
            .upsert(rows.slice(i, i + 500), { onConflict: "owner_id,phone_hash" });
        }
      }

      // Query Supabase using the normalized E.164 numbers directly (no double-normalizing)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("phone", phones);

      const profileMap = new Map((profiles ?? []).map((p) => [p.phone ?? "", p]));

      const result: ContactMatch[] = data
        .filter((c) => c.phoneNumbers?.length)
        .map((c) => {
          const digits = c.phoneNumbers![0].number?.replace(/\D/g, "") ?? "";
          const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`;
          return { contact: c, profile: profileMap.get(e164) ?? null };
        })
        .sort((a, b) => (b.profile ? 1 : 0) - (a.profile ? 1 : 0));

      setMatches(result);
    } catch (e) {
      console.error("[ContactsScreen] loadContacts error", e);
    } finally {
      setLoading(false);
    }
  };

  const invite = async (contact: Contacts.Contact) => {
    await Share.share({
      message: `Hey! Join me on Friendspot — the private app for real friend groups. No ads, no strangers. Download: https://friendspot.app/download`,
    });
  };

  const skip = () => router.replace("/(main)/circles" as any);

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
        {onApp.length} of your contacts are on Friendspot.
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
                <Text style={styles.badge}>✅ On Friendspot</Text>
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
  container: { flex: 1, backgroundColor: "#0C0D0B" },
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
