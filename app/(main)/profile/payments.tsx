/**
 * Payment Links screen — save Venmo username and PayPal email so
 * group mates can settle up with you directly.
 */
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";

const BG    = Colors.bg;
const TEXT  = Colors.text;
const MUTED = Colors.textMuted;
const FAINT = Colors.textFaint;
const SAGE  = Colors.sage;

export default function PaymentsScreen() {
  const { session } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [venmo, setVenmo]     = useState("");
  const [paypal, setPaypal]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from("profiles")
      .select("venmo_username, paypal_email")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setVenmo(data.venmo_username ?? "");
          setPaypal(data.paypal_email ?? "");
        }
        setLoading(false);
      });
  }, [session?.user.id]);

  const save = async () => {
    if (!session?.user.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        venmo_username: venmo.replace(/^@/, "").trim() || null,
        paypal_email:   paypal.trim() || null,
      })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Saved", "Your payment links are updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.heading}>Payments</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={SAGE} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Explainer */}
          <View style={styles.infoCard}>
            <Ionicons name="swap-horizontal-outline" size={20} color={SAGE} />
            <Text style={styles.infoText}>
              Save your Venmo and PayPal so group mates can settle up with you directly — no typing needed.
            </Text>
          </View>

          {/* Venmo */}
          <Text style={styles.label}>VENMO USERNAME</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>@</Text>
            <TextInput
              style={styles.input}
              value={venmo.replace(/^@/, "")}
              onChangeText={setVenmo}
              placeholder="yourhandle"
              placeholderTextColor={FAINT}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {venmo.length > 0 && (
              <TouchableOpacity onPress={() => setVenmo("")}>
                <Ionicons name="close-circle" size={18} color={FAINT} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.helper}>
            Found at venmo.com/@yourhandle or in Venmo → Settings → Username
          </Text>

          {/* PayPal */}
          <Text style={[styles.label, { marginTop: 28 }]}>PAYPAL EMAIL OR LINK</Text>
          <View style={styles.inputRow}>
            <Ionicons name="logo-paypal" size={18} color="#003087" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              value={paypal}
              onChangeText={setPaypal}
              placeholder="you@email.com or paypal.me/handle"
              placeholderTextColor={FAINT}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
            />
            {paypal.length > 0 && (
              <TouchableOpacity onPress={() => setPaypal("")}>
                <Ionicons name="close-circle" size={18} color={FAINT} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.helper}>
            Your PayPal email or paypal.me/yourlink
          </Text>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save payment links</Text>
            }
          </TouchableOpacity>

          <Text style={styles.privacyNote}>
            Your payment handles are only visible to members of your Spots.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  heading: { fontSize: 17, fontWeight: "700", color: TEXT },

  body: { padding: 20, paddingBottom: 60 },

  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "rgba(143,168,118,0.08)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.2)",
    borderRadius: 14, padding: 14, marginBottom: 28,
  },
  infoText: { flex: 1, fontSize: 13, color: MUTED, lineHeight: 19 },

  label: { fontSize: 11, fontWeight: "700", color: FAINT, letterSpacing: 1, marginBottom: 8 },

  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2,
  },
  prefix: { fontSize: 17, color: MUTED, marginRight: 2 },
  input: { flex: 1, fontSize: 16, color: TEXT, paddingVertical: 14 },
  helper: { fontSize: 12, color: FAINT, marginTop: 6, paddingHorizontal: 4 },

  saveBtn: {
    marginTop: 36,
    backgroundColor: SAGE,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  privacyNote: {
    marginTop: 16, fontSize: 12, color: FAINT,
    textAlign: "center", lineHeight: 18,
  },
});
