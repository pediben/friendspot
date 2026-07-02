import { useEffect, useState, useCallback } from "react";
import { supabase, uploadFile } from "@/lib/supabase";
import { CircleMessageWithSender } from "@/types/database";
import { useAuthStore } from "./useAuth";
import { encryptFileUri } from "@/lib/crypto";
import { useCircleKey } from "./useCircleKey";

export function useVoiceNotes(circleId: string) {
  const { session } = useAuthStore();
  const userId = session?.user.id;
  const { circleKey, error: keyError } = useCircleKey(circleId);

  const [notes, setNotes] = useState<CircleMessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("circle_messages")
      .select("*, sender:profiles(*)")
      .eq("circle_id", circleId)
      .eq("kind", "voice")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[useVoiceNotes]", error.message);
      setFetchError(error.message);
      setLoading(false);
      return;
    }

    setFetchError(null);
    setNotes((data ?? []) as unknown as CircleMessageWithSender[]);
    setLoading(false);
  }, [circleId]);

  // Unique channel name per mount prevents duplicate-subscription bugs when
  // navigating away and back to the same circle (Supabase silently drops
  // a second subscription to a channel with the same name).
  const [channelName] = useState(
    () => `circle_messages_${circleId}_${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    fetch();

    const sub = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "friendspot",
          table: "circle_messages",
          filter: `circle_id=eq.${circleId}`,
        },
        fetch
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetch, channelName]);

  /**
   * Upload a recorded audio file URI as an encrypted voice note.
   * @param uri         Local file URI from expo-av
   * @param durationMs  Duration in milliseconds
   * @param waveform    Ignored — waveform not stored in new schema
   */
  const sendVoiceNote = async (
    uri: string,
    durationMs: number,
    _waveform?: number[]
  ) => {
    if (!userId) throw new Error("Not signed in");
    if (durationMs < 1000) throw new Error("Voice note too short");
    if (durationMs > 60000) throw new Error("Voice note too long (60s max)");

    if (!circleKey) throw new Error("Circle encryption key not available yet");

    // Encrypt before upload
    const encryptedBlob = await encryptFileUri(uri, circleKey);
    const fileName = `${circleId}/${Date.now()}.enc`;
    const path = await uploadFile("voice-notes", userId, fileName, encryptedBlob, "application/octet-stream");

    if (!path) throw new Error("Upload failed");

    const { error } = await supabase.from("circle_messages").insert({
      circle_id: circleId,
      sender_id: userId,
      kind: "voice",
      media_url: path,
      duration_seconds: Math.round(durationMs / 1000),
    });

    if (error) throw error;
    await fetch();
  };

  return { notes, loading, fetchError, sendVoiceNote, keyPending: keyError === "key_pending", circleKey };
}
