import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VoiceController } from "@/services/voice/voice-controller";
import { AudioManager } from "@/services/voice/audio-manager";
import { VoiceStateManager } from "@/services/voice/voice-state-manager";
import { ChatService } from "@/services/chat.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { VoiceState } from "@/services/voice/voice.types";

describe("STEP 24: Complete End-to-End Hands-Free Voice Conversation", () => {
  let controller: VoiceController;
  const userId = "00000000-0000-0000-0000-000000000001";
  const orgId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    AudioManager.resetInstance();
    VoiceStateManager.resetInstance();
    VoiceController.resetInstance();

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
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
    }

    const mockSpeechSynthesis = {
      speaking: false,
      speak: vi.fn((utt: any) => {
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
        inactivityTimeoutMs: 5000,
      },
    });
  });

  afterEach(() => {
    controller.destroy();
    AudioManager.resetInstance();
    VoiceStateManager.resetInstance();
    vi.clearAllMocks();
  });

  it("should execute full multi-turn conversational scenario with context and barge-in", async () => {
    // 1. Initial Start: User enables voice mode once
    const started = await controller.startVoiceMode();
    expect(started).toBe(true);
    expect(controller.getState()).toBe("LISTENING");

    const stateHistory: VoiceState[] = [];
    controller.getStateManager().subscribe((st) => stateHistory.push(st));

    // Turn 1: USER: "Good morning ELMO. What should I focus on today?"
    controller.getStateManager().transition("USER_SPEAKING");
    (controller.getSTT() as any).currentTranscript = "Good morning ELMO. What should I focus on today?";
    await controller.handleUserUtteranceComplete();

    // ELMO responds automatically by voice, then returns to LISTENING
    await new Promise((res) => setTimeout(res, 25));
    expect(controller.getState()).toBe("LISTENING");

    // Turn 2: USER: "Which one should I handle first?"
    controller.getStateManager().transition("USER_SPEAKING");
    (controller.getSTT() as any).currentTranscript = "Which one should I handle first?";
    await controller.handleUserUtteranceComplete();

    await new Promise((res) => setTimeout(res, 25));
    expect(controller.getState()).toBe("LISTENING");

    // Turn 3: USER: "Okay, follow up with those."
    controller.getStateManager().transition("USER_SPEAKING");
    (controller.getSTT() as any).currentTranscript = "Okay, follow up with those.";
    await controller.handleUserUtteranceComplete();

    await new Promise((res) => setTimeout(res, 25));
    expect(controller.getState()).toBe("LISTENING");

    // Turn 4: Barge-in interruption while ELMO is speaking
    // Simulate ELMO beginning speech
    controller.getStateManager().transition("ELMO_SPEAKING");
    expect(controller.getState()).toBe("ELMO_SPEAKING");

    // USER interrupts: "Wait, stop."
    // VAD detects speech onset during playback
    (controller.getVAD() as any).notifySpeechStart();
    expect(controller.getState()).toBe("INTERRUPTED");
    expect((window as any).speechSynthesis.cancel).toHaveBeenCalled();

    // Transition to USER_SPEAKING after interruption
    await new Promise((res) => setTimeout(res, 60));
    expect(controller.getState()).toBe("USER_SPEAKING");

    // Turn 5: USER continues: "Tell me something else."
    (controller.getSTT() as any).currentTranscript = "Tell me something else.";
    await controller.handleUserUtteranceComplete();

    await new Promise((res) => setTimeout(res, 25));
    expect(controller.getState()).toBe("LISTENING");

    // Verify complete multi-turn conversation persistence
    const chatService = ChatService.getInstance();
    const convs = await chatService.listConversations(userId, orgId);
    expect(convs.data.length).toBeGreaterThan(0);
    const convId = convs.data[0].id;
    const msgs = await chatService.listMessages(userId, orgId, convId);

    // 4 completed queries with responses
    expect(msgs.data.length).toBe(8);
    expect(msgs.data[0].content).toContain("Good morning ELMO");
    expect(msgs.data[2].content).toContain("Which one should I handle first?");
    expect(msgs.data[4].content).toContain("Okay, follow up with those.");
    expect(msgs.data[6].content).toContain("Tell me something else.");

    // Verify all voice states occurred during session
    expect(stateHistory).toContain("LISTENING");
    expect(stateHistory).toContain("USER_SPEAKING");
    expect(stateHistory).toContain("PROCESSING");
    expect(stateHistory).toContain("ELMO_SPEAKING");
    expect(stateHistory).toContain("INTERRUPTED");
  });
});
