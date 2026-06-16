import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useMoments } from "@/hooks/useMoments";
import { useCircles } from "@/hooks/useCircles";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function CreateMomentScreen() {
  const { createMoment } = useMoments();
  const { circles } = useCircles();

  const [title, setTitle] = useState("");
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert("Add a title", "What's the moment called?");
      return;
    }
    if (!selectedCircleId) {
      Alert.alert("Pick a circle", "Which circle is this moment for?");
      return;
    }

    setLoading(true);
    try {
      const moment = await createMoment({
        circleId: selectedCircleId,
        title: title.trim(),
        eventDate: eventDate || undefined,
        isSecret: hasSecret,
      });
      router.replace(`/(main)/moments/${moment.id}`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New moment</Text>
        <TouchableOpacity
          onPress={save}
          disabled={loading}
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Birthday dinner, road trip, etc."
          placeholderTextColor={Colors.textFaint}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        <Text style={styles.label}>Circle</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          {circles.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.circleChip,
                selectedCircleId === c.id && styles.circleChipActive,
              ]}
              onPress={() => setSelectedCircleId(c.id)}
            >
              <Text style={styles.chipEmoji}>{c.icon ?? "👥"}</Text>
              <Text
                style={[
                  styles.chipName,
                  selectedCircleId === c.id && { color: Colors.text },
                ]}
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Date (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textFaint}
          value={eventDate}
          onChangeText={setEventDate}
          keyboardType="numbers-and-punctuation"
        />

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Secret planning group</Text>
            <Text style={styles.toggleSub}>
              Plan behind the scenes — hidden from the guest of honour
            </Text>
          </View>
          <Switch
            value={hasSecret}
            onValueChange={setHasSecret}
            trackColor={{ true: Colors.purple, false: Colors.bgCardBorder }}
            thumbColor="#FFFFFF"
          />
        </View>

        {hasSecret && (
          <View style={styles.secretNote}>
            <Ionicons name="lock-closed" size={14} color={Colors.purple} />
            <Text style={styles.secretNoteText}>
              You can add planning members after creating the moment.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.purple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  form: { padding: 20 },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    marginBottom: 24,
  },
  circleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    marginRight: 8,
  },
  circleChipActive: { borderColor: Colors.purple, backgroundColor: "rgba(124,58,237,0.15)" },
  chipEmoji: { fontSize: 18 },
  chipName: { color: Colors.textMuted, fontSize: 14, fontWeight: "600" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    marginBottom: 12,
  },
  toggleLabel: { color: Colors.text, fontSize: 16, fontWeight: "600", marginBottom: 4 },
  toggleSub: { color: Colors.textMuted, fontSize: 13, maxWidth: 240 },
  secretNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(124,58,237,0.08)",
    padding: 12,
    borderRadius: 12,
  },
  secretNoteText: { color: Colors.textMuted, fontSize: 13, flex: 1 },
});
