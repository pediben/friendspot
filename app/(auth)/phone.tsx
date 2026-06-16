import { useState } from "react";
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
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";

export default function EmailAuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || password.length < 6) {
      Alert.alert("Check your details", "Enter a valid email and a password of at least 6 characters.");
      return;
    }

    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      setLoading(false);
      if (error) {
        Alert.alert("Sign up failed", error.message);
      } else {
        // New user — go to profile setup
        router.replace("/(auth)/profile-setup");
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      setLoading(false);
      if (error) {
        Alert.alert("Sign in failed", error.message);
      } else {
        const isNew = !data.user?.user_metadata?.display_name;
        router.replace(isNew ? "/(auth)/profile-setup" : "/(auth)/contacts");
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
      >
        <Text style={styles.title}>
          {mode === "signup" ? "Create account" : "Welcome back"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "signup"
            ? "Join your circle. No public profile."
            : "Sign in to continue."}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.35)"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          autoFocus
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleAuth}
          returnKeyType="go"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === "signup" ? "signin" : "signup")}
          style={styles.switchRow}
        >
          <Text style={styles.switchText}>
            {mode === "signup"
              ? "Already have an account? "
              : "Don't have an account? "}
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
  container: { flex: 1, backgroundColor: "#0F0F1A" },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 48,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 40,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 17,
    color: "#FFFFFF",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  button: {
    backgroundColor: Colors.purple,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  switchRow: { marginTop: 28, alignItems: "center" },
  switchText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },
  switchLink: { color: Colors.purple, fontWeight: "600" },
  fine: {
    marginTop: 32,
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
  },
});
