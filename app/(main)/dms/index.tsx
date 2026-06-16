import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

export default function DMsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.empty}>
        <Ionicons name="chatbubble-ellipses-outline" size={56} color={Colors.textFaint} style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptyBody}>
          DMs are available between people in your shared squads.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 20, fontWeight: "700", color: Colors.text },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: Colors.textMuted, textAlign: "center", lineHeight: 22 },
});
