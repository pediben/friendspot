import { View, Text, Image, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

interface AvatarProps {
  uri: string | null;
  name: string;
  size?: number;
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: Colors.bgCard },
  placeholder: {
    backgroundColor: Colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#FFFFFF", fontWeight: "700" },
});
