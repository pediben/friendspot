/**
 * Messages screen — conversation list
 */
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConversations, Conversation } from "@/hooks/useDirectMessages";
import { StoryRing } from "@/components/ui/StoryRing";
import { useStoriesStatus } from "@/hooks/useStoriesStatus";
import { timeAgo } from "@/lib/timeAgo";
import { Colors } from "@/constants/Colors";
import { LogoMark } from "@/components/ui/LogoMark";

// ─── Tokens ─────────────────────────────────────────────────────
const BG     = Colors.bg;
const CARD   = "#111310";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT   = Colors.text;
const MUTED  = Colors.textMuted;
const FAINT  = Colors.textFaint;
const SAGE   = Colors.sage;

export default function MessagesScreen() {
  const { conversations, loading } = useConversations();
  const otherUserIds = conversations.map(c => c.otherUser.id);
  const storyStatus = useStoriesStatus(otherUserIds);

  const renderItem = ({ item }: { item: Conversation }) => {
    const { otherUser, lastMessage, unreadCount } = item;
    const isMine = lastMessage.sender_id !== otherUser.id;
    const preview =
      lastMessage.kind === "text"
        ? (isMine ? `You: ${lastMessage.body ?? ""}` : lastMessage.body ?? "")
        : lastMessage.kind === "voice"
        ? (isMine ? "You sent a voice message" : "Voice message")
        : (isMine ? "You sent a photo" : "Photo");
    const st = storyStatus[otherUser.id] ?? { hasStory: false, hasUnseenStory: false };

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/(main)/dms/${otherUser.id}` as any)}
        activeOpacity={0.7}
      >
        <StoryRing
          userId={otherUser.id}
          uri={otherUser.avatar_url}
          name={otherUser.display_name}
          size={50}
          hasStory={st.hasStory}
          hasUnseenStory={st.hasUnseenStory}
        />

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName} numberOfLines={1}>
              {otherUser.display_name}
            </Text>
            <Text style={styles.rowTime}>
              {timeAgo(lastMessage.created_at)}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text
              style={[styles.rowPreview, unreadCount > 0 && styles.rowPreviewBold]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LogoMark size={26} />
          <Text style={styles.heading}>Messages</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.meBtn}
            onPress={() => router.push("/(main)/profile")}
            activeOpacity={0.75}
          >
            <Ionicons name="person-circle-outline" size={30} color={SAGE} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={SAGE} style={{ marginTop: 80 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={SAGE} />
          </View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyBody}>
            Message anyone in your Spots — tap their name inside a Spot to start a DM.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.otherUser.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 68,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heading: {
    fontSize: 26, fontWeight: "800", color: TEXT, letterSpacing: -0.5,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  meBtn: {
    padding: 2,
  },

  list: { paddingHorizontal: 20, paddingBottom: 120 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 14,
  },
  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rowName: { fontSize: 16, fontWeight: "700", color: TEXT, flex: 1, marginRight: 8 },
  rowTime: { fontSize: 12, color: FAINT },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPreview: { fontSize: 14, color: MUTED, flex: 1, marginRight: 8 },
  rowPreviewBold: { color: TEXT, fontWeight: "600" },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: SAGE,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#000" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 48 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(143,168,118,0.10)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: TEXT, marginBottom: 10 },
  emptyBody: { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 22 },
});
