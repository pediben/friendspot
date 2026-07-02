/**
 * Messages screen — conversation list
 */
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Image,
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
    const isMine = lastMessage ? lastMessage.sender_id !== otherUser.id : false;
    const preview = !lastMessage
      ? "No messages yet"
      : lastMessage.kind === "text"
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
              {lastMessage ? timeAgo(lastMessage.created_at) : ""}
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
        <ScrollView contentContainerStyle={styles.emptyScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={SAGE} />
          </View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyBody}>
            Message anyone in your Spots — tap their name inside a Spot to start a DM.
          </Text>

          {/* Demo preview */}
          <Text style={styles.demoLabel}>PREVIEW</Text>
          {[
            { avatar: "https://i.pravatar.cc/100?img=47", color: SAGE,      unread: 0 },
            { avatar: "https://i.pravatar.cc/100?img=32", color: "#8B5CF6", unread: 2 },
            { avatar: "https://i.pravatar.cc/100?img=11", color: "#F59E0B", unread: 0 },
          ].map((d, i) => (
            <View key={i} style={styles.demoRow}>
              <Image source={{ uri: d.avatar }} style={[styles.demoAvatar, { borderColor: `${d.color}50` }]} />
              <View style={styles.demoRowBody}>
                <View style={styles.demoRowTop}>
                  <View style={[styles.demoLine, { width: "40%", height: 13 }]} />
                  <View style={[styles.demoLine, { width: "12%", height: 10 }]} />
                </View>
                <View style={styles.demoRowBottom}>
                  <View style={[styles.demoLine, { width: "60%", height: 11, marginTop: 5 }]} />
                  {d.unread > 0 && (
                    <View style={styles.demoBadge}>
                      <Text style={styles.demoBadgeText}>{d.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
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
  emptyScroll: { alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 120 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(143,168,118,0.10)",
    borderWidth: 1, borderColor: "rgba(143,168,118,0.2)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: TEXT, marginBottom: 10, textAlign: "center" },
  emptyBody: { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 22 },

  demoLabel: { fontSize: 10, fontWeight: "700", color: FAINT, letterSpacing: 1.5, marginTop: 36, marginBottom: 12, alignSelf: "flex-start" },
  demoRow: { flexDirection: "row", alignItems: "center", width: "100%", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 14, opacity: 0.55 },
  demoAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2 },
  demoRowBody: { flex: 1 },
  demoRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  demoRowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  demoLine: { height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.12)" },
  demoBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: SAGE, alignItems: "center", justifyContent: "center" },
  demoBadgeText: { fontSize: 11, fontWeight: "800", color: "#000" },
});
