import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VoiceController } from "@/services/voice/voice-controller";
import { VoiceStateManager } from "@/services/voice/voice-state-manager";
import { AudioManager } from "@/services/voice/audio-manager";
import { VoiceState } from "@/services/voice/voice.types";
import { STATE_METADATA } from "@/components/ui/ELMORobot";
import fs from "fs";
import path from "path";

describe("Phase 3: Natural Voice AI + Blue Neon Command Center Test Suite", () => {
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
        inactivityTimeoutMs: 100,
      },
    });
  });

  afterEach(() => {
    controller.destroy();
    AudioManager.resetInstance();
    VoiceStateManager.resetInstance();
    vi.clearAllMocks();
  });

  describe("1. 7 Operational Voice States", () => {
    const requiredPhase3States: VoiceState[] = [
      "STANDBY",
      "LISTENING",
      "USER_SPEAKING",
      "PROCESSING",
      "ELMO_SPEAKING",
      "INTERRUPTED",
      "ERROR",
    ];

    it("must support all 7 operational voice states in state metadata", () => {
      requiredPhase3States.forEach((state) => {
        expect(STATE_METADATA[state]).toBeDefined();
        expect(STATE_METADATA[state].label).toBeTruthy();
        expect(STATE_METADATA[state].subtext).toBeTruthy();
      });
    });

    it("must support valid transitions across all 7 operational states", () => {
      const stateMgr = controller.getStateManager();

      expect(stateMgr.getState()).toBe("STANDBY");

      stateMgr.transition("LISTENING");
      expect(stateMgr.getState()).toBe("LISTENING");

      stateMgr.transition("USER_SPEAKING");
      expect(stateMgr.getState()).toBe("USER_SPEAKING");

      stateMgr.transition("PROCESSING");
      expect(stateMgr.getState()).toBe("PROCESSING");

      stateMgr.transition("ELMO_SPEAKING");
      expect(stateMgr.getState()).toBe("ELMO_SPEAKING");

      stateMgr.transition("INTERRUPTED");
      expect(stateMgr.getState()).toBe("INTERRUPTED");

      stateMgr.transition("ERROR", { code: "tts_error", message: "Test alert" });
      expect(stateMgr.getState()).toBe("ERROR");

      stateMgr.transition("STANDBY");
      expect(stateMgr.getState()).toBe("STANDBY");
    });
  });

  describe("2. Continuous Conversation Loop (Strictly NO Wake Word)", () => {
    it("should start voice mode directly into LISTENING without wake word required", async () => {
      const started = await controller.startVoiceMode();
      expect(started).toBe(true);
      expect(controller.getStateManager().getState()).toBe("LISTENING");
      expect(controller.isContinuous()).toBe(true);
    });

    it("should automatically loop from ELMO_SPEAKING back to LISTENING upon TTS completion", async () => {
      await controller.startVoiceMode();
      const stateMgr = controller.getStateManager();

      // Simulate state progression
      stateMgr.transition("PROCESSING");
      stateMgr.transition("ELMO_SPEAKING");
      expect(stateMgr.getState()).toBe("ELMO_SPEAKING");

      // TTS finishes speaking -> triggers registered notifyEnd()
      const tts = controller.getTTS();
      (tts as any).notifyEnd();

      // Must automatically return to LISTENING for hands-free natural loop
      expect(stateMgr.getState()).toBe("LISTENING");
    });
  });

  describe("3. Instant Barge-In Interruption", () => {
    it("should immediately cancel speech synthesis and transition to INTERRUPTED on barge-in", async () => {
      await controller.startVoiceMode();
      const stateMgr = controller.getStateManager();

      stateMgr.transition("ELMO_SPEAKING");
      expect(stateMgr.getState()).toBe("ELMO_SPEAKING");

      // User speaks while ELMO is speaking -> VAD detects speech start
      const vad = controller.getVAD();
      (vad as any).notifySpeechStart();

      // Must immediately transition to INTERRUPTED
      expect(stateMgr.getState()).toBe("INTERRUPTED");
      expect(controller.getTTS().isSpeaking()).toBe(false);
    });

    it("should support manual interrupt trigger", async () => {
      await controller.startVoiceMode();
      const stateMgr = controller.getStateManager();
      stateMgr.transition("ELMO_SPEAKING");

      controller.interrupt();
      expect(stateMgr.getState()).toBe("INTERRUPTED");
    });
  });

  describe("4. Pause & Resume Controls", () => {
    it("should pause voice mode without destroying configuration", async () => {
      await controller.startVoiceMode();
      expect(controller.isContinuous()).toBe(true);

      controller.pauseVoiceMode();
      expect(controller.isPaused()).toBe(true);
      expect(controller.getStateManager().getState()).toBe("STANDBY");

      await controller.resumeVoiceMode();
      expect(controller.isPaused()).toBe(false);
      expect(controller.getStateManager().getState()).toBe("LISTENING");
    });
  });

  describe("5. Clean UI Branding (Strictly ZERO Forbidden Terms in View Files)", () => {
    const forbiddenTerms = [
      "JARVIS",
      "Jarvis",
      "ELMO CEO",
      "CEO Dashboard",
      "CEO Brain",
      "CEO's Superior",
    ];

    const sourceFilesToCheck = [
      "src/app/(dashboard)/overview/page.tsx",
      "src/components/voice/LiveConversationPanel.tsx",
      "src/components/dashboard/BottomOverviewArea.tsx",
      "src/components/ui/HolographicRings.tsx",
      "src/components/layout/sidebar.tsx",
      "src/components/layout/header.tsx",
    ];

    sourceFilesToCheck.forEach((relPath) => {
      it(`must NOT contain any forbidden terms in ${relPath}`, () => {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, "utf-8");

        forbiddenTerms.forEach((term) => {
          expect(content).not.toContain(term);
        });
      });
    });
  });

  describe("6. Bottom Overview Required Metrics & Insights", () => {
    it("must specify Leads: 38, Tasks: 12, Goals: 3, AI Employees: 7 in BottomOverviewArea", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/components/dashboard/BottomOverviewArea.tsx"
      );
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).toContain('"38"');
      expect(content).toContain('"12"');
      expect(content).toContain('"3"');
      expect(content).toContain('"7"');
      expect(content).toContain("LEADS");
      expect(content).toContain("TASKS");
      expect(content).toContain("GOALS");
      expect(content).toContain("AI EMPLOYEES");
    });

    it("must include the exact required ELMO Insight text", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/components/dashboard/BottomOverviewArea.tsx"
      );
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).toContain(
        "Prime opportunity detected in your current lead pipeline."
      );
    });
  });
});
