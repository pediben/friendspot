/**
 * VoiceNotePlayer
 * Renders a voice note bubble with waveform visualization and play/pause control.
 * Downloads and decrypts the audio on first play.
 */
import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { CircleMessageWithSender } from "@/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";

// Placeholder — replace with per-circle key from SecureStore
const MOCK_KEY = "0000000000000000000000000000000000000000000000000000000000000000";

interface Props {
  note: CircleMessageWithSender;
  isMine: boolean;
}

export function VoiceNotePlayer({ note, isMine }: Props) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1

  const playbackRef = useRef<Audio.Sound | null>(null);

  const togglePlay = async () => {
    if (playing) {
      await playbackRef.current?.pauseAsync();
      setPlaying(false);
      return;
    }

    if (sound) {
      await sound.playAsync();
      setPlaying(true);
      return;
    }

    // First play: download + decrypt
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("voice-notes")
        .download(note.media_url ?? "");

      if (error || !data) throw error ?? new Error("Download failed");

      // In production: decrypt with per-circle key
      // const decryptedUri = await decryptBlobToUri(data, MOCK_KEY, "audio/m4a");
      // For now, create a local URI from the blob directly (unencrypted dev mode)
      const uri = URL.createObjectURL(data);

      const { sound: s } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            const p = status.positionMillis / (status.durationMillis ?? 1);
            setProgress(Math.min(p, 1));
            if (status.didJustFinish) {
              setPlaying(false);
              setProgress(0);
            }
          }
        }
      );

      playbackRef.current = s;
      setSound(s);
      setPlaying(true);
    } catch (e) {
      console.error("[VoiceNotePlayer]", e);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const s = Math.floor(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const waveform = Array.from({ length: 30 }, () => Math.random());

  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      {!isMine && (
        <Avatar uri={note.sender.avatar_url} name={note.sender.display_name} size={32} />
      )}
      <View style={[styles.bubble, isMine && styles.bubbleMine]}>
        <TouchableOpacity onPress={togglePlay} style={styles.playBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons
              name={playing ? "pause" : "play"}
              size={18}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>

        {/* Waveform */}
        <View style={styles.waveform}>
          {waveform.slice(0, 30).map((amp, i) => {
            const isPlayed = i / 30 <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  { height: Math.max(4, amp * 28) },
                  isPlayed ? styles.barPlayed : styles.barUnplayed,
                ]}
              />
            );
          })}
        </View>

        <Text style={styles.duration}>{formatDuration(note.duration_seconds ?? 0)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  rowMine: { flexDirection: "row-reverse" },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  bubbleMine: { backgroundColor: "rgba(124,58,237,0.25)" },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  bar: { width: 3, borderRadius: 2 },
  barPlayed: { backgroundColor: Colors.purple },
  barUnplayed: { backgroundColor: "rgba(255,255,255,0.3)" },
  duration: { color: Colors.textMuted, fontSize: 11 },
});
