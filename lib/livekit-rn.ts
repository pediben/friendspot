/**
 * React Native LiveKit helpers.
 *
 * @livekit/react-native contains native modules that aren't available in
 * Expo Go. We isolate all imports here so the rest of the app only needs to
 * import from this single module — making the try/catch boundary easy to
 * maintain and test.
 *
 * In a native build (TestFlight / App Store) every export works normally.
 * In Expo Go the symbols fall back to no-ops so non-LiveKit screens remain usable.
 */

import type { Participant, Room } from "livekit-client";

// ─── AudioSession ─────────────────────────────────────────────────────────────

export interface IAudioSession {
  startAudioSession(): Promise<void>;
  stopAudioSession(): Promise<void>;
}

const noopAudioSession: IAudioSession = {
  startAudioSession: async () => {},
  stopAudioSession: async () => {},
};

let _audioSession: IAudioSession = noopAudioSession;

try {
  const lkRN = require("@livekit/react-native");
  _audioSession = lkRN.AudioSession as IAudioSession;
} catch {
  console.warn("[livekit-rn] AudioSession unavailable — native build required.");
}

export const AudioSession = _audioSession;

// ─── useParticipants ──────────────────────────────────────────────────────────

type UseParticipantsFn = (opts?: { room?: Room }) => { participants: Participant[] };

let _useParticipants: UseParticipantsFn = () => ({ participants: [] });

try {
  const lkRN = require("@livekit/react-native");
  if (lkRN.useParticipants) {
    _useParticipants = lkRN.useParticipants as UseParticipantsFn;
  }
} catch {
  // already warned above
}

export const useParticipants = _useParticipants;
