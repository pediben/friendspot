import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Platform, AppState } from "react-native";
import { Stack } from "expo-router";
import { SplashScreen } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserKeys } from "@/hooks/useUserKeys";
import { LogoMark } from "@/components/ui/LogoMark";

SplashScreen.preventAutoHideAsync();

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
      (_event, session) => setSession(session)
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
  );
}
