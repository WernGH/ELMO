import { describe, it, expect, beforeEach } from "vitest";
import { LanguageContextService } from "@/services/voice/language-context.service";
import { GeminiService } from "@/services/gemini.service";
import { SupportedLanguage } from "@/services/voice/voice.types";

describe("CRITICAL: ELMO Global Multilingual Voice Suite", () => {
  let langService: LanguageContextService;
  let geminiService: GeminiService;

  beforeEach(() => {
    LanguageContextService.resetInstance();
    langService = LanguageContextService.getInstance();
    geminiService = GeminiService.getInstance();
  });

  // =========================================================================
  // 1. GLOBAL MULTI-FAMILY LANGUAGE DETECTION
  // =========================================================================
  describe("1. Broad Global Language Detection (10+ World Language Families)", () => {
    const testCases: {
      family: string;
      languageCode: string;
      utterance: string;
      expectedLang: string;
    }[] = [
      {
        family: "English",
        languageCode: "en",
        utterance: "Can you please give me an executive status briefing of our company performance?",
        expectedLang: "en",
      },
      {
        family: "Malay (Bahasa Melayu)",
        languageCode: "ms",
        utterance: "Boleh tolong semak status projek dan sediakan laporan kewangan syarikat bulan ini?",
        expectedLang: "ms",
      },
      {
        family: "Mandarin Chinese (中文)",
        languageCode: "zh",
        utterance: "你好，请检查我们公司的当前运营状态与财务营收报告。",
        expectedLang: "zh",
      },
      {
        family: "Spanish (Español)",
        languageCode: "es",
        utterance: "Hola ELMO, ¿cómo está el estado del proyecto y los informes de ventas de la empresa hoy?",
        expectedLang: "es",
      },
      {
        family: "French (Français)",
        languageCode: "fr",
        utterance: "Bonjour ELMO, quel est le statut de notre projet et les revenus de l'entreprise aujourd'hui s'il vous plaît?",
        expectedLang: "fr",
      },
      {
        family: "Japanese (日本語)",
        languageCode: "ja",
        utterance: "こんにちは、本日の会社のプロジェクト状況と売上レポートを確認してください。",
        expectedLang: "ja",
      },
      {
        family: "Korean (한국어)",
        languageCode: "ko",
        utterance: "안녕하세요, 오늘 우리 회사의 프로젝트 상태와 수익 보고서를 확인해 주십시오.",
        expectedLang: "ko",
      },
      {
        family: "Arabic (العربية)",
        languageCode: "ar",
        utterance: "مرحبا ELMO، هل يمكنك التحقق من حالة المشروع وإعداد تقرير أداء الشركة اليوم؟",
        expectedLang: "ar",
      },
      {
        family: "Hindi (हिन्दी)",
        languageCode: "hi",
        utterance: "नमस्ते ELMO, क्या आप आज हमारी कंपनी की स्थिति और परियोजना की प्रगति रिपोर्ट देख सकते हैं?",
        expectedLang: "hi",
      },
      {
        family: "Indonesian (Bahasa Indonesia)",
        languageCode: "id",
        utterance: "Halo ELMO, tolong berikan ringkasan status proyek dan laporan pendapatan perusahaan hari ini.",
        expectedLang: "id",
      },
      {
        family: "German (Deutsch)",
        languageCode: "de",
        utterance: "Guten Tag ELMO, wie ist der aktuelle Status unseres Unternehmens und der Umsatzbericht heute bitte?",
        expectedLang: "de",
      },
      {
        family: "Italian (Italiano)",
        languageCode: "it",
        utterance: "Buongiorno ELMO, come procede lo stato del progetto e il rapporto sulle vendite aziendali oggi?",
        expectedLang: "it",
      },
      {
        family: "Portuguese (Português)",
        languageCode: "pt",
        utterance: "Olá ELMO, por favor verifique o status do projeto e o relatório de receitas da empresa hoje.",
        expectedLang: "pt",
      },
      {
        family: "Russian (Русский)",
        languageCode: "ru",
        utterance: "Здравствуйте ELMO, пожалуйста проверьте статус проекта и отчет о доходах компании на сегодня.",
        expectedLang: "ru",
      },
    ];

    testCases.forEach(({ family, utterance, expectedLang }) => {
      it(`should accurately detect ${family} (${expectedLang}) without English bias`, () => {
        const detection = langService.detectLanguage(utterance);
        expect(detection.detectedLanguage).toBe(expectedLang);
        expect(detection.confidence).toBeGreaterThan(0.6);
      });
    });
  });

  // =========================================================================
  // 2. SAME-LANGUAGE RESPONSE GENERATION
  // =========================================================================
  describe("2. Same-Language Response Generation Across World Languages", () => {
    const responseTests = [
      {
        lang: "Spanish",
        prompt: "Hola ELMO, ¿cuál es el estado de la empresa?",
        expectedKeyword: "Saludos",
      },
      {
        lang: "French",
        prompt: "Bonjour ELMO, comment va le projet?",
        expectedKeyword: "Bonjour",
      },
      {
        lang: "Japanese",
        prompt: "こんにちは、本日の業務報告をお願いします。",
        expectedKeyword: "こんにちは",
      },
      {
        lang: "Korean",
        prompt: "안녕하세요, 프로젝트 진행 상황을 확인해 주세요.",
        expectedKeyword: "안녕하세요",
      },
      {
        lang: "Arabic",
        prompt: "مرحبا، ما هو تقرير أداء الشركة؟",
        expectedKeyword: "مرحباً",
      },
      {
        lang: "Hindi",
        prompt: "नमस्ते, कंपनी की रिपोर्ट दिखाइए।",
        expectedKeyword: "नमस्ते",
      },
      {
        lang: "Indonesian",
        prompt: "Halo ELMO, bagaimana status laporan perusahaan hari ini?",
        expectedKeyword: "Salam sejahtera",
      },
      {
        lang: "Malay",
        prompt: "Boleh tolong sediakan laporan syarikat?",
        expectedKeyword: "Salam sejahtera",
      },
      {
        lang: "Mandarin",
        prompt: "请检查一下今天公司的运营报告。",
        expectedKeyword: "您好",
      },
      {
        lang: "English",
        prompt: "Please advise on our strategic corporate roadmap and executive priorities.",
        expectedKeyword: "Understood",
      },
    ];

    responseTests.forEach(({ lang, prompt, expectedKeyword }) => {
      it(`ELMO must respond in ${lang} when user speaks ${lang}`, async () => {
        const res = await geminiService.generateResponse({ prompt });
        expect(res.text).toContain(expectedKeyword);
      });
    });
  });

  // =========================================================================
  // 3. CONTINUOUS MULTI-TURN DYNAMIC LANGUAGE SWITCHING
  // =========================================================================
  describe("3. Multi-Turn Language Switching in a Single Continuous Conversation", () => {
    it("ELMO must automatically follow every language switch (English -> Malay -> Mandarin -> Spanish -> Japanese) without resetting", () => {
      // Turn 1: User speaks English
      let ctx = langService.updateContext("Good morning, what is on our executive agenda today?");
      expect(ctx.responseLanguage).toBe("en");
      expect(ctx.languageChanged).toBe(false);

      // Turn 2: User switches to Malay
      ctx = langService.updateContext("Boleh saya tahu status projek kewangan syarikat sekarang?");
      expect(ctx.responseLanguage).toBe("ms");
      expect(ctx.previousLanguage).toBe("en");
      expect(ctx.languageChanged).toBe(true);

      // Turn 3: User switches to Mandarin
      ctx = langService.updateContext("好的，我们现在讨论下个季度的预算与财务报表。");
      expect(ctx.responseLanguage).toBe("zh");
      expect(ctx.previousLanguage).toBe("ms");
      expect(ctx.languageChanged).toBe(true);

      // Turn 4: User switches to Spanish
      ctx = langService.updateContext("Excelente, ahora por favor revisa el estado de ventas del proyecto.");
      expect(ctx.responseLanguage).toBe("es");
      expect(ctx.previousLanguage).toBe("zh");
      expect(ctx.languageChanged).toBe(true);

      // Turn 5: User switches to Japanese
      ctx = langService.updateContext("わかりました。日本の顧客向けのマーケティング戦略を確認してください。");
      expect(ctx.responseLanguage).toBe("ja");
      expect(ctx.previousLanguage).toBe("es");
      expect(ctx.languageChanged).toBe(true);

      // Conversation must remain seamless and remember latest active language
      expect(langService.getContext().responseLanguage).toBe("ja");
    });
  });

  // =========================================================================
  // 4. ZERO ENGLISH BIAS & HYSTERESIS MEMORY
  // =========================================================================
  describe("4. Zero English Bias & Hysteresis Memory", () => {
    it("must retain active conversational language on short/ambiguous phrases instead of defaulting to English", () => {
      // Establish Spanish as active language
      langService.updateContext("Hola ELMO, ¿cómo están los ingresos de la empresa?");
      expect(langService.getContext().responseLanguage).toBe("es");

      // Short ambiguous affirmation
      const shortResult = langService.detectLanguage("OK");
      // Must NOT default to English!
      expect(shortResult.detectedLanguage).toBe("es");

      // Number input
      const numberResult = langService.detectLanguage("1 2 3");
      expect(numberResult.detectedLanguage).toBe("es");
    });

    it("must retain Japanese when user replies with brief affirmation", () => {
      langService.updateContext("こんにちは、本日の売上をお願いします。");
      expect(langService.getContext().responseLanguage).toBe("ja");

      const briefAffirmation = langService.detectLanguage("はい");
      expect(briefAffirmation.detectedLanguage).toBe("ja");
    });
  });

  // =========================================================================
  // 5. EXPLICIT USER LANGUAGE OVERRIDES
  // =========================================================================
  describe("5. Explicit User Language Directives", () => {
    it("should honor explicit command 'Answer me in Spanish'", () => {
      const detection = langService.detectLanguage("Please answer me in Spanish from now on.");
      expect(detection.detectedLanguage).toBe("es");
      expect(detection.isExplicitOverride).toBe(true);
    });

    it("should honor explicit command 'Switch back to English'", () => {
      // First set to Spanish
      langService.setResponseLanguage("es");
      expect(langService.getContext().responseLanguage).toBe("es");

      // Switch back
      const ctx = langService.updateContext("Switch back to English please.");
      expect(ctx.responseLanguage).toBe("en");
      expect(ctx.isExplicitOverride).toBe(true);
    });

    it("should honor explicit command in target language e.g. '日本語で話して'", () => {
      const detection = langService.detectLanguage("日本語で話してください");
      expect(detection.detectedLanguage).toBe("ja");
      expect(detection.isExplicitOverride).toBe(true);
    });
  });

  // =========================================================================
  // 6. CODE-MIXED / MULTILINGUAL SPEECH
  // =========================================================================
  describe("6. Code-Mixed Speech (Manglish, Chinglish)", () => {
    it("should detect Manglish / Bahasa Rojak (Malay + English)", () => {
      const detection = langService.detectLanguage("ELMO, boleh tolong check status revenue bulan ini tak?");
      expect(detection.detectedLanguage).toBe("mixed");
      expect(detection.isMixed).toBe(true);
    });

    it("should detect code-mixed Mandarin + English", () => {
      const detection = langService.detectLanguage("ELMO, 帮我 check 一下今天的 sales 报告。");
      expect(detection.detectedLanguage).toBe("zh");
      expect(detection.isMixed).toBe(true);
    });
  });

  // =========================================================================
  // 7. PROVIDER CAPABILITY SYSTEM & BCP-47 MAPPINGS
  // =========================================================================
  describe("7. Provider Capability System & BCP-47 Tag Resolution", () => {
    it("should provide capabilities for major world languages", () => {
      const capabilities = langService.getAllCapabilities();
      expect(capabilities.length).toBeGreaterThanOrEqual(30);

      const spanishCap = langService.getCapability("es");
      expect(spanishCap.languageCode).toBe("es");
      expect(spanishCap.bcp47Tag).toBe("es-ES");
      expect(spanishCap.nativeName).toBe("Español");

      const japaneseCap = langService.getCapability("ja");
      expect(japaneseCap.bcp47Tag).toBe("ja-JP");
      expect(japaneseCap.nativeName).toBe("日本語");

      const arabicCap = langService.getCapability("ar");
      expect(arabicCap.bcp47Tag).toBe("ar-SA");
      expect(arabicCap.nativeName).toBe("العربية");

      const hindiCap = langService.getCapability("hi");
      expect(hindiCap.bcp47Tag).toBe("hi-IN");
      expect(hindiCap.nativeName).toBe("हिन्दी");
    });

    it("should dynamically resolve BCP-47 tags for any supported world language", () => {
      expect(LanguageContextService.getBcp47Tag("es")).toBe("es-ES");
      expect(LanguageContextService.getBcp47Tag("ja")).toBe("ja-JP");
      expect(LanguageContextService.getBcp47Tag("fr")).toBe("fr-FR");
      expect(LanguageContextService.getBcp47Tag("de")).toBe("de-DE");
      expect(LanguageContextService.getBcp47Tag("ko")).toBe("ko-KR");
      expect(LanguageContextService.getBcp47Tag("ar")).toBe("ar-SA");
      expect(LanguageContextService.getBcp47Tag("hi")).toBe("hi-IN");
      expect(LanguageContextService.getBcp47Tag("id")).toBe("id-ID");
      expect(LanguageContextService.getBcp47Tag("pt")).toBe("pt-BR");
      expect(LanguageContextService.getBcp47Tag("ru")).toBe("ru-RU");
      expect(LanguageContextService.getBcp47Tag("ms")).toBe("ms-MY");
      expect(LanguageContextService.getBcp47Tag("zh")).toBe("zh-CN");
      expect(LanguageContextService.getBcp47Tag("en")).toBe("en-US");
    });
  });
});
