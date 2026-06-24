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
      return;
    }

    setNotes((data ?? []) as unknown as CircleMessageWithSender[]);
    setLoading(false);
  }, [circleId]);

  useEffect(() => {
    fetch();

    const sub = supabase
      .channel(`circle_messages:${circleId}`)
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
  }, [fetch, circleId]);

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

  return { notes, loading, sendVoiceNote, keyPending: keyError === "key_pending" };
}
