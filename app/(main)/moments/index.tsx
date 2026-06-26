import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMoments } from "@/hooks/useMoments";
import { MomentWithCircle } from "@/types/database";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { LogoMark } from "@/components/ui/LogoMark";

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
        {/* Left: logo + title */}
        <View style={styles.logoRow}>
          <LogoMark size={24} />
          <Text style={styles.heading}>Moments</Text>
        </View>

        {/* Right: actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.glassBtn} onPress={() => router.push("/(main)/dms" as any)}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="rgba(244,245,240,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.glassBtn} onPress={() => router.push("/(main)/profile" as any)}>
            <Ionicons name="person-circle-outline" size={20} color="rgba(244,245,240,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/(main)/moments/create")}
          >
            <LinearGradient colors={["#9FBD84", "#7A9B63"]} style={styles.addBtnGradient}>
              <Ionicons name="add" size={22} color="#0C0D0B" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.purple} style={{ marginTop: 80 }} />
      ) : moments.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScroll} showsVerticalScrollIndicator={false}>
          {/* Heading */}
          <Text style={styles.emptyTitle}>Your moments live here</Text>
          <Text style={styles.emptyBody}>
            Create a moment for a trip, birthday, dinner — anything worth remembering.
          </Text>

          {/* Free plan badge */}
          <View style={styles.planBadge}>
            <Ionicons name="images-outline" size={14} color={Colors.sage} />
            <Text style={styles.planText}>
              <Text style={{ color: Colors.sage, fontWeight: "700" }}>Free plan: </Text>
              1 photo per moment · Upgrade for unlimited albums
            </Text>
          </View>

          {/* Demo preview cards */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>PREVIEW</Text>

            {/* Demo card 1 */}
            <View style={[styles.card, styles.demoCard]}>
              <View style={styles.cardTop}>
                <View style={styles.demoTextBlock}>
                  <View style={[styles.demoLine, { width: "55%", opacity: 0.5 }]} />
                </View>
                <View style={styles.datePill}>
                  <Text style={styles.dateText}>Jul 4</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.demoSpotRow}>
                  <View style={styles.demoSpotDot} />
                  <View style={[styles.demoLine, { width: 64, height: 10 }]} />
                </View>
                <View style={styles.badges}>
                  <View style={styles.badge}>
                    <Ionicons name="images-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.badgeText}>1 Photo</Text>
                  </View>
                  <View style={styles.badge}>
                    <Ionicons name="cash-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.badgeText}>Expenses</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Demo card 2 */}
            <View style={[styles.card, styles.demoCard]}>
              <View style={styles.cardTop}>
                <View style={styles.demoTextBlock}>
                  <View style={[styles.demoLine, { width: "40%", opacity: 0.4 }]} />
                </View>
                <View style={styles.datePill}>
                  <Text style={styles.dateText}>Aug 18</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.demoSpotRow}>
                  <View style={[styles.demoSpotDot, { backgroundColor: "rgba(139,92,246,0.4)" }]} />
                  <View style={[styles.demoLine, { width: 80, height: 10 }]} />
                </View>
                <View style={styles.badges}>
                  <View style={styles.badge}>
                    <Ionicons name="images-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.badgeText}>1 Photo</Text>
                  </View>
                  <View style={[styles.badge, styles.secretBadge]}>
                    <Ionicons name="lock-closed" size={12} color={Colors.purple} />
                    <Text style={[styles.badgeText, { color: Colors.purple }]}>Secret</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(main)/moments/create")}
          >
            <LinearGradient colors={["#9FBD84", "#7A9B63"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.emptyBtnGradient}>
              <Ionicons name="add" size={18} color="#0C0D0B" style={{ marginRight: 6 }} />
              <Text style={styles.emptyBtnText}>Create your first moment</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
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
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { fontSize: 28, fontWeight: "800", color: Colors.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  glassBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  addBtnGradient: {
    width: 40, height: 40,
    alignItems: "center", justifyContent: "center",
  },
  card: {
    backgroundColor: "#13150F",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
  // Empty state
  emptyScroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 120, alignItems: "center" },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: Colors.text, marginBottom: 10, textAlign: "center" },
  emptyBody: { fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 21, marginBottom: 20 },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(143,168,118,0.1)",
    borderWidth: 1,
    borderColor: "rgba(143,168,118,0.25)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 32,
  },
  planText: { fontSize: 12, color: Colors.textMuted, flexShrink: 1 },

  // Demo cards
  demoSection: { width: "100%", marginBottom: 28 },
  demoLabel: {
    fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.2)",
    letterSpacing: 1.4, marginBottom: 12,
  },
  demoCard: { opacity: 0.55 },
  demoTextBlock: { flex: 1, justifyContent: "center" },
  demoLine: {
    height: 14, borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  demoSpotRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  demoSpotDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "rgba(143,168,118,0.4)",
  },

  emptyBtn: {
    borderRadius: 40,
    overflow: "hidden",
  },
  emptyBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  emptyBtnText: { color: "#0C0D0B", fontSize: 15, fontWeight: "700" },
});
