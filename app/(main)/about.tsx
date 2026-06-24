/**
 * About Friendspot
 * Includes: version, legal, patent notice, privacy policy link.
 */
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LogoMark } from "@/components/ui/LogoMark";

// ─── Tokens ─────────────────────────────────────────────────
const BG     = "#09090F";
const CARD   = "#111118";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT   = "#FFFFFF";
const MUTED  = "rgba(255,255,255,0.4)";
const FAINT  = "rgba(255,255,255,0.15)";
const GOLD   = "#C9A84C";
const GOLD_DIM = "rgba(201,168,76,0.10)";

const YEAR   = new Date().getFullYear();
const VERSION = "1.0.0";

export default function AboutScreen() {
  return (
    <View style={styles.root}>

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={MUTED} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>About</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >

        {/* Logo block */}
        <View style={styles.logoBlock}>
          <View style={styles.logoMark}>
            <LogoMark size={48} />
          </View>
          <Text style={styles.appName}>Friendspot</Text>
          <Text style={styles.tagline}>Where your people come together</Text>
          <Text style={styles.version}>Version {VERSION}</Text>
        </View>

        {/* Patent / IP notice */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color={GOLD} />
            <Text style={styles.cardTitle}>Intellectual Property</Text>
          </View>
          <Text style={styles.cardBody}>
            Friendspot and its core features — including Spots, Rounds (ROSCA savings pools),
            Moments with secret planning groups, and the combined social-savings-events model —
            are proprietary and{" "}
            <Text style={styles.highlight}>patent pending</Text>.
          </Text>
          <Text style={[styles.cardBody, { marginTop: 10 }]}>
            Unauthorized reproduction, reverse engineering, or commercial use of any Friendspot
            feature without written consent is prohibited.
          </Text>
        </View>

        {/* Legal rows */}
        <View style={styles.legalBlock}>
          <LegalRow
            label="Privacy Policy"
            onPress={() => Linking.openURL("https://friendspot.online/privacy")}
          />
          <LegalRow
            label="Terms of Service"
            onPress={() => Linking.openURL("https://friendspot.online/terms")}
          />
          <LegalRow
            label="Contact"
            onPress={() => Linking.openURL("mailto:hello@friendspot.online")}
          />
        </View>

        {/* Copyright */}
        <Text style={styles.copyright}>
          © {YEAR} Friendspot. All rights reserved.{"\n"}
          All features and trade dress proprietary.
        </Text>

        {/* Patent pending notice — small */}
        <Text style={styles.patentLine}>Patent Pending · US Application Filed</Text>

      </ScrollView>
    </View>
  );
}

function LegalRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.legalRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.legalLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color={FAINT} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: BORDER,
  },
  topTitle: {
    fontSize: 16, fontWeight: "700", color: TEXT, letterSpacing: -0.2,
  },

  body: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    alignItems: "center",
  },

  // Logo
  logoBlock: {
    alignItems: "center",
    paddingVertical: 40,
  },
  logoMark: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  appName: {
    fontSize: 28, fontWeight: "800", color: TEXT,
    letterSpacing: -0.5, marginBottom: 6,
  },
  tagline: {
    fontSize: 14, color: MUTED, marginBottom: 10, letterSpacing: 0.2,
  },
  version: {
    fontSize: 11, color: FAINT, letterSpacing: 1,
  },

  // IP card
  card: {
    width: "100%",
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: GOLD + "28",
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13, fontWeight: "700", color: GOLD, letterSpacing: 0.4,
  },
  cardBody: {
    fontSize: 13, color: MUTED, lineHeight: 20,
  },
  highlight: {
    color: GOLD, fontWeight: "700",
  },

  // Legal rows
  legalBlock: {
    width: "100%",
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    marginBottom: 28,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  legalLabel: { fontSize: 14, color: TEXT, fontWeight: "500" },

  // Footer
  copyright: {
    fontSize: 11, color: FAINT, textAlign: "center", lineHeight: 17, marginBottom: 8,
  },
  patentLine: {
    fontSize: 10, color: "rgba(201,168,76,0.4)",
    letterSpacing: 1, textAlign: "center",
    fontWeight: "600",
  },
});
