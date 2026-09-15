import { describe, it, expect, beforeEach, vi } from "vitest";
import { VoiceActivityDetector } from "@/services/voice/vad.service";
import { VADState } from "@/services/voice/voice.types";

describe("STEP 5: Voice Activity Detection (VAD)", () => {
  let vad: VoiceActivityDetector;

  beforeEach(() => {
    vad = new VoiceActivityDetector({
      speechThreshold: 0.05,
      silenceDurationMs: 1000,
      minSpeechDurationMs: 200,
      maxUtteranceDurationMs: 5000,
    });
  });

  it("should stay in NO_SPEECH when silence / zero audio level is processed", () => {
    vad.processSample(0.01, 1000);
    vad.processSample(0.02, 1100);
    vad.processSample(0.0, 1200);

    expect(vad.getVADState()).toBe("NO_SPEECH");
  });

  it("should reject transient click/pop under minimum speech duration", () => {
    // Click at 1000ms
    vad.processSample(0.08, 1000);
    expect(vad.getVADState()).toBe("USER_STARTS_SPEAKING");

    // Level immediately drops before 200ms
    vad.processSample(0.01, 1050);
    expect(vad.getVADState()).toBe("NO_SPEECH");
  });

  it("should detect short sentence speech onset and completion after silence", () => {
    let speechStarted = false;
    let speechEnded = false;

    vad.onSpeechStart(() => {
      speechStarted = true;
    });
    vad.onSpeechEnd(() => {
      speechEnded = true;
    });

    // Start speaking at t=1000ms
    vad.processSample(0.08, 1000);
    expect(vad.getVADState()).toBe("USER_STARTS_SPEAKING");

    // Continuous speech exceeds minSpeechDuration (200ms) at t=1250ms
    vad.processSample(0.09, 1250);
    expect(vad.getVADState()).toBe("USER_SPEAKING");
    expect(speechStarted).toBe(true);

    // User speaks until t=2000ms
    vad.processSample(0.07, 2000);
    expect(vad.getVADState()).toBe("USER_SPEAKING");

    // User stops speaking at t=2100ms
    vad.processSample(0.01, 2100);
    expect(vad.getVADState()).toBe("USER_STOPS_SPEAKING");

    // Silence continues for 1000ms (t=3100ms)
    vad.processSample(0.01, 3101);
    expect(speechEnded).toBe(true);
  });

  it("should handle natural pauses within a sentence without ending utterance early", () => {
    let speechEndCount = 0;
    vad.onSpeechEnd(() => {
      speechEndCount++;
    });

    // Sentence Part 1
    vad.processSample(0.08, 1000);
    vad.processSample(0.09, 1300); // Speaking
    expect(vad.getVADState()).toBe("USER_SPEAKING");

    // Natural pause (400ms pause < 1000ms silence threshold)
    vad.processSample(0.01, 1500); // Stopped
    expect(vad.getVADState()).toBe("USER_STOPS_SPEAKING");

    // User resumes speaking at t=1900ms (only 400ms pause)
    vad.processSample(0.08, 1900);
    expect(vad.getVADState()).toBe("USER_SPEAKING");
    expect(speechEndCount).toBe(0); // Did not trigger end of utterance!

    // Sentence Part 2 finishes at t=2500ms
    vad.processSample(0.01, 2500);
    expect(vad.getVADState()).toBe("USER_STOPS_SPEAKING");

    // Full silence threshold reached (1000ms)
    vad.processSample(0.01, 3501);
    expect(speechEndCount).toBe(1);
  });

  it("should enforce maximum utterance duration limit", () => {
    let speechEndCount = 0;
    vad.onSpeechEnd(() => {
      speechEndCount++;
    });

    // Speech starts at t=1000ms
    vad.processSample(0.08, 1000);
    vad.processSample(0.08, 1300);

    // Continuous speaking hits maxUtteranceDurationMs (5000ms) at t=6000ms
    vad.processSample(0.08, 6001);
    expect(speechEndCount).toBe(1);
  });
});
