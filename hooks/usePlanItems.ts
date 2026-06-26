/**
 * usePlanItems — shared checklist items for a Spot.
 * Each item has text, optional category, optional assignee, and a done flag.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "./useAuth";
import { Profile } from "@/types/database";

export type PlanItem = {
  id: string;
  circle_id: string;
  text: string;
  category: string | null;
  assigned_to: string | null;
  is_done: boolean;
  created_by: string;
  created_at: string;
  assignee?: Profile | null;
  creator?: Profile | null;
};

export function usePlanItems(circleId: string) {
  const { session } = useAuthStore();
  const me = session?.user.id;

  const [items, setItems]   = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!circleId) return;
    const { data, error } = await supabase
      .from("plan_items")
      .select(`
        *,
        assignee:profiles!plan_items_assigned_to_fkey(*),
        creator:profiles!plan_items_created_by_fkey(*)
      `)
      .eq("circle_id", circleId)
      .order("is_done", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[usePlanItems]", error.message);
      setLoading(false);
      return;
    }
    setItems((data ?? []) as unknown as PlanItem[]);
    setLoading(false);
  }, [circleId]);

  useEffect(() => {
    load();
    const sub = supabase
      .channel(`plan_items:${circleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "friendspot", table: "plan_items", filter: `circle_id=eq.${circleId}` },
        load
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [load, circleId]);

  const addItem = useCallback(async (text: string, category?: string) => {
    if (!me || !text.trim()) return;
    const { error } = await supabase.from("plan_items").insert({
      circle_id: circleId,
      text: text.trim(),
      category: category?.trim() || null,
      created_by: me,
    });
    if (error) throw error;
  }, [me, circleId]);

  const toggleDone = useCallback(async (itemId: string, current: boolean) => {
    const { error } = await supabase
      .from("plan_items")
      .update({ is_done: !current })
      .eq("id", itemId);
    if (error) throw error;
    // Optimistic update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_done: !current } : i));
  }, []);

  const assignItem = useCallback(async (itemId: string, userId: string | null) => {
    const { error } = await supabase
      .from("plan_items")
      .update({ assigned_to: userId })
      .eq("id", itemId);
    if (error) throw error;
  }, []);

  const deleteItem = useCallback(async (itemId: string) => {
    const { error } = await supabase.from("plan_items").delete().eq("id", itemId);
    if (error) throw error;
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const pendingCount = items.filter(i => !i.is_done).length;
  const doneCount    = items.filter(i => i.is_done).length;

  return { items, loading, addItem, toggleDone, assignItem, deleteItem, pendingCount, doneCount };
}
