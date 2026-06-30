import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // Guard: if no phone param, go back
  useEffect(() => {
    if (!phone) {
      Alert.alert("Something went wrong", "Please enter your phone number again.");
      router.replace("/(auth)/phone");
    }
  }, [phone]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const verify = async () => {
    if (code.length !== 6) return;
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });

    setLoading(false);

    if (error) {
      Alert.alert("Wrong code", "Double-check the code and try again.");
      setCode("");
    } else {
      // New user → profile setup → contacts; returning user → main app
      const isNew = !data.user?.user_metadata?.display_name;
      router.replace(isNew ? "/(auth)/profile-setup" : "/(main)/circles");
    }
  };

  const resend = async () => {
    if (resendCooldown > 0 || !phone) return;
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      Alert.alert("Couldn't resend", error.message);
    } else {
      setResendCooldown(30);
      Alert.alert("Sent", "A new code is on its way.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>
        Sent to {phone}
      </Text>

      <TouchableOpacity onPress={() => inputRef.current?.focus()} activeOpacity={1}>
        <TextInput
          ref={inputRef}
          style={styles.codeInput}
          value={code}
          onChangeText={(v) => {
            setCode(v.replace(/\D/g, "").slice(0, 6));
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          onSubmitEditing={verify}
        />
        {/* Visual digit boxes */}
        <View style={styles.boxes} pointerEvents="none">
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={[styles.box, code.length === i && styles.boxActive]}
            >
              <Text style={styles.digit}>{code[i] ?? ""}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, (loading || code.length < 6) && styles.buttonDisabled]}
        onPress={verify}
        disabled={loading || code.length < 6}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={resend} disabled={resendCooldown > 0} style={{ marginTop: 24 }}>
        <Text style={[styles.resend, resendCooldown > 0 && { opacity: 0.4 }]}>
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get it? Resend"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C0D0B",
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  title: { fontSize: 30, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 40,
  },
  codeInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  boxes: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 32,
    justifyContent: "center",
  },
  box: {
    width: 48,
    height: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderColor: Colors.purple },
  digit: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  button: {
    backgroundColor: Colors.purple,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  resend: { color: Colors.purple, fontSize: 15, textAlign: "center" },
});
