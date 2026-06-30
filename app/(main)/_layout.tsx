/**
 * Main tab layout — Spots · Invite · Live · Moments · Finance
 * Messages is hidden from the tab bar — accessible via the Spots header icon.
 */
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Tabs, router } from "expo-router";
import { useAuthStore } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { LogoMark } from "@/components/ui/LogoMark";

const ACTIVE   = "#8FA876";   // sage (brand color)
const INACTIVE = "rgba(255,255,255,0.32)";
const TAB_BG   = "#0C0D0B";

export default function MainLayout() {
  const { session, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && !session) router.replace("/(auth)");
  }, [session, loading]);

  // Block rendering until auth state is confirmed — prevents tab screens
  // from mounting (and firing Supabase queries) before session is known
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: TAB_BG, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={ACTIVE} />
      </View>
    );
  }
  if (!session) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopColor: "rgba(255,255,255,0.07)",
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor:   ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontSize: 9, fontWeight: "700", letterSpacing: 0, marginTop: -4 },
        tabBarItemStyle: { gap: 2 },
      }}
    >
      {/* ── Tab 1: Spots (friend groups) ── */}
      <Tabs.Screen
        name="circles"
        options={{
          title: "Spots",
          tabBarIcon: ({ focused }) => (
            <View style={{ opacity: focused ? 1 : 0.35 }}>
              <LogoMark size={26} />
            </View>
          ),
        }}
      />

      {/* ── Tab 2: Invite (calendar + send invites) ── */}
      <Tabs.Screen
        name="invites"
        options={{
          title: "Invite",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="send-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Tab 3: Live (voice rooms) ── */}
      <Tabs.Screen
        name="live"
        options={{
          title: "Live",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Tab 4: Moments (events + albums) ── */}
      <Tabs.Screen
        name="moments"
        options={{
          title: "Moments",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Tab 5: Finance (Bets, Rounds, Expenses) ── */}
      <Tabs.Screen
        name="finance"
        options={{
          title: "Finance",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Messages: hidden from tab bar, accessible via Spots header icon ── */}
      <Tabs.Screen name="dms" options={{ tabBarButton: () => null }} />

      {/* ── Profile: accessible via header icon on Spots tab ── */}
      <Tabs.Screen name="profile" options={{ tabBarButton: () => null }} />

      {/* ── Pro paywall: presented as modal ── */}
      <Tabs.Screen name="pro" options={{ tabBarButton: () => null }} />

      {/* ── Hidden routes (no tab bar entry) ── */}
      <Tabs.Screen name="join"    options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="stories" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="about"   options={{ tabBarButton: () => null }} />
    </Tabs>
  );
}
