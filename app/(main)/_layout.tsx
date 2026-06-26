/**
 * Main tab layout — 6 tabs: Spots · Moments · Live · $ · Messages · Me
 *
 * All other screens (join, stories, about, dms/[id], circles/[id]/*, etc.)
 * live inside the tab stacks but are NOT shown in the tab bar.
 */
import { useEffect } from "react";
import { View } from "react-native";
import { Tabs, router } from "expo-router";
import { useAuthStore } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { LogoMark } from "@/components/ui/LogoMark";

const ACTIVE   = "#8FA876";   // sage (brand color)
const INACTIVE = "rgba(255,255,255,0.32)";
const TAB_BG   = "#0C0D0B";

export default function MainLayout() {
  const { session } = useAuthStore();
  useNotifications();

  useEffect(() => {
    if (!session) router.replace("/(auth)");
  }, [session]);

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
      {/* ── Tab 1: Spots ── */}
      <Tabs.Screen
        name="circles"
        options={{
          title: "Friendspots",
          tabBarIcon: ({ focused }) => (
            <View style={{ opacity: focused ? 1 : 0.35 }}>
              <LogoMark size={26} />
            </View>
          ),
        }}
      />

      {/* ── Tab 2: Moments ── */}
      <Tabs.Screen
        name="moments"
        options={{
          title: "Moments",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Tab 3: Live (Room + Private) ── */}
      <Tabs.Screen
        name="live"
        options={{
          title: "Live",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Tab 4: Money ($) ── */}
      <Tabs.Screen
        name="finance"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Messages + Me: accessible via top-right header icons ── */}
      <Tabs.Screen name="dms"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="profile" options={{ tabBarButton: () => null }} />

      {/* ── Hidden routes (no tab bar entry) ── */}
      <Tabs.Screen name="join"    options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="stories" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="about"   options={{ tabBarButton: () => null }} />
    </Tabs>
  );
}
