import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useMoments } from "@/hooks/useMoments";
import { MomentWithCircle } from "@/types/database";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function MomentsListScreen() {
  const { moments, loading } = useMoments();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const renderMoment = ({ item }: { item: MomentWithCircle }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(main)/moments/${item.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.event_date && (
          <View style={styles.datePill}>
            <Text style={styles.dateText}>{formatDate(item.event_date)}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.circleLabel}>
          {item.circle?.icon ?? "✨"} {item.circle?.name}
        </Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Ionicons name="images-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.badgeText}>Album</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="cash-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.badgeText}>Expenses</Text>
          </View>
          {item.is_secret && (
            <View style={[styles.badge, styles.secretBadge]}>
              <Ionicons name="lock-closed" size={12} color={Colors.purple} />
              <Text style={[styles.badgeText, { color: Colors.purple }]}>Secret</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Moments</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/(main)/moments/create")}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.purple} style={{ marginTop: 80 }} />
      ) : moments.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={56} color={Colors.textFaint} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No moments yet</Text>
          <Text style={styles.emptyBody}>
            Create a moment for an upcoming event, birthday, or trip.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(main)/moments/create")}
          >
            <Text style={styles.emptyBtnText}>Create a moment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={moments}
          keyExtractor={(item) => item.id}
          renderItem={renderMoment}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 16,
  },
  heading: { fontSize: 28, fontWeight: "700", color: Colors.text },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: Colors.bgCard,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: Colors.text, flex: 1 },
  datePill: {
    backgroundColor: "rgba(124,58,237,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dateText: { color: Colors.purpleLight, fontSize: 13, fontWeight: "600" },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  circleLabel: { color: Colors.textMuted, fontSize: 13 },
  badges: { flexDirection: "row", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  secretBadge: { borderColor: "rgba(124,58,237,0.3)" },
  badgeText: { color: Colors.textMuted, fontSize: 11 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: Colors.textMuted, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: Colors.purple,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  emptyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
