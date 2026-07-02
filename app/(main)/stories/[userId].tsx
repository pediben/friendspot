/**
 * Story Viewer — tap through a user's active stories.
 * Progress bars at top, tap left/right to navigate, hold to pause.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Image, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Alert, ActivityIndicator, Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, getSignedUrl } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";

const { width: W, height: H } = Dimensions.get("window");
const STORY_DURATION = 5000; // ms per story

type Story = {
  id: string;
  author_id: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  signedUrl?: string;
  author?: { display_name: string; avatar_url: string | null };
};

export default function StoryViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useAuthStore();
  const myId = session?.user.id;

  const [stories, setStories] = useState<Story[]>([]);
  const [index, setIndex]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused]   = useState(false);

  const progress   = useRef(new Animated.Value(0)).current;
  const anim       = useRef<Animated.CompositeAnimation | null>(null);

  // ── Load stories ──────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("id, author_id, media_url, caption, created_at, author:profiles!author_id(display_name, avatar_url)")
        .eq("author_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (error || !data?.length) {
        Alert.alert("No stories", "This person has no active stories.");
        router.back();
        return;
      }

      // Resolve signed URLs
      const resolved = await Promise.all(
        data.map(async (s: any) => ({
          ...s,
          signedUrl: await getSignedUrl("stories", s.media_url),
        }))
      );
      setStories(resolved as Story[]);
      setLoading(false);
    })();
  }, [userId]);

  // ── Mark as viewed ────────────────────────────────────────
  const markViewed = useCallback(async (storyId: string) => {
    if (!myId || myId === userId) return;
    await supabase
      .from("story_views")
      .upsert({ story_id: storyId, viewer_id: myId }, { onConflict: "story_id,viewer_id" });
  }, [myId, userId]);

  const advanceRef = useRef<() => void>(() => {});
  useEffect(() => { advanceRef.current = advance; });

  // ── Progress animation ────────────────────────────────────
  const startProgress = useCallback(() => {
    progress.setValue(0);
    anim.current?.stop();
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    anim.current.start(({ finished }) => {
      if (finished) advanceRef.current();
    });
  }, [index, stories.length]);

  useEffect(() => {
    if (!loading && stories.length > 0) {
      startProgress();
      markViewed(stories[index].id);
    }
    return () => anim.current?.stop();
  }, [index, loading]);

  useEffect(() => {
    if (paused) {
      anim.current?.stop();
    } else if (!loading) {
      anim.current?.start(({ finished }) => {
        if (finished) advanceRef.current();
      });
    }
  }, [paused, loading]);

  const advance = () => {
    if (index < stories.length - 1) {
      setIndex(i => i + 1);
    } else {
      router.back();
    }
  };

  const goBack = () => {
    if (index > 0) setIndex(i => i - 1);
    else router.back();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  const story  = stories[index];
  const author = (story.author as any);
  const ago    = timeAgo(story.created_at);

  return (
    <View style={styles.container}>
      {/* Background media */}
      {story.signedUrl ? (
        <Image source={{ uri: story.signedUrl }} style={styles.media} resizeMode="cover" />
      ) : (
        <View style={[styles.media, styles.mediaFallback]} />
      )}

      {/* Dim overlay */}
      <View style={styles.overlay} />

      {/* Progress bars */}
      <View style={styles.progressRow}>
        {stories.map((_, i) => (
          <View key={i} style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: i < index
                    ? "100%"
                    : i === index
                      ? progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] })
                      : "0%",
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Avatar uri={author?.avatar_url ?? null} name={author?.display_name ?? ""} size={36} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.authorName}>{author?.display_name}</Text>
          <Text style={styles.agoText}>{ago}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {story.caption ? (
        <View style={styles.captionWrap}>
          <Text style={styles.caption}>{story.caption}</Text>
        </View>
      ) : null}

      {/* Tap zones */}
      <Pressable
        style={styles.leftZone}
        onPress={goBack}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
      />
      <Pressable
        style={styles.rightZone}
        onPress={advance}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
      />
    </View>
  );
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)  return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center:    { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  media:     { position: "absolute", width: W, height: H },
  mediaFallback: { backgroundColor: "#1a1a2e" },
  overlay:   { position: "absolute", width: W, height: H, backgroundColor: "rgba(0,0,0,0.2)" },

  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 56,
    position: "absolute",
    top: 0, left: 0, right: 0,
  },
  progressTrack: {
    flex: 1, height: 2.5,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 2 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 72,
    position: "absolute",
    top: 0, left: 0, right: 0,
  },
  authorName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  agoText:    { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 1 },
  closeBtn:   { padding: 4 },

  captionWrap: {
    position: "absolute",
    bottom: 80, left: 16, right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12, padding: 12,
  },
  caption: { color: "#fff", fontSize: 15, lineHeight: 22 },

  leftZone:  { position: "absolute", left: 0,    top: 120, width: W * 0.35, height: H - 120 },
  rightZone: { position: "absolute", right: 0,   top: 120, width: W * 0.65, height: H - 120 },
});
