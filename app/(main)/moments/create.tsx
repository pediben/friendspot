/**
 * CreateMomentScreen
 * Luxury / minimal — no emojis, gold accents, dark bg.
 * Template picker pre-fills title + secret toggle.
 */
import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMoments } from "@/hooks/useMoments";
import { useCircles } from "@/hooks/useCircles";
import { Colors } from "@/constants/Colors";
import { MOMENT_TEMPLATES, MomentTemplate } from "@/lib/momentTemplates";

// ─── Design tokens ───────────────────────────────────────────
const BG      = "#09090F";
const CARD    = "#111118";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT    = "#FFFFFF";
const MUTED   = "rgba(255,255,255,0.4)";
const FAINT   = "rgba(255,255,255,0.15)";
const GOLD    = "#C9A84C";
const GOLD_DIM = "rgba(201,168,76,0.12)";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W  = 96;
const CARD_H  = 108;
const CARD_GAP = 10;

export default function CreateMomentScreen() {
  const { createMoment } = useMoments();
  const { circles } = useCircles();

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<MomentTemplate>(MOMENT_TEMPLATES[0]);

  // Form state
  const [title, setTitle]                     = useState("");
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [eventDate, setEventDate]             = useState("");
  const [hasSecret, setHasSecret]             = useState(false);
  const [loading, setLoading]                 = useState(false);

  const applyTemplate = (tpl: MomentTemplate) => {
    setSelectedTemplate(tpl);
    // Only overwrite title if blank or if it was previously set by a template
    setTitle(tpl.defaultTitle);
    setHasSecret(tpl.hasSecret);
  };

  const save = async () => {
    if (!title.trim()) {
      Alert.alert("Add a title", "What's the moment called?");
      return;
    }
    if (!selectedCircleId) {
      Alert.alert("Pick a spot", "Which spot is this moment for?");
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

  // ── Template card ──────────────────────────────────────────
  const renderTemplate = ({ item }: { item: MomentTemplate }) => {
    const active = item.id === selectedTemplate.id;
    return (
      <TouchableOpacity
        style={[
          styles.tplCard,
          active && {
            borderColor: item.color,
            backgroundColor: item.dim,
          },
        ]}
        onPress={() => applyTemplate(item)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View
          style={[
            styles.tplIconWrap,
            { backgroundColor: active ? item.dim : "rgba(255,255,255,0.05)" },
          ]}
        >
          <Ionicons
            name={item.icon as any}
            size={22}
            color={active ? item.color : MUTED}
          />
        </View>

        {/* Name */}
        <Text
          style={[styles.tplName, active && { color: item.color }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {/* Secret badge */}
        {item.hasSecret && (
          <View style={styles.secretBadge}>
            <Ionicons name="lock-closed" size={9} color={MUTED} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const accent = selectedTemplate.color;
  const accentDim = selectedTemplate.dim;

  return (
    <View style={styles.root}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={MUTED} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>New moment</Text>
        <TouchableOpacity
          onPress={save}
          disabled={loading}
          style={[
            styles.saveBtn,
            { backgroundColor: accent },
            loading && { opacity: 0.55 },
          ]}
        >
          {loading
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={styles.saveBtnText}>Create</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >

        {/* ── Template picker ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TYPE</Text>
          <FlatList
            data={MOMENT_TEMPLATES}
            keyExtractor={(t) => t.id}
            renderItem={renderTemplate}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tplRow}
            style={{ marginHorizontal: -20 }}
          />

          {/* Hint from template */}
          {selectedTemplate.id !== "blank" && (
            <View style={[styles.templateHint, { backgroundColor: accentDim, borderColor: accent + "33" }]}>
              <Ionicons name={selectedTemplate.icon as any} size={13} color={accent} />
              <Text style={[styles.templateHintText, { color: accent }]}>
                {selectedTemplate.hint}
              </Text>
            </View>
          )}
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        <View style={styles.form}>

          {/* Title */}
          <Text style={styles.fieldLabel}>TITLE</Text>
          <TextInput
            style={[styles.input, { borderColor: title.length > 0 ? accent + "55" : BORDER }]}
            placeholder="What are you planning?"
            placeholderTextColor={FAINT}
            value={title}
            onChangeText={setTitle}
            autoFocus={selectedTemplate.id === "blank"}
            returnKeyType="next"
            maxLength={60}
          />

          {/* Spot picker */}
          <Text style={styles.fieldLabel}>SPOT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 28 }}
          >
            {circles.length === 0 ? (
              <Text style={styles.noCircles}>No spots yet — create one first.</Text>
            ) : (
              circles.map((c) => {
                const active = selectedCircleId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.spotChip,
                      active && { borderColor: accent, backgroundColor: accentDim },
                    ]}
                    onPress={() => setSelectedCircleId(c.id)}
                  >
                    <Text
                      style={[
                        styles.spotChipText,
                        active && { color: accent },
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Date */}
          <Text style={styles.fieldLabel}>DATE <Text style={styles.optional}>(OPTIONAL)</Text></Text>
          <TextInput
            style={[styles.input, { borderColor: eventDate.length > 0 ? accent + "55" : BORDER }]}
            placeholder={selectedTemplate.datePlaceholder}
            placeholderTextColor={FAINT}
            value={eventDate}
            onChangeText={setEventDate}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />

          {/* Secret planning toggle */}
          <View
            style={[
              styles.toggleRow,
              hasSecret && {
                borderColor: accent + "40",
                backgroundColor: accentDim,
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.toggleLabelRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={hasSecret ? accent : MUTED}
                />
                <Text style={[styles.toggleLabel, hasSecret && { color: accent }]}>
                  Secret planning
                </Text>
              </View>
              <Text style={styles.toggleSub}>
                Hidden from the guest of honour until you're ready
              </Text>
            </View>
            <Switch
              value={hasSecret}
              onValueChange={setHasSecret}
              trackColor={{ true: accent, false: "rgba(255,255,255,0.1)" }}
              thumbColor="#FFFFFF"
            />
          </View>

          {hasSecret && (
            <View style={[styles.secretNote, { backgroundColor: accent + "14", borderColor: accent + "30" }]}>
              <Ionicons name="information-circle-outline" size={14} color={accent} />
              <Text style={[styles.secretNoteText, { color: accent + "cc" }]}>
                Add planning members after creating the moment. Only they will see this section.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: BORDER,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.2,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    minWidth: 72,
    alignItems: "center",
  },
  saveBtnText: { color: "#000", fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },

  // Template section
  section: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  sectionLabel: {
    fontSize: 10, fontWeight: "700", color: FAINT,
    letterSpacing: 1.6, marginBottom: 14,
  },

  tplRow: { paddingHorizontal: 20, gap: CARD_GAP },
  tplCard: {
    width: CARD_W,
    minHeight: CARD_H,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tplIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  tplName: {
    fontSize: 11,
    fontWeight: "600",
    color: MUTED,
    textAlign: "center",
    lineHeight: 14,
  },
  secretBadge: {
    position: "absolute",
    top: 8, right: 8,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },

  templateHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  templateHintText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 20,
    marginBottom: 28,
  },

  // Form
  form: { paddingHorizontal: 20 },
  fieldLabel: {
    fontSize: 10, fontWeight: "700",
    color: FAINT, letterSpacing: 1.4,
    marginBottom: 12,
  },
  optional: { fontWeight: "400", color: "rgba(255,255,255,0.1)" },
  input: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: TEXT,
    borderWidth: 1,
    marginBottom: 28,
  },

  // Spot chips
  noCircles: { color: FAINT, fontSize: 13, paddingVertical: 12 },
  spotChip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 26,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 8,
  },
  spotChipText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "600",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  toggleLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  toggleLabel: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "600",
  },
  toggleSub: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    paddingLeft: 20,
  },

  secretNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  secretNoteText: { fontSize: 12, flex: 1, lineHeight: 17 },
});
