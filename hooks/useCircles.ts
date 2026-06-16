import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Circle, CircleWithMembers, Profile } from "@/types/database";
import { useAuthStore } from "./useAuth";

export function useCircles() {
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [circles, setCircles] = useState<CircleWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCircles = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("circle_members")
      .select(`
        circle_id,
        circles (
          *,
          circle_members (
            user_id,
            role,
            profiles (*)
          )
        )
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("[useCircles]", error.message);
      return;
    }

    const result: CircleWithMembers[] = (data ?? []).map((row: any) => {
      const c = row.circles;
      const members: Profile[] = c.circle_members.map((m: any) => m.profiles);
      return { ...c, members, member_count: members.length };
    });

    setCircles(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchCircles();

    const sub = supabase
      .channel("circle_members")
      .on(
        "postgres_changes",
        { event: "*", schema: "friendspot", table: "circle_members" },
        fetchCircles
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetchCircles]);

  const createCircle = async (name: string, icon: string) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("circles")
      .insert({ name, icon, created_by: userId })
      .select()
      .single();

    if (error) throw error;
    await fetchCircles();
    return data as Circle;
  };

  return { circles, loading, refetch: fetchCircles, createCircle };
}
