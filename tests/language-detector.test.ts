import { describe, it, expect, beforeEach } from "vitest";
import { LanguageContextService } from "@/services/voice/language-context.service";

describe("Phase 3: LanguageContextService — Realtime Multilingual Engine", () => {
  let langService: LanguageContextService;

  beforeEach(() => {
    LanguageContextService.resetInstance();
    langService = LanguageContextService.getInstance();
  });

  it("should accurately detect English speech", () => {
    const result = langService.detectLanguage("Can you please give me a summary of our company revenue today?");
    expect(result.detectedLanguage).toBe("en");
    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.isMixed).toBe(false);
  });

  it("should accurately detect Bahasa Melayu (Malay) speech", () => {
    const result = langService.detectLanguage("Boleh tolong sediakan laporan kewangan syarikat bulan ini?");
    expect(result.detectedLanguage).toBe("ms");
    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.isMixed).toBe(false);
  });

  it("should accurately detect Mandarin Chinese speech using CJK Unicode detection", () => {
    const result = langService.detectLanguage("你好，请检查我们公司的当前运营状态与财务报告。");
    expect(result.detectedLanguage).toBe("zh");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("should accurately detect code-mixed speech (Manglish / Bahasa Rojak)", () => {
    const result = langService.detectLanguage("ELMO, boleh tolong check status revenue bulan ini tak?");
    expect(result.detectedLanguage).toBe("mixed");
    expect(result.isMixed).toBe(true);
  });

  it("should dynamically update LanguageContext and determine appropriate response language", () => {
    // 1. Initial English prompt
    let context = langService.updateContext("Good morning, what is on the executive agenda?");
    expect(context.responseLanguage).toBe("en");
    expect(context.languageChanged).toBe(false);

    // 2. User switches to Malay
    context = langService.updateContext("Boleh saya tahu status projek sekarang?");
    expect(context.responseLanguage).toBe("ms");
    expect(context.languageChanged).toBe(true);
    expect(context.previousLanguage).toBe("en");

    // 3. User switches to Mandarin
    context = langService.updateContext("好的，我们现在讨论下个季度的预算。");
    expect(context.responseLanguage).toBe("zh");
    expect(context.languageChanged).toBe(true);
    expect(context.previousLanguage).toBe("ms");
  });

  it("should return correct BCP-47 tags for speech synthesis and recognition", () => {
    expect(LanguageContextService.getBcp47Tag("en")).toBe("en-US");
    expect(LanguageContextService.getBcp47Tag("ms")).toBe("ms-MY");
    expect(LanguageContextService.getBcp47Tag("zh")).toBe("zh-CN");
    expect(LanguageContextService.getBcp47Tag("mixed")).toBe("en-US");
  });

  it("should return human-readable language labels", () => {
    expect(LanguageContextService.getLanguageLabel("en")).toBe("English");
    expect(LanguageContextService.getLanguageLabel("ms")).toBe("Bahasa Melayu");
    expect(LanguageContextService.getLanguageLabel("zh")).toContain("Mandarin");
    expect(LanguageContextService.getLanguageLabel("mixed")).toContain("Multilingual");
  });
});
