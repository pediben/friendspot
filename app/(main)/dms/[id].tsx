/**
 * DM Thread screen — 1-on-1 text messages
 */
import { useState, useRef, useEffect } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { useThread, ThreadMessage } from "@/hooks/useDirectMessages";
import { Avatar } from "@/components/ui/Avatar";
import { Profile } from "@/types/database";
import { timeAgo } from "@/lib/timeAgo";

// ─── Tokens ─────────────────────────────────────────────────────
const BG     = "#09090F";
const CARD   = "#111118";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT   = "#FFFFFF";
const MUTED  = "rgba(255,255,255,0.4)";
const FAINT  = "rgba(255,255,255,0.15)";
const SAGE   = "#8FA876";
const BUBBLE_MINE   = "#8FA876";
const BUBBLE_THEIRS = "#1A1A28";

export default function DMThreadScreen() {
  const { id: otherUserId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const insets = useSafeAreaInsets();
  const me = session?.user.id;

  const { messages, loading, send } = useThread(otherUserId);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [draft, setDraft]         = useState("");
  const [sending, setSending]     = useState(false);
  const listRef = useRef<FlatList>(null);

  // Load the other user's profile
  useEffect(() => {
    if (!otherUserId) return;
    supabase
      .schema("friendspot")
      .from("profiles")
      .select("*")
      .eq("id", otherUserId)
      .single()
      .then(({ data }) => setOtherUser(data));
  }, [otherUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setSending(true);
    try {
      await send(text);
    } catch (e: any) {
      Alert.alert("Couldn't send", e.message);
      setDraft(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const renderMsg = ({ item, index }: { item: ThreadMessage; index: number }) => {
    const isMine = item.sender_id === me;
    const prev   = messages[index - 1];
    const showAvatar = !isMine && (!prev || prev.sender_id !== item.sender_id);
    const showTime   = !prev ||
      new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;

    return (
      <View>
        {showTime && (
          <Text style={styles.timestamp}>{timeAgo(item.created_at)}</Text>
        )}
        <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
          {!isMine && (
            <View style={styles.avatarSlot}>
              {showAvatar && (
                <Avatar
                  uri={otherUser?.avatar_url ?? null}
                  name={otherUser?.display_name ?? ""}
                  size={28}
                />
              )}
            </View>
          )}
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
              {item.body}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={MUTED} />
        </TouchableOpacity>
        {otherUser ? (
          <TouchableOpacity style={styles.headerCenter} activeOpacity={0.7}>
            <Avatar uri={otherUser.avatar_url} name={otherUser.display_name} size={34} />
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser.display_name}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerCenter} />
        )}
        <View style={{ width: 36 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <ActivityIndicator color={SAGE} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMsg}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Say hello to {otherUser?.display_name ?? "them"} 👋
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={FAINT}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!draft.trim() || sending) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator color="#000" size="small" />
            : <Ionicons name="arrow-up" size={18} color="#000" />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12, /* overridden inline with insets */
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: BORDER,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 10,
  },
  headerName: {
    fontSize: 16, fontWeight: "700", color: TEXT, letterSpacing: -0.2,
  },

  // Messages
  list: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 8 },

  timestamp: {
    textAlign: "center",
    fontSize: 11,
    color: FAINT,
    marginVertical: 12,
    letterSpacing: 0.3,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
    gap: 8,
  },
  msgRowMine: { flexDirection: "row-reverse" },

  avatarSlot: { width: 28, alignItems: "center" },

  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleMine: {
    backgroundColor: BUBBLE_MINE,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: BUBBLE_THEIRS,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: MUTED,
    lineHeight: 21,
  },
  bubbleTextMine: { color: "#fff", fontWeight: "600" },

  empty: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: { color: FAINT, fontSize: 14 },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  input: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: TEXT,
    borderWidth: 1,
    borderColor: BORDER,
    maxHeight: 120,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: SAGE,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.35 },
});
