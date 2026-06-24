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
import Svg, { Path, Circle, Rect, Line, Polyline } from "react-native-svg";
import { Colors } from "@/constants/Colors";

const { width } = Dimensions.get("window");
const SAGE = Colors.sage;
const ICON_SIZE = 80;

// Sage SVG icons — no emojis
function IconPrivate() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 80 80" fill="none">
      {/* Shield */}
      <Path
        d="M40 8 L68 20 L68 42 C68 57 54 70 40 74 C26 70 12 57 12 42 L12 20 Z"
        stroke={SAGE}
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Lock body */}
      <Rect x="28" y="38" width="24" height="18" rx="3" fill={SAGE} opacity="0.9" />
      {/* Lock shackle */}
      <Path
        d="M32 38 L32 32 C32 26.5 48 26.5 48 32 L48 38"
        stroke={SAGE}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Keyhole */}
      <Circle cx="40" cy="46" r="3" fill="#0C0D0B" />
      <Rect x="38.5" y="47" width="3" height="5" rx="1" fill="#0C0D0B" />
    </Svg>
  );
}

function IconVoice() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 80 80" fill="none">
      {/* Mic body */}
      <Rect x="30" y="10" width="20" height="34" rx="10" fill={SAGE} opacity="0.9" />
      {/* Mic arc */}
      <Path
        d="M20 40 C20 56 60 56 60 40"
        stroke={SAGE}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Stand */}
      <Line x1="40" y1="56" x2="40" y2="66" stroke={SAGE} strokeWidth="3" strokeLinecap="round" />
      <Line x1="30" y1="66" x2="50" y2="66" stroke={SAGE} strokeWidth="3" strokeLinecap="round" />
      {/* Sound waves */}
      <Path d="M12 36 C12 44 68 44 68 36" stroke={SAGE} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4" />
    </Svg>
  );
}

function IconMoments() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 80 80" fill="none">
      {/* Big star */}
      <Path
        d="M40 12 L44.5 30 L63 30 L48.5 41 L53.5 59 L40 49 L26.5 59 L31.5 41 L17 30 L35.5 30 Z"
        stroke={SAGE}
        strokeWidth="2.5"
        fill={SAGE}
        opacity="0.85"
        strokeLinejoin="round"
      />
      {/* Small sparkle top-right */}
      <Path
        d="M61 14 L62.5 19 L68 20 L62.5 21.5 L61 27 L59.5 21.5 L54 20 L59.5 18.5 Z"
        fill={SAGE}
        opacity="0.55"
      />
      {/* Tiny sparkle bottom-right */}
      <Path
        d="M66 52 L67 55 L70 56 L67 57 L66 60 L65 57 L62 56 L65 55 Z"
        fill={SAGE}
        opacity="0.4"
      />
    </Svg>
  );
}

const SLIDES = [
  {
    Icon: IconPrivate,
    title: "Radically Private",
    body: "No public profile. No strangers. Only people you invite know you exist.",
  },
  {
    Icon: IconVoice,
    title: "Voice First",
    body: "Drop a voice note. Start a room. Your circles are always there, never loud.",
  },
  {
    Icon: IconMoments,
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
    <LinearGradient colors={["#0C0D0B", "#101410"]} style={styles.container}>
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
            <View style={styles.iconWrap}>
              <item.Icon />
            </View>
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
  iconWrap: {
    marginBottom: 36,
    // subtle sage glow
    shadowColor: Colors.sage,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
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
  dotActive: { backgroundColor: Colors.sage, width: 24 },
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
