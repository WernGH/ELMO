import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VoiceController } from "@/services/voice/voice-controller";
import { VoiceStateManager } from "@/services/voice/voice-state-manager";
import { AudioManager } from "@/services/voice/audio-manager";
import { VoiceState } from "@/services/voice/voice.types";
import fs from "fs";
import path from "path";

describe("Phase 3: Full-Screen Natural Voice AI Command Center Suite", () => {
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

  describe("1. Full-Screen Viewport & Composition Architecture", () => {
    it("FullScreenSpeakMode component must use full-screen viewport layout (100vw/100vh)", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/components/voice/FullScreenSpeakMode.tsx"
      );
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).toContain("fixed inset-0 z-50 w-screen h-screen");
      expect(content).toContain("bg-[#03060C]");
      expect(content).toContain("role=\"dialog\"");
      expect(content).toContain("aria-modal=\"true\"");
    });

    it("FullScreenSpeakMode and ELMOHalfBodyRobot must embed Floating AI Core without robotic body parts", () => {
      const fullScreenPath = path.join(
        process.cwd(),
        "src/components/voice/FullScreenSpeakMode.tsx"
      );
      expect(fs.existsSync(fullScreenPath)).toBe(true);
      const fsContent = fs.readFileSync(fullScreenPath, "utf-8");

      // Verify FullScreenSpeakMode embeds ElmoCore as the primary visual focus
      expect(fsContent).toContain("<ElmoCore");
      expect(fsContent).toContain("size=\"full\"");

      const halfBodyPath = path.join(
        process.cwd(),
        "src/components/ui/ELMOHalfBodyRobot.tsx"
      );
      expect(fs.existsSync(halfBodyPath)).toBe(true);
      const hbContent = fs.readFileSync(halfBodyPath, "utf-8");

      // Verify ELMOHalfBodyRobot renders ElmoCore and has no cybernetic body parts
      expect(hbContent).toContain("ElmoCore");
      expect(hbContent).not.toContain("Cybernetic Neck Coupling");
      expect(hbContent).not.toContain("Shoulders / Pauldrons");
      expect(hbContent).not.toContain("Main Chest Plate");
      expect(hbContent.toLowerCase()).not.toContain("feet");
      expect(hbContent.toLowerCase()).not.toContain("leg");
    });
  });

  describe("2. Dynamic Real-Time Voice Waveform Reactivity", () => {
    it("VoiceWaveform must handle real-time audio reactivity for all states", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/components/voice/VoiceWaveform.tsx"
      );
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).toContain("<canvas");
      expect(content).toContain("requestAnimationFrame");
      expect(content).toContain("cancelAnimationFrame");
      expect(content).toContain("USER_SPEAKING");
      expect(content).toContain("ELMO_SPEAKING");
      expect(content).toContain("PROCESSING");
      expect(content).toContain("LISTENING");
      expect(content).toContain("INTERRUPTED");
    });
  });

  describe("3. Natural Continuous Loop Without Wake Word", () => {
    it("should start directly into LISTENING mode without requiring 'Hey ELMO'", async () => {
      const started = await controller.startVoiceMode();
      expect(started).toBe(true);
      expect(controller.getStateManager().getState()).toBe("LISTENING");
      expect(controller.isContinuous()).toBe(true);
    });

    it("should loop back to LISTENING automatically upon speech completion", async () => {
      await controller.startVoiceMode();
      const stateMgr = controller.getStateManager();

      stateMgr.transition("PROCESSING");
      stateMgr.transition("ELMO_SPEAKING");
      expect(stateMgr.getState()).toBe("ELMO_SPEAKING");

      // Speech ends -> triggers registered notification
      (controller.getTTS() as any).notifyEnd();

      expect(stateMgr.getState()).toBe("LISTENING");
    });
  });

  describe("4. Instant Barge-In Interruption", () => {
    it("should instantly halt speech playback and transition to INTERRUPTED on barge-in", async () => {
      await controller.startVoiceMode();
      const stateMgr = controller.getStateManager();

      stateMgr.transition("ELMO_SPEAKING");
      expect(stateMgr.getState()).toBe("ELMO_SPEAKING");

      // User begins speaking -> VAD fires speech start
      (controller.getVAD() as any).notifySpeechStart();

      expect(stateMgr.getState()).toBe("INTERRUPTED");
      expect((window as any).speechSynthesis.cancel).toHaveBeenCalled();
    });

    it("controller.interrupt() must transition to INTERRUPTED immediately", async () => {
      await controller.startVoiceMode();
      const stateMgr = controller.getStateManager();
      stateMgr.transition("ELMO_SPEAKING");

      controller.interrupt();
      expect(stateMgr.getState()).toBe("INTERRUPTED");
    });
  });

  describe("5. Clean UI Branding (Strictly ZERO Forbidden Terms in Full-Screen Files)", () => {
    const forbiddenTerms = [
      "JARVIS",
      "Jarvis",
      "ELMO CEO",
      "AI CEO",
      "CEO Dashboard",
      "CEO Brain",
      "CEO's Superior",
    ];

    const sourceFilesToCheck = [
      "src/components/voice/FullScreenSpeakMode.tsx",
      "src/components/ui/ELMOHalfBodyRobot.tsx",
      "src/components/voice/VoiceWaveform.tsx",
      "src/app/(dashboard)/speak/page.tsx",
      "src/app/(dashboard)/overview/page.tsx",
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

  describe("6. Accessibility & Full-Screen Exit Controls", () => {
    it("FullScreenSpeakMode must support keyboard escape handler and clean exit", () => {
      const fullPath = path.join(
        process.cwd(),
        "src/components/voice/FullScreenSpeakMode.tsx"
      );
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content).toContain("e.key === \"Escape\"");
      expect(content).toContain("handleExit");
      expect(content).toContain("EXIT VOICE MODE");
      expect(content).toContain("MENU");
    });
  });
});
