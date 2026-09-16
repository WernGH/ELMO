import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VoiceService } from "@/services/voice.service";
import { VoiceError, VoiceState } from "@/types/voice.types";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ChatService } from "@/services/chat.service";

// Mock browser Web Speech API & MediaDevices
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
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
  lang = "en-US";
  pitch = 1;
  rate = 1;
  volume = 1;
  voice = null;
  onend: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const mockSpeechSynthesis = {
  speaking: false,
  paused: false,
  speak: vi.fn((utterance: MockSpeechSynthesisUtterance) => {
    // Simulate speech end asynchronously
    setTimeout(() => {
      if (utterance.onend) utterance.onend();
    }, 10);
  }),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [
    { name: "Google US English", lang: "en-US" },
    { name: "Samantha", lang: "en-US" },
  ]),
};

describe("VoiceService — Phase 3 Voice CEO Engine", () => {
  let voiceService: VoiceService;

  beforeEach(() => {
    // Mock global window objects
    (global as any).window = {
      SpeechRecognition: MockSpeechRecognition,
      speechSynthesis: mockSpeechSynthesis,
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
    voiceService = VoiceService.getInstance();
  });

  afterEach(() => {
    VoiceService.resetInstance();
    vi.clearAllMocks();
  });

  describe("Capability & Permission Detection", () => {
    it("should detect STT and TTS support when window APIs are present", () => {
      expect(voiceService.isSTTSupported()).toBe(true);
      expect(voiceService.isTTSSupported()).toBe(true);
    });

    it("should gracefully handle microphone permission granted", async () => {
      const granted = await voiceService.requestMicrophonePermission();
      expect(granted).toBe(true);
      expect(voiceService.getState()).toBe("idle");
    });

    it("should catch microphone permission denied and trigger mic_permission_denied error", async () => {
      (global as any).navigator.mediaDevices.getUserMedia = vi
        .fn()
        .mockRejectedValue({ name: "NotAllowedError" });

      let capturedError: VoiceError | null = null;
      voiceService.subscribeError((err) => {
        capturedError = err;
      });

      const granted = await voiceService.requestMicrophonePermission();
      expect(granted).toBe(false);
      expect(voiceService.getState()).toBe("error");
      expect(capturedError).not.toBeNull();
      const err = capturedError as VoiceError | null;
      expect(err?.code).toBe("mic_permission_denied");
      expect(err?.message).toContain("Microphone access was denied");
    });
  });

  describe("State Transitions & Speech-to-Text (STT)", () => {
    it("should transition from idle to listening on startListening()", async () => {
      const states: VoiceState[] = [];
      voiceService.subscribeState((s) => states.push(s));

      await voiceService.startListening();
      expect(voiceService.getState()).toBe("listening");
      expect(states).toContain("listening");
    });

    it("should capture and notify speech recognition results", async () => {
      let finalTranscript = "";
      let wasFinal = false;

      voiceService.subscribeTranscript((text, isFinal) => {
        finalTranscript = text;
        wasFinal = isFinal;
      });

      await voiceService.startListening();

      // Simulate recognition returning an utterance
      const activeRecognition = (voiceService as any).recognitionInstance;
      expect(activeRecognition).not.toBeNull();

      activeRecognition.onresult({
        resultIndex: 0,
        results: [
          Object.assign(
            [{ transcript: "ELMO, what tasks are currently running?" }],
            { isFinal: true }
          ),
        ],
      });

      expect(finalTranscript).toContain("ELMO, what tasks are currently running?");
      expect(wasFinal).toBe(true);
    });

    it("should abort listening cleanly and return to idle", async () => {
      await voiceService.startListening();
      expect(voiceService.getState()).toBe("listening");

      voiceService.abortListening();
      expect(voiceService.getState()).toBe("idle");
    });

    it("should resolve a valid BCP-47 tag and prevent auto or unknown tags from crashing", () => {
      voiceService.setLanguage("ms");
      expect(voiceService.getValidBcp47Lang()).toBe("ms-MY");

      voiceService.setLanguage("auto");
      const autoTag = voiceService.getValidBcp47Lang();
      expect(autoTag).not.toBe("auto");
      expect(autoTag).not.toBe("auto-AUTO");
      expect(autoTag.length).toBeGreaterThanOrEqual(2);

      voiceService.setLanguage("zh");
      expect(voiceService.getValidBcp47Lang()).toBe("zh-CN");
    });

    it("should attempt auto-recovery on transient network error without immediate fatal error", async () => {
      vi.useFakeTimers();
      let errorNotified: any = null;
      voiceService.subscribeError((err) => {
        errorNotified = err;
      });

      await voiceService.startListening();
      const rec = (voiceService as any).recognitionInstance;
      expect(rec).not.toBeNull();

      // Trigger first transient network error
      rec.onerror({ error: "network" });

      // First dropout should NOT emit a fatal error banner; it schedules auto-recovery
      expect(errorNotified).toBeNull();
      expect((voiceService as any).networkRetryCount).toBe(1);

      vi.useRealTimers();
    });
  });

  describe("Text-to-Speech (TTS) & Markdown Stripping", () => {
    it("should clean markdown headers, bolding, and code formatting for speech", () => {
      const rawMarkdown =
        "### Executive Directive\n" +
        "**Status**: *Nominal*.\n" +
        "- Step 1: Review code in `src/services`\n" +
        "```typescript\nconst a = 1;\n```\n" +
        "> Autonomy level: Supervised.";

      const cleaned = voiceService.cleanMarkdownForSpeech(rawMarkdown);

      expect(cleaned).not.toContain("###");
      expect(cleaned).not.toContain("**");
      expect(cleaned).not.toContain("`");
      expect(cleaned).toContain("Executive Directive");
      expect(cleaned).toContain("Status: Nominal.");
      expect(cleaned).toContain("Step 1: Review code in src/services");
    });

    it("should speak response and set state to speaking", async () => {
      const rawResponse = "All operational systems are nominal. No critical anomalies detected.";
      await voiceService.speak(rawResponse);

      expect(voiceService.getState()).toBe("speaking");
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it("should stop speaking immediately when stopSpeaking() is called", async () => {
      await voiceService.speak("Long strategic briefing...");
      expect(voiceService.getState()).toBe("speaking");

      voiceService.stopSpeaking();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(voiceService.getState()).toBe("idle");
    });
  });

  describe("Unified Conversation Persistence (Voice & Text Shared History)", () => {
    it("should persist a spoken query into the same conversation store as text", async () => {
      const store = MockDataStore.getInstance();
      const chatService = ChatService.getInstance();

      const userId = "00000000-0000-0000-0000-000000000001";
      const orgId = "11111111-1111-1111-1111-111111111111";

      // 1. Create session
      const conv = await chatService.createConversation(userId, orgId, "Voice Briefing Session");
      expect(conv.data).not.toBeNull();
      const convId = conv.data!.id;

      // 2. User speaks: "ELMO, what tasks are currently running?"
      const spokenPrompt = "ELMO, what tasks are currently running?";
      const userMsgRes = await chatService.createMessage(userId, orgId, {
        conversationId: convId,
        role: "user",
        content: spokenPrompt,
        metadata: { inputMethod: "voice" },
      });
      expect(userMsgRes.data).not.toBeNull();

      // 3. ELMO replies
      const assistantResponse =
        "Superior, all systems are operational. Phase 1 Foundation and Phase 2 Brain are fully operational, and Phase 3 Voice CEO is active.";
      const assistantMsgRes = await chatService.createMessage(userId, orgId, {
        conversationId: convId,
        role: "assistant",
        content: assistantResponse,
        metadata: { model: "gemini-1.5-flash", voiced: true },
      });
      expect(assistantMsgRes.data).not.toBeNull();

      // 4. Verify conversation contains both messages in order
      const messagesRes = await chatService.listMessages(userId, orgId, convId);
      expect(messagesRes.data?.length).toBe(2);
      expect(messagesRes.data![0].content).toBe(spokenPrompt);
      expect(messagesRes.data![0].metadata.inputMethod).toBe("voice");
      expect(messagesRes.data![1].content).toBe(assistantResponse);
    });
  });
});
