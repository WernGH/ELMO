import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SpeechToTextService } from "@/services/voice/stt.service";
import { VoiceController } from "@/services/voice/voice-controller";
import { LanguageContextService } from "@/services/voice/language-context.service";
import { VoiceStateManager } from "@/services/voice/voice-state-manager";
import { AudioManager } from "@/services/voice/audio-manager";

describe("Phase 3: Multilingual Voice Input Detection & Dynamic Switching", () => {
  let originalWindow: any;
  let mockRecognitionInstance: any;

  beforeEach(() => {
    AudioManager.resetInstance();
    VoiceStateManager.resetInstance();
    VoiceController.resetInstance();
    LanguageContextService.resetInstance();

    // Mock localStorage
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const k in store) delete store[k];
      }),
    };

    // Mock SpeechRecognition
    mockRecognitionInstance = {
      continuous: true,
      interimResults: true,
      lang: "en-US",
      maxAlternatives: 1,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onstart: null,
      onresult: null,
      onerror: null,
      onend: null,
    };

    class MockSpeechRecognition {
      continuous = true;
      interimResults = true;
      lang = "en-US";
      maxAlternatives = 1;
      start = mockRecognitionInstance.start;
      stop = mockRecognitionInstance.stop;
      abort = mockRecognitionInstance.abort;
      onstart = null;
      onresult = null;
      onerror = null;
      onend = null;
    }

    originalWindow = (global as any).window;
    (global as any).window = {
      SpeechRecognition: MockSpeechRecognition,
      webkitSpeechRecognition: MockSpeechRecognition,
      localStorage: mockLocalStorage,
      speechSynthesis: {
        speak: vi.fn((utt: any) => {
          setTimeout(() => {
            if (utt.onend) utt.onend();
          }, 10);
        }),
        cancel: vi.fn(),
        getVoices: vi.fn().mockReturnValue([]),
      },
    };
    (global as any).SpeechSynthesisUtterance = class {
      text = "";
      lang = "en-US";
      onend = null;
      onerror = null;
    };
  });

  afterEach(() => {
    (global as any).window = originalWindow;
    vi.restoreAllMocks();
  });

  it("should initialize SpeechToTextService and default to valid BCP-47 tag", () => {
    const stt = new SpeechToTextService();
    expect(stt.getCurrentLanguage()).toBeDefined();
    expect(stt.isSupported()).toBe(true);
  });

  it("should dynamically switch STT recognition model when setLanguage is called", async () => {
    const stt = new SpeechToTextService();
    await stt.start("en-US");

    expect(mockRecognitionInstance.start).toHaveBeenCalled();
    expect(stt.getCurrentLanguage()).toBe("en-US");

    // Switch to Malay (Bahasa Melayu)
    stt.setLanguage("ms");
    expect(stt.getCurrentLanguage()).toBe("ms-MY");
    expect(mockRecognitionInstance.abort).toHaveBeenCalled();
    expect((window as any).localStorage.setItem).toHaveBeenCalledWith("elmo_voice_language", "ms-MY");

    // Switch to Mandarin Chinese
    stt.setLanguage("zh");
    expect(stt.getCurrentLanguage()).toBe("zh-CN");
    expect((window as any).localStorage.setItem).toHaveBeenCalledWith("elmo_voice_language", "zh-CN");

    // Switch to Japanese
    stt.setLanguage("ja");
    expect(stt.getCurrentLanguage()).toBe("ja-JP");

    // Switch to Spanish
    stt.setLanguage("es");
    expect(stt.getCurrentLanguage()).toBe("es-ES");
  });

  it("should load persisted voice language preference from localStorage on init", async () => {
    ((window as any).localStorage.getItem as any).mockReturnValue("ms-MY");

    const stt = new SpeechToTextService();
    await stt.start("auto");

    expect(stt.getCurrentLanguage()).toBe("ms-MY");
  });

  it("should dynamically switch language across the entire VoiceController stack", () => {
    const controller = VoiceController.getInstance();

    // Switch to Malay
    controller.setLanguage("ms");
    expect(controller.getLanguage()).toBe("ms-MY");
    expect(controller.getLanguageContextService().getContext().responseLanguage).toBe("ms");
    expect(controller.getSTT().getCurrentLanguage()).toBe("ms-MY");

    // Switch to Mandarin
    controller.setLanguage("zh");
    expect(controller.getLanguage()).toBe("zh-CN");
    expect(controller.getLanguageContextService().getContext().responseLanguage).toBe("zh");
    expect(controller.getSTT().getCurrentLanguage()).toBe("zh-CN");

    // Switch to Japanese
    controller.setLanguage("ja");
    expect(controller.getLanguage()).toBe("ja-JP");
    expect(controller.getLanguageContextService().getContext().responseLanguage).toBe("ja");
    expect(controller.getSTT().getCurrentLanguage()).toBe("ja-JP");
  });

  it("should adapt STT language model automatically after user speaks in another language", async () => {
    const controller = VoiceController.getInstance();
    controller.setLanguage("en");
    expect(controller.getSTT().getCurrentLanguage()).toBe("en-US");

    // User speaks in Malay
    await controller.handleUserUtteranceComplete("Boleh tolong semak status projek syarikat hari ini?");

    // Controller should adapt STT language to Malay for subsequent turns
    expect(controller.getLanguage()).toBe("ms-MY");
    expect(controller.getSTT().getCurrentLanguage()).toBe("ms-MY");
  });
});
