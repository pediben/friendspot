/**
 * VoiceNoteRecorder
 * Hold-to-record button. Shows waveform and duration while recording.
 * Calls onSend(uri, durationMs, waveform) on release.
 *
 * Migrated from expo-av → expo-audio (SDK 55)
 */
import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
} from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

interface Props {
  onSend: (uri: string, durationMs: number, waveform: number[]) => Promise<void>;
}

const MAX_MS = 60_000;
const MIN_MS = 1_000;

export function VoiceNoteRecorder({ onSend }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const waveformRef = useRef<number[]>([]);
  const waveformTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 100); // poll every 100ms

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && recorderState.durationMillis >= MAX_MS) {
      stopRecording();
    }
  }, [recorderState.durationMillis, isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(waveformTimerRef.current);
      pulseAnimRef.current?.stop();
      if (isRecording) {
        audioRecorder.stop().catch(() => {});
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone access needed",
          "Go to Settings → Friendspot and enable Microphone."
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      waveformRef.current = [];
      setIsRecording(true);

      // Pulse animation
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.18,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimRef.current = anim;
      anim.start();

      // Simulate waveform amplitude
      waveformTimerRef.current = setInterval(() => {
        waveformRef.current.push(Math.random() * 0.8 + 0.1);
      }, 100);
    } catch (e: any) {
      Alert.alert("Couldn't start recording", e.message);
    }
  };

  const stopRecording = async () => {
    clearInterval(waveformTimerRef.current);
    pulseAnimRef.current?.stop();
    pulseAnimRef.current = null;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();

    if (!isRecording) return;
    setIsRecording(false);

    const duration = recorderState.durationMillis;

    await audioRecorder.stop();
    const uri = audioRecorder.uri;

    if (!uri || duration < MIN_MS) return; // Too short — discard

    setSending(true);
    try {
      await onSend(uri, duration, waveformRef.current);
    } finally {
      setSending(false);
    }
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.status}>
          <View style={styles.dot} />
          <Text style={styles.duration}>
            {formatDuration(recorderState.durationMillis)}
          </Text>
          <Text style={styles.hint}>Release to send</Text>
        </View>
      )}

      <Animated.View
        style={[styles.buttonWrap, { transform: [{ scale: scaleAnim }] }]}
      >
        <Pressable
          style={[styles.button, isRecording && styles.buttonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
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
