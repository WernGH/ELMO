import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VoiceController } from "@/services/voice/voice-controller";
import { AudioManager } from "@/services/voice/audio-manager";
import { VoiceStateManager } from "@/services/voice/voice-state-manager";
import { ChatService } from "@/services/chat.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { VoiceState } from "@/services/voice/voice.types";

describe("STEP 6-12: Voice Continuous Loop, Barge-In & Inactivity", () => {
  let controller: VoiceController;
  const userId = "00000000-0000-0000-0000-000000000001";
  const orgId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    AudioManager.resetInstance();
    VoiceStateManager.resetInstance();
    VoiceController.resetInstance();

    // Mock AudioContext and mediaDevices
    class MockAudioContext {
      state = "running";
      resume = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
      createMediaStreamSource = vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() });
      createAnalyser = vi.fn().mockReturnValue({
        fftSize: 512,
        smoothingTimeConstant: 0.4,
        getFloatTimeDomainData: vi.fn(),
        getByteFrequencyData: vi.fn(),
      });
    }

    class MockSpeechRecognition {
      continuous = true;
      interimResults = true;
      lang = "en-US";
      onstart: any = null;
      onresult: any = null;
      onerror: any = null;
      onend: any = null;
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
    }

    const mockSpeechSynthesis = {
      speaking: false,
      speak: vi.fn((utt: any) => {
        // Asynchronously signal end of speaking
        setTimeout(() => {
          if (utt.onend) utt.onend();
        }, 15);
      }),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [{ name: "Google US English", lang: "en-US" }]),
    };

    (global as any).window = {
      AudioContext: MockAudioContext,
      SpeechRecognition: MockSpeechRecognition,
      speechSynthesis: mockSpeechSynthesis,
    };
    (global as any).SpeechSynthesisUtterance = class {
      text: string;
      onend: any = null;
      onerror: any = null;
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

    controller = new VoiceController({
      organizationId: orgId,
      userId: userId,
      config: {
        inactivityTimeoutMs: 100, // Short timeout for testing
      },
    });
  });

  afterEach(() => {
    controller.destroy();
    AudioManager.resetInstance();
    VoiceStateManager.resetInstance();
    vi.clearAllMocks();
  });

  it("should enter LISTENING state upon starting voice mode (STEP 4)", async () => {
    const started = await controller.startVoiceMode();
    expect(started).toBe(true);
    expect(controller.getState()).toBe("LISTENING");
  });

  it("should automatically process speech and persist to shared ELMO conversation (STEP 6, 7, 8)", async () => {
    await controller.startVoiceMode();
    const stt = controller.getSTT();

    // Mock transcript
    (stt as any).currentTranscript = "Good morning ELMO, what should I focus on today?";

    // Simulate VAD speech end
    await controller.handleUserUtteranceComplete();

    // Verify messages persisted in ChatService
    const chatService = ChatService.getInstance();
    const convs = await chatService.listConversations(userId, orgId);
    expect(convs.data.length).toBeGreaterThan(0);

    const convId = convs.data[0].id;
    const msgs = await chatService.listMessages(userId, orgId, convId);
    expect(msgs.data.length).toBe(2);
    expect(msgs.data[0].role).toBe("user");
    expect(msgs.data[0].content).toContain("Good morning ELMO");
    expect(msgs.data[1].role).toBe("assistant");
    expect(msgs.data[1].metadata.voiced).toBe(true);
  });

  it("should execute a 5-turn continuous conversation loop without pressing buttons (STEP 9)", async () => {
    await controller.startVoiceMode();
    expect(controller.getState()).toBe("LISTENING");

    const turns = [
      "Good morning ELMO. What should I focus on today?",
      "Which one should I handle first?",
      "Okay, follow up with those.",
      "Can you summarize the Q3 objectives?",
      "Thank you ELMO, that will be all.",
    ];

    const stateHistory: VoiceState[] = [];
    controller.getStateManager().subscribe((st) => {
      stateHistory.push(st);
    });

    for (let i = 0; i < turns.length; i++) {
      // Simulate user speaking
      controller.getStateManager().transition("USER_SPEAKING");

      (controller.getSTT() as any).currentTranscript = turns[i];
      await controller.handleUserUtteranceComplete();

      // Wait briefly for simulated TTS to complete if still in progress
      await new Promise((res) => setTimeout(res, 25));

      // Should automatically return to LISTENING without manual intervention!
      expect(controller.getState()).toBe("LISTENING");
    }

    // Verify all canonical states were visited in the loop
    expect(stateHistory).toContain("USER_SPEAKING");
    expect(stateHistory).toContain("PROCESSING");
    expect(stateHistory).toContain("ELMO_SPEAKING");
    expect(stateHistory).toContain("LISTENING");

    // Verify all 5 turns (10 messages: 5 user + 5 assistant) are in the conversation history
    const chatService = ChatService.getInstance();
    const convs = await chatService.listConversations(userId, orgId);
    const convId = convs.data[0].id;
    const msgs = await chatService.listMessages(userId, orgId, convId);
    expect(msgs.data.length).toBe(10);
  });

  it("should interrupt ELMO immediately when user begins speaking (STEP 10)", async () => {
    await controller.startVoiceMode();

    // Set ELMO speaking
    controller.getStateManager().transition("ELMO_SPEAKING");
    expect(controller.getState()).toBe("ELMO_SPEAKING");

    // Simulate VAD detecting user speech onset during ELMO speech
    const vad = controller.getVAD();
    (vad as any).notifySpeechStart();

    expect(controller.getState()).toBe("INTERRUPTED");
    expect((window as any).speechSynthesis.cancel).toHaveBeenCalled();

    // Wait for transition to USER_SPEAKING
    await new Promise((res) => setTimeout(res, 60));
    expect(controller.getState()).toBe("USER_SPEAKING");
  });

  it("should transition from LISTENING to STANDBY on inactivity timeout (STEP 11)", async () => {
    await controller.startVoiceMode();
    expect(controller.getState()).toBe("LISTENING");

    // Wait for the 100ms inactivity timeout
    await new Promise((res) => setTimeout(res, 150));

    expect(controller.getState()).toBe("STANDBY");
  });

  it("should gracefully recover from voice errors and allow retry or fallback (STEP 12)", () => {
    controller.handleVoiceError({
      code: "network_error",
      message: "Connection dropped.",
      recoverable: true,
    });

    expect(controller.getState()).toBe("ERROR");
    expect(controller.getStateManager().getError()?.code).toBe("network_error");

    // Fallback to text
    controller.fallbackToText();
    expect(controller.getState()).toBe("STANDBY");
  });
});
