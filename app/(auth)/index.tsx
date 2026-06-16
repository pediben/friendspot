// Onboarding — 3 slides then phone entry
import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/Colors";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "🔒",
    title: "Radically Private",
    body: "No public profile. No strangers. Only people you invite know you exist.",
  },
  {
    emoji: "🎙️",
    title: "Voice First",
    body: "Drop a voice note. Start a room. Your circles are always there, never loud.",
  },
  {
    emoji: "✨",
    title: "Moments, Together",
    body: "Plan events secretly, share albums, split expenses — all in one place.",
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const next = () => {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      router.push("/(auth)/phone");
    }
  };

  return (
    <LinearGradient colors={["#0F0F1A", "#1A0A2E"]} style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
        keyExtractor={(_, i) => String(i)}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={next} activeOpacity={0.85}>
        <Text style={styles.buttonText}>
          {activeIndex < SLIDES.length - 1 ? "Next" : "Get Started"}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  slide: {
    width,
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emoji: { fontSize: 72, marginBottom: 32 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 17,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 26,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: { backgroundColor: Colors.purple, width: 24 },
  button: {
    backgroundColor: Colors.purple,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 48,
    width: width - 80,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
