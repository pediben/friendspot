import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useAuthStore } from "@/hooks/useAuth";

export default function AuthLayout() {
  const { session } = useAuthStore();

  useEffect(() => {
    if (session) {
      router.replace("/(main)/circles");
    }
  }, [session]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0C0D0B" },
        animation: "slide_from_right",
      }}
    />
  );
}
