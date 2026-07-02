/**
 * useDirectMessages
 * – useConversations()  → list of unique threads, sorted by latest message
 * – useThread(userId)   → messages with one person + send + mark-read
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { DirectMessage, Profile } from "@/types/database";

// ── Types ────────────────────────────────────────────────────────
export type Conversation = {
  otherUser: Profile;
  lastMessage: DirectMessage;
  unreadCount: number;
};

export type ThreadMessage = DirectMessage & { sender: Profile };

// ── useConversations ─────────────────────────────────────────────
export function useConversations() {
  const { session } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  // Unique channel name per hook instance — prevents "cannot add callbacks after subscribe()"
  // when the hook is mounted in multiple places simultaneously.
  const [channelName] = useState(() => `dm-convos-${Math.random().toString(36).slice(2)}`);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const me = session.user.id;

    // Get all messages involving me
    const { data: msgs } = await supabase
      .schema("friendspot")
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
      .order("created_at", { ascending: false });

    if (!msgs?.length) { setLoading(false); return; }

    // Group by other user, keep latest
    const map = new Map<string, { msg: DirectMessage; unread: number }>();
    for (const msg of msgs) {
      const otherId = msg.sender_id === me ? msg.recipient_id : msg.sender_id;
      if (!map.has(otherId)) {
        map.set(otherId, { msg, unread: 0 });
      }
      // Count unread (sent to me, not yet read)
      if (msg.recipient_id === me && !msg.read_at) {
        const entry = map.get(otherId)!;
        entry.unread += 1;
      }
    }

    // Fetch profiles for each other user
    const otherIds = Array.from(map.keys());
    const { data: profiles } = await supabase
      .schema("friendspot")
      .from("profiles")
      .select("*")
      .in("id", otherIds);

    const profileMap = new Map<string, Profile>(
      (profiles ?? []).map((p: Profile) => [p.id, p])
    );

    const convos: Conversation[] = [];
    for (const [otherId, { msg, unread }] of map.entries()) {
      const otherUser = profileMap.get(otherId);
      if (otherUser) convos.push({ otherUser, lastMessage: msg, unreadCount: unread });
    }

    // Sort by latest message
    convos.sort((a, b) =>
      new Date(b.lastMessage.created_at).getTime() -
      new Date(a.lastMessage.created_at).getTime()
    );

    setConversations(convos);
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    load();

    // Realtime: refresh on any new DM
    // .channel() must be on the root supabase client, NOT on .schema()
    const sub = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "friendspot", table: "direct_messages" },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, channelName]);

  return { conversations, loading, refresh: load };
}

// ── useThread ────────────────────────────────────────────────────
export function useThread(otherUserId: string) {
  const { session } = useAuthStore();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const markedRef = useRef(false);

  const me = session?.user.id;

  const load = useCallback(async () => {
    if (!me || !otherUserId) return;

    const { data } = await supabase
      .schema("friendspot")
      .from("direct_messages")
      .select("*, sender:profiles!direct_messages_sender_id_fkey(*)")
      .or(
        `and(sender_id.eq.${me},recipient_id.eq.${otherUserId}),` +
        `and(sender_id.eq.${otherUserId},recipient_id.eq.${me})`
      )
      .order("created_at", { ascending: true });

    setMessages((data as unknown as ThreadMessage[]) ?? []);
    setLoading(false);
  }, [me, otherUserId]);

  // Mark incoming messages as read
  const markRead = useCallback(async () => {
    if (!me || !otherUserId || markedRef.current) return;
    markedRef.current = true;
    await supabase
      .schema("friendspot")
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", otherUserId)
      .eq("recipient_id", me)
      .is("read_at", null);
  }, [me, otherUserId]);

  const send = useCallback(async (body: string) => {
    if (!me || !otherUserId || !body.trim()) return;
    const { error } = await supabase
      .schema("friendspot")
      .from("direct_messages")
      .insert({
        sender_id: me,
        recipient_id: otherUserId,
        kind: "text",
        body: body.trim(),
      });
    if (error) throw error;
  }, [me, otherUserId]);

  useEffect(() => {
    // Reset so markRead() fires again when switching to a different conversation
    markedRef.current = false;
    load();
    markRead();

    const sub = supabase
      .channel(`dm-thread-${otherUserId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "friendspot", table: "direct_messages" },
        (payload) => {
          const msg = payload.new as DirectMessage;
          const isRelevant =
            (msg.sender_id === me && msg.recipient_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.recipient_id === me);
          if (isRelevant) load();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [load, markRead, otherUserId]);

  return { messages, loading, send };
}
