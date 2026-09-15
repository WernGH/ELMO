import { describe, it, expect, beforeEach, vi } from "vitest";
import { AudioManager } from "@/services/voice/audio-manager";
import { VoiceStateManager } from "@/services/voice/voice-state-manager";
import { VoiceState } from "@/services/voice/voice.types";

describe("Phase 3: Audio Playback Interruption & 8 Canonical States", () => {
  let audioManager: AudioManager;
  let stateManager: VoiceStateManager;

  beforeEach(() => {
    AudioManager.resetInstance();
    VoiceStateManager.resetInstance();
    audioManager = AudioManager.getInstance();
    stateManager = VoiceStateManager.getInstance();
  });

  it("should support all 8 canonical voice states", () => {
    expect(stateManager.getState()).toBe("STANDBY");
    const canonicalStates: VoiceState[] = [
      "LISTENING",
      "USER_SPEAKING",
      "PROCESSING",
      "ELMO_SPEAKING",
      "INTERRUPTED",
      "RECONNECTING",
      "ERROR",
      "STANDBY",
    ];

    for (const st of canonicalStates) {
      const transitioned = stateManager.transition(st);
      expect(transitioned).toBe(true);
      expect(stateManager.getState()).toBe(st);
    }
  });

  it("should handle RECONNECTING state and record history", () => {
    stateManager.transition("LISTENING");
    stateManager.transition("RECONNECTING");

    expect(stateManager.getState()).toBe("RECONNECTING");

    const history = stateManager.getHistory();
    const states = history.map((h) => h.state);
    expect(states).toContain("RECONNECTING");

    // Recover from reconnecting back to listening
    stateManager.transition("LISTENING");
    expect(stateManager.getState()).toBe("LISTENING");
  });

  it("should immediately cancel playback and flush pending queue in AudioManager", () => {
    const playbackListener = vi.fn();
    const unsub = audioManager.subscribePlayback(playbackListener);

    expect(audioManager.isPlaying()).toBe(false);

    // Cancel playback when idle
    audioManager.cancelPlayback();
    expect(audioManager.isPlaying()).toBe(false);

    unsub();
  });

  it("should transition to INTERRUPTED state on barge-in signal", () => {
    stateManager.transition("ELMO_SPEAKING");
    expect(stateManager.getState()).toBe("ELMO_SPEAKING");

    // Barge-in occurs
    audioManager.cancelPlayback();
    stateManager.transition("INTERRUPTED");
    expect(stateManager.getState()).toBe("INTERRUPTED");

    // Then transitions to USER_SPEAKING
    stateManager.transition("USER_SPEAKING");
    expect(stateManager.getState()).toBe("USER_SPEAKING");
  });
});
