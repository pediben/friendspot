import { Redirect } from "expo-router";
import { useAuthStore } from "@/hooks/useAuth";

export default function Index() {
  const { session, loading } = useAuthStore();

  if (loading) return null; // splash overlay handles this

  return <Redirect href={session ? "/(main)/circles" : "/(auth)"} />;
}
