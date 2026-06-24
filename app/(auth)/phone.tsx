import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { LogoMark } from "@/components/ui/LogoMark";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";

const SAGE = Colors.sage;
const SAGE_DIM = Colors.sageDim;

export default function EmailAuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);
  const passRef = useRef<TextInput>(null);

  const handleAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || password.length < 6) {
      Alert.alert("Check your details", "Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email: trimmedEmail, password });
      setLoading(false);
      if (error) Alert.alert("Sign up failed", error.message);
      else router.replace("/(auth)/profile-setup");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      setLoading(false);
      if (error) Alert.alert("Sign in failed", error.message);
      else {
        const isNew = !data.user?.user_metadata?.display_name;
        router.replace(isNew ? "/(auth)/profile-setup" : "/(main)/circles");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBg}>
            <LogoMark size={34} />
          </View>
          <Text style={styles.logoName}>Friendspot</Text>
        </View>

        {/* Heading */}
        <Text style={styles.title}>
          {mode === "signup" ? "Create account" : "Welcome back"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "signup"
            ? "Private by design. No strangers, ever."
            : "Good to see you again."}
        </Text>

        {/* Email */}
        <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocus]}>
          <Text style={styles.inputLabel}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="rgba(244,245,240,0.28)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            onSubmitEditing={() => passRef.current?.focus()}
            returnKeyType="next"
            autoFocus
          />
        </View>

        {/* Password */}
        <View style={[styles.inputWrap, passFocused && styles.inputWrapFocus]}>
          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            ref={passRef}
            style={styles.input}
            placeholder="6+ characters"
            placeholderTextColor="rgba(244,245,240,0.28)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPassFocused(true)}
            onBlur={() => setPassFocused(false)}
            onSubmitEditing={handleAuth}
            returnKeyType="go"
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.btnOuter}
        >
          <LinearGradient
            colors={loading ? ["#4a5a42", "#3a4a34"] : [SAGE, SAGE_DIM]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>
                  {mode === "signup" ? "Create account" : "Sign in"}
                </Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* Switch mode */}
        <TouchableOpacity
          onPress={() => setMode(mode === "signup" ? "signin" : "signup")}
          style={styles.switchRow}
        >
          <Text style={styles.switchText}>
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <Text style={styles.switchLink}>
              {mode === "signup" ? "Sign in" : "Create one"}
            </Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.fine}>
          By continuing you agree to our Terms and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 48,
  },

  // Logo
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 48,
  },
  logoBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(143,168,118,0.12)",
    borderWidth: 1,
    borderColor: "rgba(143,168,118,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.3,
  },

  // Heading
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    marginBottom: 36,
    lineHeight: 22,
  },

  // Input
  inputWrap: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputWrapFocus: {
    borderColor: SAGE,
    backgroundColor: "rgba(143,168,118,0.06)",
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(244,245,240,0.35)",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  input: {
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },

  // Button
  btnOuter: { marginTop: 8, borderRadius: 16, overflow: "hidden" },
  btn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Switch
  switchRow: { marginTop: 28, alignItems: "center" },
  switchText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
  },
  switchLink: { color: SAGE, fontWeight: "600" },

  fine: {
    marginTop: 28,
    fontSize: 12,
    color: Colors.textFaint,
    textAlign: "center",
    lineHeight: 18,
  },
});
