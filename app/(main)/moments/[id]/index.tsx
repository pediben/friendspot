/**
 * MomentDetailScreen
 * Three tabs: Album | Expenses | Secret Planning (hidden from honoree)
 */
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase, uploadFile } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useAuth";
import { Moment, Photo, Expense, ExpenseSplit, Profile } from "@/types/database";
import { getSignedUrl } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";
import { Avatar } from "@/components/ui/Avatar";

type Tab = "album" | "expenses" | "planning";

export default function MomentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const userId = session?.user.id;

  const [moment, setMoment] = useState<Moment | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("album");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [expenses, setExpenses] = useState<(Expense & { payer: Profile; splits: (ExpenseSplit & { user: Profile })[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInPlanningGroup, setIsInPlanningGroup] = useState(false);

  useEffect(() => {
    loadMoment();
  }, [id]);

  const loadMoment = async () => {
    const [momentRes, photosRes, expensesRes, planningRes] = await Promise.all([
      supabase.from("moments").select("*").eq("id", id).single(),
      supabase.from("photos").select("*").eq("moment_id", id).order("created_at"),
      supabase
        .from("expenses")
        .select("*, payer:profiles!paid_by(*), splits:expense_splits(*, user:profiles(*))")
        .eq("moment_id", id),
      supabase.from("moment_attendees").select("user_id").eq("moment_id", id).eq("user_id", userId ?? ""),
    ]);

    setMoment(momentRes.data);
    const fetchedPhotos = (photosRes.data ?? []) as Photo[];
    setPhotos(fetchedPhotos);

    // Resolve signed URLs for all photos
    const urlMap: Record<string, string> = {};
    await Promise.all(
      fetchedPhotos.map(async (p) => {
        const url = await getSignedUrl("photos", p.image_url);
        if (url) urlMap[p.id] = url;
      })
    );
    setPhotoUrls(urlMap);

    setExpenses((expensesRes.data ?? []) as any);
    setIsInPlanningGroup((planningRes.data ?? []).length > 0);
    setLoading(false);
  };

  const addPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;

    for (const asset of result.assets) {
      const blob = await (await fetch(asset.uri)).blob();
      const path = await uploadFile("photos", userId!, `${id}/${Date.now()}.jpg`, blob, "image/jpeg");
      if (path) {
        await supabase.from("photos").insert({
          moment_id: id,
          uploader_id: userId!,
          image_url: path,
        });
      }
    }
    loadMoment();
  };

  const settleExpense = async (splitId: string) => {
    const { error } = await supabase
      .from("expense_splits")
      .update({ settled: true, settled_at: new Date().toISOString() })
      .eq("id", splitId);
    if (!error) loadMoment();
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "album", label: "Album", icon: "images-outline" },
    { key: "expenses", label: "Expenses", icon: "cash-outline" },
    ...(isInPlanningGroup ? [{ key: "planning" as Tab, label: "Secret", icon: "lock-closed-outline" }] : []),
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {moment?.title ?? "Moment"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
          >
            <Ionicons
              name={t.icon as any}
              size={16}
              color={activeTab === t.key ? Colors.purple : Colors.textMuted}
            />
            <Text
              style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Album tab */}
      {activeTab === "album" && (
        <ScrollView contentContainerStyle={styles.grid}>
          <TouchableOpacity style={styles.addPhotoBtn} onPress={addPhoto}>
            <Ionicons name="add-circle-outline" size={32} color={Colors.purple} />
            <Text style={styles.addPhotoText}>Add photos</Text>
          </TouchableOpacity>
          {photos.map((p) => (
            photoUrls[p.id] ? (
              <Image
                key={p.id}
                source={{ uri: photoUrls[p.id] }}
                style={styles.photo}
              />
            ) : (
              <View key={p.id} style={[styles.photo, styles.photoLoading]}>
                <ActivityIndicator color={Colors.textFaint} size="small" />
              </View>
            )
          ))}
        </ScrollView>
      )}

      {/* Expenses tab */}
      {activeTab === "expenses" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            style={styles.addExpenseBtn}
            onPress={() => Alert.alert("Add expense", "Expense form coming soon")}
          >
            <Ionicons name="add" size={20} color={Colors.purple} />
            <Text style={styles.addExpenseText}>Log an expense</Text>
          </TouchableOpacity>

          {expenses.map((e) => (
            <View key={e.id} style={styles.expenseCard}>
              <View style={styles.expenseTop}>
                <Avatar uri={e.payer.avatar_url} name={e.payer.display_name} size={32} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.expenseDesc}>{e.description ?? e.category}</Text>
                  <Text style={styles.expensePayer}>Paid by {e.payer.display_name}</Text>
                </View>
                <Text style={styles.expenseAmount}>${(e.amount_cents / 100).toFixed(2)}</Text>
              </View>
              {e.splits.map((s) => (
                <View key={s.id} style={styles.splitRow}>
                  <Text style={styles.splitName}>{s.user.display_name}</Text>
                  <Text style={styles.splitAmount}>owes ${(s.amount_cents / 100).toFixed(2)}</Text>
                  {!s.settled && s.owed_by === userId && (
                    <TouchableOpacity onPress={() => settleExpense(s.id)} style={styles.settleBtn}>
                      <Text style={styles.settleBtnText}>Mark settled</Text>
                    </TouchableOpacity>
                  )}
                  {s.settled && (
                    <Text style={styles.settledText}>✅ Settled</Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Secret Planning tab */}
      {activeTab === "planning" && (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ fontSize: 40 }}>🤫</Text>
          <Text style={styles.secretTitle}>Secret planning</Text>
          <Text style={styles.secretBody}>
            Only your planning group can see this.{"\n"}
            {moment?.honoree_id
              ? "The honoree doesn't know this exists."
              : "Coordinate privately here."}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginHorizontal: 8,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgCardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.purple },
  tabLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  tabLabelActive: { color: Colors.purple },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 4,
    gap: 4,
  },
  addPhotoBtn: {
    width: "47%",
    aspectRatio: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    borderStyle: "dashed",
    margin: 4,
  },
  addPhotoText: { color: Colors.purple, fontSize: 13, marginTop: 6 },
  photo: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 12,
    margin: 4,
    backgroundColor: Colors.bgCard,
  },
  photoLoading: {
    alignItems: "center",
    justifyContent: "center",
  },
  addExpenseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(124,58,237,0.1)",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.2)",
    marginBottom: 16,
  },
  addExpenseText: { color: Colors.purple, fontSize: 15, fontWeight: "600" },
  expenseCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  expenseTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  expenseDesc: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  expensePayer: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  expenseAmount: { color: Colors.text, fontSize: 17, fontWeight: "700" },
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.bgCardBorder,
    gap: 8,
  },
  splitName: { flex: 1, color: Colors.textMuted, fontSize: 13 },
  splitAmount: { color: Colors.text, fontSize: 13 },
  settleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(74,222,128,0.12)",
  },
  settleBtnText: { color: Colors.green, fontSize: 12, fontWeight: "600" },
  settledText: { color: Colors.green, fontSize: 12 },
  secretTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  secretBody: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 32,
  },
});
