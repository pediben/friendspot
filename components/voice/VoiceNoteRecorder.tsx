/**
 * VoiceNoteRecorder
 * Hold-to-record button. Shows waveform and duration while recording.
 * Calls onSend(uri, durationMs, waveform) on release.
 */
import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

interface Props {
  onSend: (uri: string, durationMs: number, waveform: number[]) => Promise<void>;
}

const MAX_MS = 60_000;
const MIN_MS = 1_000;

export function VoiceNoteRecorder({ onSend }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [sending, setSending] = useState(false);
  const waveformRef = useRef<number[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      recording?.stopAndUnloadAsync();
      clearInterval(timerRef.current);
    };
  }, [recording]);

  const startRecording = async () => {
    try {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert("Microphone access needed", "Go to Settings → Friendspot and enable Microphone.");
      return;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(rec);
    setDurationMs(0);
    waveformRef.current = [];

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.18, duration: 400, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    ).start();

    // Poll duration + simulate waveform
    timerRef.current = setInterval(async () => {
      const status = await rec.getStatusAsync();
      if (status.isRecording) {
        const ms = status.durationMillis ?? 0;
        setDurationMs(ms);
        // Simulate amplitude (replace with actual metering if available)
        waveformRef.current.push(Math.random() * 0.8 + 0.1);

        if (ms >= MAX_MS) stopRecording(rec);
      }
    }, 100);
    } catch (e: any) {
      Alert.alert("Couldn't start recording", e.message);
    }
  };

  const stopRecording = async (rec?: Audio.Recording) => {
    clearInterval(timerRef.current);
    scaleAnim.stopAnimation();
    Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    const active = rec ?? recording;
    if (!active) return;
    setRecording(null);

    const status = await active.getStatusAsync();
    const duration = status.durationMillis ?? 0;

    await active.stopAndUnloadAsync();
    const uri = active.getURI();

    if (!uri || duration < MIN_MS) return; // Too short — discard

    setSending(true);
    try {
      await onSend(uri, duration, waveformRef.current);
    } finally {
      setSending(false);
      setDurationMs(0);
    }
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const isRecording = !!recording;

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.status}>
          <View style={styles.dot} />
          <Text style={styles.duration}>{formatDuration(durationMs)}</Text>
          <Text style={styles.hint}>Release to send · Slide up to cancel</Text>
        </View>
      )}

      <Animated.View style={[styles.buttonWrap, { transform: [{ scale: scaleAnim }] }]}>
        <Pressable
          style={[styles.button, isRecording && styles.buttonActive]}
          onPressIn={startRecording}
          onPressOut={() => stopRecording()}
          disabled={sending}
        >
          <Ionicons
            name={sending ? "checkmark" : "mic"}
            size={28}
            color="#FFFFFF"
          />
        </Pressable>
      </Animated.View>

      {!isRecording && (
        <Text style={styles.label}>Hold to record</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 12,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    backgroundColor: "rgba(124,58,237,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red,
  },
  duration: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  hint: { color: Colors.textMuted, fontSize: 12 },
  buttonWrap: {},
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.purple,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonActive: { backgroundColor: Colors.red },
  label: { color: Colors.textFaint, fontSize: 12, marginTop: 6 },
});
