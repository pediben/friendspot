import { useEffect, useRef, Component } from "react";
import { View, Text, Animated, StyleSheet, Platform, AppState, TouchableOpacity } from "react-native";
import { Stack } from "expo-router";
import { SplashScreen } from "expo-router";

// registerGlobals must be called before any LiveKit usage.
// Wrapped in try/catch so Expo Go doesn't crash (native module absent).
try {
  const { registerGlobals } = require("@livekit/react-native-webrtc");
  registerGlobals();
} catch {
  // Expo Go: WebRTC native module not available — voice rooms require a native build.
}
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserKeys } from "@/hooks/useUserKeys";
import { clearCircleKeyCache } from "@/lib/keyExchange";
import { LogoMark } from "@/components/ui/LogoMark";

SplashScreen.preventAutoHideAsync();

// ─── Error boundary — catches any unhandled render crash ─────────────────────
interface EBState { hasError: boolean }
class AppErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false };

  static getDerivedStateFromError(): EBState {
    SplashScreen.hideAsync().catch(() => {});
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={err.root}>
          <LogoMark size={48} />
          <Text style={err.title}>Something went wrong</Text>
          <Text style={err.body}>Please force-quit and reopen the app.</Text>
          <TouchableOpacity
            style={err.btn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={err.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const err = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", textAlign: "center" },
  body:  { color: "#9CA3AF", fontSize: 15, textAlign: "center" },
  btn:   { marginTop: 8, backgroundColor: "#7C3AED", borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  btnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
});

// ─── Custom animated splash ──────────────────────────────────────────────────
function AppSplash() {
  const spin   = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1, duration: 300, useNativeDriver: true,
    }).start();
    // Spin loop
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1, duration: 2200, useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={[splash.root, { opacity: fadeIn }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <LogoMark size={64} />
      </Animated.View>
    </Animated.View>
  );
}

const splash = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Root layout ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  const { setSession, setLoading, loading } = useAuthStore();
  useNotifications();
  useUserKeys();

  useEffect(() => {
    // Fallback: never stuck > 4s
    const timeout = setTimeout(() => {
      setLoading(false);
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      })
      .catch(() => setLoading(false))
      .finally(() => {
        clearTimeout(timeout);
        SplashScreen.hideAsync().catch(() => {});
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") clearCircleKeyCache();
        setSession(session);
      }
    );

    // React Native doesn't use browser timers, so autoRefreshToken needs
    // help from AppState to know when the app returns to the foreground.
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  // Stack MUST always be rendered — expo-router requires navigator on every render.
  // Overlay the splash on top while loading instead of replacing the Stack.
  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
        </Stack>
        {loading && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <AppSplash />
          </View>
        )}
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
