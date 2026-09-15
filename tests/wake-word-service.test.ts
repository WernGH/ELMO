import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  WakeWordService,
  DEFAULT_VOICE_SETTINGS,
} from "@/services/wake-word.service";
import { VoiceService } from "@/services/voice.service";
import { WakeWordMatch, WakeWordStatus } from "@/types/voice.types";

// Mock SpeechRecognition
class MockAmbientRecognition {
  continuous = true;
  interimResults = true;
  lang = "en-US";
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  start() {
    if (this.onstart) this.onstart();
  }
  stop() {
    if (this.onend) this.onend();
  }
  abort() {
    if (this.onend) this.onend();
  }
}

class MockSpeechSynthesisUtterance {
  text: string;
  onend: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const mockSpeechSynthesis = {
  speaking: false,
  cancel: vi.fn(),
  speak: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
};

describe("WakeWordService — Phase 3 Add-On Hands-Free Voice", () => {
  let wakeWordService: WakeWordService;

  beforeEach(() => {
    (global as any).window = {
      SpeechRecognition: MockAmbientRecognition,
      speechSynthesis: mockSpeechSynthesis,
      localStorage: {
        store: {} as Record<string, string>,
        getItem: vi.fn((key: string) => (global as any).window.localStorage.store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          (global as any).window.localStorage.store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete (global as any).window.localStorage.store[key];
        }),
        clear: vi.fn(() => {
          (global as any).window.localStorage.store = {};
        }),
      },
    };
    (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    Object.defineProperty(global, "navigator", {
      value: {
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          }),
        },
      },
      writable: true,
      configurable: true,
    });

    VoiceService.resetInstance();
    WakeWordService.resetInstance();
    wakeWordService = WakeWordService.getInstance();
  });

  afterEach(() => {
    WakeWordService.resetInstance();
    VoiceService.resetInstance();
    vi.clearAllMocks();
  });

  describe("Wake Word Pattern Matching (100% Local)", () => {
    it("should detect exact phrase 'Hey ELMO' as wake-only", () => {
      const match = wakeWordService.matchWakeWord("Hey ELMO");
      expect(match.detected).toBe(true);
      expect(match.isWakeOnly).toBe(true);
      expect(match.cleanedPrompt).toBe("");
    });

    it("should be case-insensitive and handle punctuation (e.g. 'hey elmo!')", () => {
      const match = wakeWordService.matchWakeWord("hey elmo!");
      expect(match.detected).toBe(true);
      expect(match.isWakeOnly).toBe(true);
    });

    it("should detect wake word with trailing directive and extract cleaned prompt", () => {
      const match = wakeWordService.matchWakeWord(
        "Hey ELMO, what tasks are currently running?"
      );
      expect(match.detected).toBe(true);
      expect(match.isWakeOnly).toBe(false);
      expect(match.cleanedPrompt).toBe("what tasks are currently running?");
    });

    it("should detect wake word when placed at the end of the query (e.g. 'how are you elmo')", () => {
      const match = wakeWordService.matchWakeWord("how are you elmo");
      expect(match.detected).toBe(true);
      expect(match.isWakeOnly).toBe(false);
      expect(match.cleanedPrompt).toBe("how are you");
    });

    it("should detect standalone 'elmo' with leading comma or query (e.g. 'elmo, sudah makan?')", () => {
      const match = wakeWordService.matchWakeWord("elmo, sudah makan?");
      expect(match.detected).toBe(true);
      expect(match.isWakeOnly).toBe(false);
      expect(match.cleanedPrompt).toBe("sudah makan?");
    });

    it("should handle custom wake words", () => {
      const match = wakeWordService.matchWakeWord(
        "Jarvis, give me an executive status update",
        "Jarvis"
      );
      expect(match.detected).toBe(true);
      expect(match.cleanedPrompt).toBe("give me an executive status update");
    });

    it("should reject false activations (unrelated words or substring collisions)", () => {
      const falseMatch1 = wakeWordService.matchWakeWord("hello everyone at the company");
      expect(falseMatch1.detected).toBe(false);

      const falseMatch2 = wakeWordService.matchWakeWord("we are building a helmet prototype");
      expect(falseMatch2.detected).toBe(false);

      const falseMatch3 = wakeWordService.matchWakeWord("the caramel mocha is great");
      expect(falseMatch3.detected).toBe(false);
    });
  });

  describe("Settings Management & Privacy Toggles", () => {
    it("should load default voice settings", () => {
      const settings = wakeWordService.getSettings();
      expect(settings.wakeWord).toBe("Hey ELMO");
      expect(settings.wakeWordDetection).toBe(true);
      expect(settings.autoListenAfterWake).toBe(true);
      expect(settings.interruptElmo).toBe(true);
      expect(settings.conversationTimeoutSeconds).toBe(12);
    });

    it("should update and persist settings to localStorage", () => {
      wakeWordService.updateSettings({
        wakeWord: "Chief ELMO",
        conversationTimeoutSeconds: 20,
      });

      const updated = wakeWordService.getSettings();
      expect(updated.wakeWord).toBe("Chief ELMO");
      expect(updated.conversationTimeoutSeconds).toBe(20);
      expect((global as any).window.localStorage.setItem).toHaveBeenCalled();
    });

    it("should disable wake-word detection when toggled off", () => {
      wakeWordService.updateSettings({ wakeWordDetection: false });
      expect(wakeWordService.getStatus()).toBe("disabled");
      expect(wakeWordService.isMicrophoneActive()).toBe(false);
    });
  });

  describe("Ambient Listener Lifecycle & Interruption", () => {
    it("should start ambient listener and set status to active", async () => {
      const statuses: WakeWordStatus[] = [];
      wakeWordService.subscribeStatus((s) => statuses.push(s));

      await wakeWordService.startListening();
      expect(wakeWordService.getStatus()).toBe("active");
      expect(wakeWordService.isMicrophoneActive()).toBe(true);
    });

    it("should interrupt ELMO speech playback if user speaks while ELMO is speaking", async () => {
      const voiceService = VoiceService.getInstance();
      voiceService.setState("speaking");
      expect(voiceService.getState()).toBe("speaking");

      await wakeWordService.startListening();

      // Simulate ambient recognition detecting user speech during speaking
      const recognition = (wakeWordService as any).recognitionInstance;
      expect(recognition).not.toBeNull();

      recognition.onresult({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: "Hey ELMO" }], {
            isFinal: true,
          }),
        ],
      });

      // VoiceService stopSpeaking should have been triggered
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(voiceService.getState()).toBe("listening");
      expect(wakeWordService.isInConversationWindow()).toBe(true);
    });
  });

  describe("Active Conversation Window & Inactivity Timer", () => {
    it("should activate conversation window with countdown timer", () => {
      vi.useFakeTimers();

      let inWindow = false;
      let seconds = 0;

      wakeWordService.subscribeConversationWindow((w, sec) => {
        inWindow = w;
        seconds = sec;
      });

      wakeWordService.startConversationWindow(12);
      expect(inWindow).toBe(true);
      expect(seconds).toBe(12);

      // Fast forward 5 seconds
      vi.advanceTimersByTime(5000);
      expect(wakeWordService.getConversationSecondsRemaining()).toBe(7);

      // Fast forward remaining 7 seconds
      vi.advanceTimersByTime(7000);
      expect(wakeWordService.isInConversationWindow()).toBe(false);
      expect(wakeWordService.getConversationSecondsRemaining()).toBe(0);

      vi.useRealTimers();
    });

    it("should treat continuous speech in active conversation window as follow-up without wake phrase", async () => {
      let receivedPrompt = "";
      wakeWordService.subscribeWakeWord((match: WakeWordMatch) => {
        receivedPrompt = match.cleanedPrompt;
      });

      await wakeWordService.startListening();
      wakeWordService.startConversationWindow(12);
      expect(wakeWordService.isInConversationWindow()).toBe(true);

      const recognition = (wakeWordService as any).recognitionInstance;

      // User speaks a follow-up without saying "Hey ELMO"
      recognition.onresult({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: "And what about my marketing leads?" }], {
            isFinal: true,
          }),
        ],
      });

      expect(receivedPrompt).toBe("And what about my marketing leads?");
    });
  });

  describe("Browser Limitations & Graceful Degradation", () => {
    it("should set status to unsupported if SpeechRecognition is missing in browser", async () => {
      (global as any).window.SpeechRecognition = undefined;
      (global as any).window.webkitSpeechRecognition = undefined;

      await wakeWordService.startListening();
      expect(wakeWordService.getStatus()).toBe("unsupported");
    });
  });
});
