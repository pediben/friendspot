import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { useAuthStore } from "@/hooks/useAuth";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function MainLayout() {
  const { session } = useAuthStore();

  useEffect(() => {
    if (!session) {
      router.replace("/(auth)");
    }
  }, [session]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0F0F1A",
          borderTopColor: "rgba(255,255,255,0.08)",
          paddingBottom: 8,
          height: 80,
        },
        tabBarActiveTintColor: Colors.purple,
        tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="circles"
        options={{
          title: "Squads",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipse-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="moments"
        options={{
          title: "Moments",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dms"
        options={{
          title: "DMs",
          tabBarButton: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarButton: () => null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
