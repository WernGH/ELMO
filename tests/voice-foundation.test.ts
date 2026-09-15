import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AudioManager } from "@/services/voice/audio-manager";
import { VoiceStateManager } from "@/services/voice/voice-state-manager";
import { SpeechToTextService } from "@/services/voice/stt.service";
import { TextToSpeechService } from "@/services/voice/tts.service";
import { VoiceState } from "@/services/voice/voice.types";

describe("STEP 3 & 4: Voice Foundation & Hardware Permissions", () => {
  beforeEach(() => {
    // Reset singleton instances
    AudioManager.resetInstance();
    VoiceStateManager.resetInstance();

    // Mock AudioContext and Web Speech APIs
    class MockAudioContext {
      state = "running";
      resume = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
      createMediaStreamSource = vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
      });
      createAnalyser = vi.fn().mockReturnValue({
        fftSize: 512,
        smoothingTimeConstant: 0.4,
        getFloatTimeDomainData: vi.fn((buf: Float32Array) => {
          buf.fill(0.05); // Simulated audio level
        }),
        getByteFrequencyData: vi.fn((buf: Uint8Array) => {
          buf.fill(128);
        }),
      });
    }

    (global as any).window = {
      AudioContext: MockAudioContext,
      SpeechRecognition: vi.fn(),
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn(() => [{ name: "Google US English", lang: "en-US" }]),
      },
    };
    (global as any).SpeechSynthesisUtterance = class {
      text: string;
      lang = "en-US";
      rate = 1;
      pitch = 1;
      volume = 1;
      voice = null;
      constructor(text: string) {
        this.text = text;
      }
    };

    Object.defineProperty(global, "navigator", {
      value: {
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue({
            active: true,
            getTracks: () => [{ stop: vi.fn() }],
          }),
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    AudioManager.resetInstance();
    VoiceStateManager.resetInstance();
    vi.clearAllMocks();
  });

  describe("AudioManager & Permissions", () => {
    it("should initialize in unrequested permission state", () => {
      const audioManager = AudioManager.getInstance();
      expect(audioManager.getPermissionState()).toBe("unrequested");
    });

    it("should transition to granted when getUserMedia succeeds", async () => {
      const audioManager = AudioManager.getInstance();
      const res = await audioManager.requestPermission();

      expect(res.granted).toBe(true);
      expect(audioManager.getPermissionState()).toBe("granted");
    });

    it("should transition to denied when getUserMedia throws NotAllowedError", async () => {
      (global as any).navigator.mediaDevices.getUserMedia = vi
        .fn()
        .mockRejectedValue({ name: "NotAllowedError", message: "User denied" });

      const audioManager = AudioManager.getInstance();
      const res = await audioManager.requestPermission();

      expect(res.granted).toBe(false);
      expect(res.error?.code).toBe("mic_permission_denied");
      expect(audioManager.getPermissionState()).toBe("denied");
    });

    it("should transition to unavailable when getUserMedia throws hardware failure", async () => {
      (global as any).navigator.mediaDevices.getUserMedia = vi
        .fn()
        .mockRejectedValue({ name: "NotFoundError", message: "Device not found" });

      const audioManager = AudioManager.getInstance();
      const res = await audioManager.requestPermission();

      expect(res.granted).toBe(false);
      expect(res.error?.code).toBe("mic_unavailable");
      expect(audioManager.getPermissionState()).toBe("unavailable");
    });

    it("should calculate RMS audio energy correctly", async () => {
      const audioManager = AudioManager.getInstance();
      await audioManager.startAudioPipeline();

      const rms = audioManager.getRMS();
      expect(rms).toBeGreaterThan(0);
      expect(rms).toBeLessThanOrEqual(1.0);
    });

    it("should cleanly release all resources on release()", async () => {
      const audioManager = AudioManager.getInstance();
      await audioManager.startAudioPipeline();
      audioManager.release();

      expect(audioManager.getPermissionState()).toBe("unrequested");
      expect(audioManager.getRMS()).toBe(0);
    });
  });

  describe("VoiceStateManager (7 Canonical States)", () => {
    it("should start in STANDBY state", () => {
      const sm = VoiceStateManager.getInstance();
      expect(sm.getState()).toBe("STANDBY");
      expect(sm.getError()).toBeNull();
    });

    it("should transition between canonical states and notify subscribers", () => {
      const sm = VoiceStateManager.getInstance();
      const recordedStates: VoiceState[] = [];

      sm.subscribe((state) => {
        recordedStates.push(state);
      });

      sm.transition("LISTENING");
      sm.transition("USER_SPEAKING");
      sm.transition("PROCESSING");
      sm.transition("ELMO_SPEAKING");
      sm.transition("INTERRUPTED");
      sm.transition("ERROR", { code: "network_error", message: "Network offline" });
      sm.transition("STANDBY");

      expect(recordedStates).toEqual([
        "STANDBY",
        "LISTENING",
        "USER_SPEAKING",
        "PROCESSING",
        "ELMO_SPEAKING",
        "INTERRUPTED",
        "ERROR",
        "STANDBY",
      ]);
    });

    it("should record error details only in ERROR state", () => {
      const sm = VoiceStateManager.getInstance();
      sm.transition("ERROR", { code: "tts_error", message: "Speech output failed" });

      expect(sm.getState()).toBe("ERROR");
      expect(sm.getError()?.code).toBe("tts_error");

      sm.transition("STANDBY");
      expect(sm.getState()).toBe("STANDBY");
      expect(sm.getError()).toBeNull();
    });
  });

  describe("Provider Abstractions", () => {
    it("should support SpeechToTextService provider interface", () => {
      const stt = new SpeechToTextService();
      expect(typeof stt.isSupported).toBe("function");
      expect(typeof stt.start).toBe("function");
      expect(typeof stt.stop).toBe("function");
      expect(typeof stt.abort).toBe("function");
      expect(typeof stt.onTranscript).toBe("function");
    });

    it("should support TextToSpeechService provider interface", () => {
      const tts = new TextToSpeechService();
      expect(typeof tts.isSupported).toBe("function");
      expect(typeof tts.speak).toBe("function");
      expect(typeof tts.stop).toBe("function");
      expect(typeof tts.pause).toBe("function");
      expect(typeof tts.resume).toBe("function");
    });
  });
});
