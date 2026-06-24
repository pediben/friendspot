/**
 * LogoMark — Friendspot triskelion icon
 * Three curved ribbon blades in a sage pinwheel, dark center.
 * Pass `size` to scale, `showWordmark` to include "Friendspot" text beside it.
 */
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { Colors } from "@/constants/Colors";

// Single blade path (before rotation).
// Tip at top-center, sweeps right + down to lower-right, inner edge curves back up.
const BLADE =
  "M50 18 C76 13,88 36,82 57 C77 72,64 80,54 77 " +
  "C46 74,40 65,43 57 C46 49,52 43,52 36 " +
  "C52 28,50 20,50 18Z";

interface Props {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
}

export function LogoMark({ size = 44, showWordmark = false, wordmarkColor = Colors.text }: Props) {
  const icon = (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="fsg" x1="25" y1="8" x2="75" y2="92" gradientUnits="userSpaceOnUse">
          <Stop offset="0"   stopColor="#D6E3BB" stopOpacity="1" />
          <Stop offset="0.45" stopColor="#8FA876" stopOpacity="1" />
          <Stop offset="1"   stopColor="#3E5C30" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Blade 1 — front / top */}
      <Path d={BLADE} fill="url(#fsg)" opacity="0.95" />

      {/* Blade 2 — rotated 120° */}
      <Path d={BLADE} fill="url(#fsg)" opacity="0.78" transform="rotate(120, 50, 50)" />

      {/* Blade 3 — rotated 240° */}
      <Path d={BLADE} fill="url(#fsg)" opacity="0.60" transform="rotate(240, 50, 50)" />

      {/* Center hole — transparent so it shows whatever background it's on */}
      <Circle cx="50" cy="50" r="10" fill="transparent" />
    </Svg>
  );

  if (!showWordmark) return icon;

  return (
    <View style={styles.row}>
      {icon}
      <Text style={[styles.wordmark, { color: wordmarkColor, fontSize: size * 0.48 }]}>
        Friendspot
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordmark: {
    fontWeight: "800",
    letterSpacing: -0.4,
  },
});
