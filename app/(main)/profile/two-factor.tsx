/**
 * Two-Factor Authentication screen — enroll or unenroll TOTP via Supabase MFA.
 */
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";

const BG    = Colors.bg;
const TEXT  = Colors.text;
const MUTED = Colors.textMuted;
const FAINT = Colors.textFaint;
const SAGE  = Colors.sage;
const RED   = Colors.red ?? "#EF4444";

type Step = "loading" | "enabled" | "setup" | "verify";

export default function TwoFactorScreen() {
  const insets = useSafeAreaInsets();

  const [step, setStep]           = useState<Step>("loading");
  const [factorId, setFactorId]   = useState<string | null>(null);
  const [qrCode, setQrCode]       = useState<string | null>(null);   // SVG data URI
  const [secret, setSecret]       = useState<string | null>(null);
  const [code, setCode]           = useState("");
  const [busy, setBusy]           = useState(false);

  // Check current MFA enrollment
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.find(f => f.status === "verified");
      if (totp) {
        setFactorId(totp.id);
        setStep("enabled");
      } else {
        setStep("setup");
      }
    });
  }, []);

  // Start enrollment — get QR code
  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error || !data) {
      Alert.alert("Error", error?.message ?? "Could not start 2FA setup.");
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);   // SVG string
    setSecret(data.totp.secret);
    setStep("verify");
  };

  // Verify the code to complete enrollment
  const verifyCode = async () => {
    if (!factorId || code.length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) {
      Alert.alert("Wrong code", "Double-check the code in your authenticator app and try again.");
      setCode("");
      return;
    }
    setStep("enabled");
  };

  // Unenroll
  const disable2FA = () => {
    Alert.alert(
      "Disable 2FA",
      "This will remove two-factor authentication from your account. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable", style: "destructive",
          onPress: async () => {
            if (!factorId) return;
            setBusy(true);
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            setBusy(false);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              setFactorId(null);
              setStep("setup");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.heading}>Two-Factor Auth</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {step === "loading" && (
          <ActivityIndicator color={SAGE} style={{ marginTop: 80 }} />
        )}

        {/* ── Already enabled ── */}
        {step === "enabled" && (
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusIcon}>
                <Ionicons name="shield-checkmark" size={32} color={SAGE} />
              </View>
              <Text style={styles.statusTitle}>2FA is on</Text>
              <Text style={styles.statusBody}>
                Your account is protected with a second layer of security. You'll need your authenticator app when signing in.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.dangerBtn, busy && { opacity: 0.6 }]}
              onPress={disable2FA}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy
                ? <ActivityIndicator color={RED} />
                : <Text style={styles.dangerBtnText}>Disable two-factor auth</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── Setup intro ── */}
        {step === "setup" && (
          <>
            <View style={styles.infoCard}>
              <Ionicons name="shield-outline" size={20} color={SAGE} />
              <Text style={styles.infoText}>
                Two-factor authentication adds an extra layer of security. You'll need an authenticator app like Google Authenticator or Authy.
              </Text>
            </View>

            <View style={styles.stepList}>
              {["Download Google Authenticator or Authy", "Scan the QR code we show you", "Enter the 6-digit code to confirm"].map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
              onPress={startEnroll}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Set up 2FA</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── QR + verify ── */}
        {step === "verify" && (
          <>
            <Text style={styles.scanTitle}>Scan this QR code</Text>
            <Text style={styles.scanBody}>Open your authenticator app and scan the code below.</Text>

            {qrCode ? (
              // Supabase returns an SVG string — render as a data URI image
              <View style={styles.qrWrap}>
                <Image
                  source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}` }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <ActivityIndicator color={SAGE} style={{ marginVertical: 40 }} />
            )}

            {secret && (
              <View style={styles.secretBox}>
                <Text style={styles.secretLabel}>OR ENTER MANUALLY</Text>
                <Text style={styles.secretKey} selectable>{secret}</Text>
              </View>
            )}

            <Text style={styles.codeLabel}>ENTER THE 6-DIGIT CODE</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={t => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={FAINT}
              keyboardType="number-pad"
              textAlign="center"
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (busy || code.length < 6) && { opacity: 0.5 }]}
              onPress={verifyCode}
              disabled={busy || code.length < 6}
              activeOpacity={0.8}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Confirm & enable 2FA</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep("setup")} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
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

  body: { padding: 24, paddingBottom: 60 },

  // Enabled state
  statusCard: {
    alignItems: "center", padding: 32,
    backgroundColor: "rgba(143,168,118,0.07)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.2)",
    borderRadius: 20, marginBottom: 28,
  },
  statusIcon:  { marginBottom: 16 },
  statusTitle: { fontSize: 22, fontWeight: "800", color: TEXT, marginBottom: 10 },
  statusBody:  { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 21 },

  dangerBtn: {
    borderWidth: 1, borderColor: "rgba(239,68,68,0.35)",
    borderRadius: 18, paddingVertical: 16, alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  dangerBtnText: { color: RED, fontSize: 15, fontWeight: "700" },

  // Setup intro
  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "rgba(143,168,118,0.08)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.2)",
    borderRadius: 14, padding: 14, marginBottom: 28,
  },
  infoText: { flex: 1, fontSize: 13, color: MUTED, lineHeight: 19 },

  stepList: { gap: 16, marginBottom: 36 },
  stepRow:  { flexDirection: "row", alignItems: "center", gap: 14 },
  stepNum:  {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(143,168,118,0.15)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  stepNumText: { fontSize: 14, fontWeight: "700", color: SAGE },
  stepText:    { flex: 1, fontSize: 14, color: MUTED, lineHeight: 20 },

  primaryBtn: {
    backgroundColor: SAGE, borderRadius: 18,
    paddingVertical: 16, alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // QR verify
  scanTitle: { fontSize: 20, fontWeight: "700", color: TEXT, textAlign: "center", marginBottom: 8 },
  scanBody:  { fontSize: 14, color: MUTED, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  qrWrap: {
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 16, padding: 16,
    marginBottom: 20,
  },
  qrImage: { width: 200, height: 200 },
  secretBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12, padding: 14, marginBottom: 28, alignItems: "center",
  },
  secretLabel: { fontSize: 10, fontWeight: "700", color: FAINT, letterSpacing: 1, marginBottom: 6 },
  secretKey:   { fontSize: 13, color: MUTED, letterSpacing: 2, fontFamily: "monospace" },
  codeLabel:   { fontSize: 11, fontWeight: "700", color: FAINT, letterSpacing: 1, marginBottom: 10, textAlign: "center" },
  codeInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14, paddingVertical: 18,
    fontSize: 32, fontWeight: "700", color: TEXT,
    letterSpacing: 8, marginBottom: 24,
  },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { color: MUTED, fontSize: 15 },
});
