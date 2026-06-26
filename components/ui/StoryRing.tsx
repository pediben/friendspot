/**
 * StoryRing
 * Wraps an Avatar with an animated gradient ring when the user has active stories.
 * Tap → navigate to story viewer.
 */
import { TouchableOpacity, View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { Avatar } from "./Avatar";

interface StoryRingProps {
  userId: string;
  uri: string | null;
  name: string;
  size?: number;
  hasStory?: boolean;
  hasUnseenStory?: boolean; // true = vivid ring, false = muted ring
}

export function StoryRing({
  userId,
  uri,
  name,
  size = 40,
  hasStory = false,
  hasUnseenStory = false,
}: StoryRingProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!hasUnseenStory) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [hasUnseenStory]);

  if (!hasStory) {
    return <Avatar uri={uri} name={name} size={size} />;
  }

  const ring = size + 6;
  const ringColor   = hasUnseenStory ? "#C9A84C" : "rgba(255,255,255,0.25)";
  const ringWidth   = hasUnseenStory ? 2.5 : 1.5;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(main)/stories/${userId}` as any)}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            borderColor: ringColor,
            borderWidth: ringWidth,
            transform: [{ scale: pulse }],
          },
        ]}
      >
        <View style={styles.inner}>
          <Avatar uri={uri} name={name} size={size} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    // 1px gap between ring and avatar
    padding: 2,
  },
});
