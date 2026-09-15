/**
 * ELMO Universal Global Multilingual Language Context Service
 * Fully internationalized, zero-English-bias language intelligence engine.
 *
 * Core Capabilities:
 * - Automatic real-time language detection across global language families
 *   (East Asian, South Asian, Southeast Asian, Middle Eastern, European, Cyrillic)
 * - Multi-script detection (CJK, Hiragana, Katakana, Hangul, Devanagari, Arabic, Cyrillic, Thai, Hebrew, Greek)
 * - Latin-script stop-word & n-gram lexical analysis (Spanish, French, German, Italian, Portuguese, Indonesian, Malay, etc.)
 * - Code-mixed speech detection (Manglish/Bahasa Rojak, Chinglish, Spanglish)
 * - Explicit user language instruction recognition ("Answer me in Spanish", "Switch to English")
 * - Confidence hysteresis & anti-jitter memory (preserves active conversational language on short/ambiguous phrases)
 * - Open-ended provider capability registration system
 */

import {
  LanguageCapability,
  LanguageContext,
  LanguageDetectionResult,
  SupportedLanguage,
} from "./voice.types";

export class LanguageContextService {
  private static instance: LanguageContextService | null = null;

  // Active conversational language context (No hardcoded English default)
  private currentContext: LanguageContext = {
    detectedLanguage: "auto",
    confidence: 1.0,
    previousLanguage: "auto",
    responseLanguage: "auto",
    languageChanged: false,
    mixedLanguage: false,
    languageCode: "auto",
    languageName: "Auto Detect",
    nativeName: "Auto Detect",
    isExplicitOverride: false,
    timestamp: Date.now(),
  };

  private listeners: Set<(context: LanguageContext) => void> = new Set();

  // =========================================================================
  // 1. GLOBAL SCRIPT REGEX DEFINITIONS (Unicode Ranges)
  // =========================================================================
  private readonly SCRIPT_PATTERNS = {
    japaneseKana: /[\u3040-\u309F\u30A0-\u30FF]/, // Hiragana & Katakana
    koreanHangul: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,
    chineseCjk: /[\u4e00-\u9fff]/,
    arabic: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/,
    hindiDevanagari: /[\u0900-\u097F]/,
    bengali: /[\u0980-\u09FF]/,
    tamil: /[\u0B80-\u0BFF]/,
    telugu: /[\u0C00-\u0C7F]/,
    cyrillic: /[\u0400-\u04FF]/,
    thai: /[\u0E00-\u0E7F]/,
    hebrew: /[\u0590-\u05FF]/,
    greek: /[\u0370-\u03FF]/,
  };

  // =========================================================================
  // 2. LATIN-SCRIPT LEXICAL STOP WORDS & KEY PHRASES
  // =========================================================================
  private readonly LEXICON_PATTERNS: Record<string, Set<string>> = {
    // Spanish
    es: new Set([
      "hola", "gracias", "por", "favor", "cómo", "como", "proyecto", "estado",
      "empresa", "informe", "ingresos", "ventas", "revisar", "qué", "que", "cuándo",
      "dónde", "quién", "para", "con", "los", "las", "una", "uno", "del", "está",
      "estos", "estoy", "buenos", "días", "tardes", "noches", "ayuda", "puedes",
      "necesito", "sistema", "todos", "sobre", "nuestro", "nuestra", "ahora",
      "puedo", "conseguir", "clientes", "más", "mas", "cuál", "cual", "este", "esta"
    ]),
    // French
    fr: new Set([
      "bonjour", "merci", "s'il", "vous", "plaît", "projet", "statut", "entreprise",
      "rapport", "revenus", "comment", "que", "quoi", "quand", "pour", "avec",
      "les", "des", "une", "dans", "est", "sont", "notre", "nos", "pouvez",
      "besoin", "système", "aujourd'hui", "demain", "hier", "aide", "salut"
    ]),
    // German
    de: new Set([
      "hallo", "guten", "tag", "danke", "bitte", "projekt", "status", "unternehmen",
      "bericht", "umsatz", "wie", "was", "wann", "wo", "für", "mit", "ist", "sind",
      "unsere", "können", "brauche", "system", "heute", "morgen", "hilfe"
    ]),
    // Italian
    it: new Set([
      "ciao", "grazie", "per", "favore", "progetto", "stato", "azienda", "rapporto",
      "entrate", "come", "cosa", "quando", "dove", "con", "sono", "nostro", "nostra",
      "puoi", "bisogno", "sistema", "oggi", "aiuto", "buongiorno"
    ]),
    // Portuguese
    pt: new Set([
      "olá", "ola", "obrigado", "obrigada", "por", "favor", "projeto", "status",
      "empresa", "relatório", "receita", "como", "que", "quando", "onde", "para",
      "com", "está", "nosso", "nossa", "pode", "preciso", "sistema", "hoje", "ajuda", "bom", "dia"
    ]),
    // Indonesian
    id: new Set([
      "halo", "terima", "kasih", "tolong", "proyek", "status", "perusahaan",
      "laporan", "pendapatan", "bagaimana", "apa", "kapan", "di", "mana", "untuk",
      "dengan", "kami", "kita", "bisa", "butuh", "sistem", "hari", "ini", "bantuan", "selamat", "pagi"
    ]),
    // Malay (Bahasa Melayu)
    ms: new Set([
      "salam", "sejahtera", "terima", "kasih", "tolong", "projek", "status", "syarikat",
      "laporan", "pendapatan", "bagaimana", "apa", "bila", "di", "mana", "untuk",
      "dengan", "kami", "kita", "boleh", "perlu", "sistem", "hari", "ini", "bantuan",
      "jualan", "untung", "rugi", "tuan", "puan", "saya", "buat", "meningkatkan",
      "pelanggan", "sekarang", "macam", "mana", "lagi", "baik", "bagus", "nanti",
      "kalau", "jika", "sebab", "kerana", "dengan", "untuk", "pada", "dari", "daripada",
      "sudah", "makan", "khabar", "penat", "tidur", "esok", "nak", "pergi", "pukul",
      "berapa", "sesuai", "sihat", "dah", "belum", "lapar", "minum", "kenapa", "siapa",
      "tanya", "makasih", "bawa", "cadangan", "rehat", "letih", "senang", "susah",
      "kawan", "tolonglah", "tengok", "balik", "semula", "hai", "helo", "awak",
      "lebih", "fokus", "bina", "tukar", "laman", "tajuk"
    ]),
    // Vietnamese
    vi: new Set([
      "xin", "chào", "cảm", "ơn", "làm", "dự", "án", "trạng", "thái", "công",
      "ty", "báo", "cáo", "doanh", "thu", "như", "thế", "nào", "gì", "khi",
      "đâu", "cho", "với", "của", "các", "được", "tôi", "bạn", "hôm", "nay"
    ]),
    // Dutch
    nl: new Set([
      "hallo", "dank", "alsjeblieft", "project", "status", "bedrijf", "rapport",
      "omzet", "hoe", "wat", "wanneer", "voor", "met", "het", "niet", "zijn",
      "onze", "kunt", "hulp", "vandaag", "systeem"
    ]),
    // Turkish
    tr: new Set([
      "merhaba", "teşekkürler", "lütfen", "proje", "durum", "şirket", "rapor",
      "gelir", "nasıl", "ne", "zaman", "nerede", "için", "ile", "bir", "değil",
      "yardım", "bugün", "sistem"
    ]),
    // English
    en: new Set([
      "the", "is", "are", "what", "how", "why", "check", "status", "revenue",
      "please", "help", "show", "tell", "summary", "summarize", "readiness", "project", "report", "create",
      "update", "delete", "user", "system", "can", "will", "would", "could", "should",
      "today", "yesterday", "tomorrow", "month", "year", "week", "customer", "invoice",
      "overview", "dashboard", "analytics", "total", "growth", "active", "pending",
      "hello", "thanks", "thank", "you", "good", "morning", "afternoon", "evening",
      "our", "we", "i", "my", "me", "for", "this", "in", "on", "at", "to", "of", "and", "or", "a", "an"
    ]),
  };

  // =========================================================================
  // 3. EXPLICIT USER LANGUAGE DIRECTIVE PATTERNS
  // =========================================================================
  private readonly EXPLICIT_DIRECTIVES: { regex: RegExp; code: string }[] = [
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+spanish/i, code: "es" },
    { regex: /responde\s+en\s+español/i, code: "es" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+french/i, code: "fr" },
    { regex: /réponds?\s+en\s+français/i, code: "fr" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+german/i, code: "de" },
    { regex: /antworte\s+auf\s+deutsch/i, code: "de" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+japanese/i, code: "ja" },
    { regex: /日本語で(?:話して|答えて|返信して)/, code: "ja" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+korean/i, code: "ko" },
    { regex: /한국어로\s*(?:말해|답해)/, code: "ko" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+(?:chinese|mandarin)/i, code: "zh" },
    { regex: /用(?:中文|普通话|汉语)(?:回答|跟我说|说)/, code: "zh" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+(?:malay|bahasa\s+melayu)/i, code: "ms" },
    { regex: /(?:balik\s+kepada|guna|cakap|bercakap|jawab|balas)\s+(?:dalam\s+)?bahasa\s+melayu/i, code: "ms" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+(?:indonesian|bahasa\s+indonesia)/i, code: "id" },
    { regex: /(?:bicara|jawab)\s+dalam\s+bahasa\s+indonesia/i, code: "id" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+arabic/i, code: "ar" },
    { regex: /تحدث\s+بالعربية|جاوب\s+بالعربية/, code: "ar" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+hindi/i, code: "hi" },
    { regex: /हिंदी\s+में\s*(?:बोलो|जवाब\s+दो)/, code: "hi" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+italian/i, code: "it" },
    { regex: /rispondi\s+in\s+italiano/i, code: "it" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+portuguese/i, code: "pt" },
    { regex: /responda\s+em\s+português/i, code: "pt" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+russian/i, code: "ru" },
    { regex: /отвечай\s+по-русски/i, code: "ru" },
    { regex: /(?:switch\s+back\s+to\s+english|(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+english|speak\s+english|in\s+english)/i, code: "en" },
  ];

  // =========================================================================
  // 4. PRE-REGISTERED WORLD LANGUAGE CAPABILITY REGISTRY
  // =========================================================================
  private readonly CAPABILITY_REGISTRY: Map<string, LanguageCapability> = new Map([
    ["auto", { languageCode: "auto", languageName: "Auto-Detect Language", nativeName: "✨ Auto-Detect (Global)", bcp47Tag: "auto", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["en", { languageCode: "en", languageName: "English", nativeName: "English", bcp47Tag: "en-US", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["ms", { languageCode: "ms", languageName: "Malay", nativeName: "Bahasa Melayu", bcp47Tag: "ms-MY", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["zh", { languageCode: "zh", languageName: "Mandarin Chinese", nativeName: "中文 (普通话)", bcp47Tag: "zh-CN", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["yue", { languageCode: "yue", languageName: "Cantonese", nativeName: "粵語", bcp47Tag: "zh-HK", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["es", { languageCode: "es", languageName: "Spanish", nativeName: "Español", bcp47Tag: "es-ES", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["fr", { languageCode: "fr", languageName: "French", nativeName: "Français", bcp47Tag: "fr-FR", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["de", { languageCode: "de", languageName: "German", nativeName: "Deutsch", bcp47Tag: "de-DE", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["ja", { languageCode: "ja", languageName: "Japanese", nativeName: "日本語", bcp47Tag: "ja-JP", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["ko", { languageCode: "ko", languageName: "Korean", nativeName: "한국어", bcp47Tag: "ko-KR", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["ar", { languageCode: "ar", languageName: "Arabic", nativeName: "العربية", bcp47Tag: "ar-SA", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["hi", { languageCode: "hi", languageName: "Hindi", nativeName: "हिन्दी", bcp47Tag: "hi-IN", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["id", { languageCode: "id", languageName: "Indonesian", nativeName: "Bahasa Indonesia", bcp47Tag: "id-ID", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["it", { languageCode: "it", languageName: "Italian", nativeName: "Italiano", bcp47Tag: "it-IT", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["pt", { languageCode: "pt", languageName: "Portuguese", nativeName: "Português", bcp47Tag: "pt-BR", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["ru", { languageCode: "ru", languageName: "Russian", nativeName: "Русский", bcp47Tag: "ru-RU", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["th", { languageCode: "th", languageName: "Thai", nativeName: "ไทย", bcp47Tag: "th-TH", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["vi", { languageCode: "vi", languageName: "Vietnamese", nativeName: "Tiếng Việt", bcp47Tag: "vi-VN", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["nl", { languageCode: "nl", languageName: "Dutch", nativeName: "Nederlands", bcp47Tag: "nl-NL", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["tr", { languageCode: "tr", languageName: "Turkish", nativeName: "Türkçe", bcp47Tag: "tr-TR", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
    ["pl", { languageCode: "pl", languageName: "Polish", nativeName: "Polski", bcp47Tag: "pl-PL", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["uk", { languageCode: "uk", languageName: "Ukrainian", nativeName: "Українська", bcp47Tag: "uk-UA", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["bn", { languageCode: "bn", languageName: "Bengali", nativeName: "বাংলা", bcp47Tag: "bn-BD", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["ur", { languageCode: "ur", languageName: "Urdu", nativeName: "اردو", bcp47Tag: "ur-PK", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["ta", { languageCode: "ta", languageName: "Tamil", nativeName: "தமிழ்", bcp47Tag: "ta-IN", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["te", { languageCode: "te", languageName: "Telugu", nativeName: "తెలుగు", bcp47Tag: "te-IN", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["he", { languageCode: "he", languageName: "Hebrew", nativeName: "עברית", bcp47Tag: "he-IL", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["el", { languageCode: "el", languageName: "Greek", nativeName: "Ελληνικά", bcp47Tag: "el-GR", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["sv", { languageCode: "sv", languageName: "Swedish", nativeName: "Svenska", bcp47Tag: "sv-SE", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["no", { languageCode: "no", languageName: "Norwegian", nativeName: "Norsk", bcp47Tag: "no-NO", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["da", { languageCode: "da", languageName: "Danish", nativeName: "Dansk", bcp47Tag: "da-DK", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["fi", { languageCode: "fi", languageName: "Finnish", nativeName: "Suomi", bcp47Tag: "fi-FI", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["cs", { languageCode: "cs", languageName: "Czech", nativeName: "Čeština", bcp47Tag: "cs-CZ", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["ro", { languageCode: "ro", languageName: "Romanian", nativeName: "Română", bcp47Tag: "ro-RO", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["fa", { languageCode: "fa", languageName: "Persian", nativeName: "فارسی", bcp47Tag: "fa-IR", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "standard", provider: "universal" }],
    ["mixed", { languageCode: "mixed", languageName: "Multilingual (Mixed)", nativeName: "Multilingual", bcp47Tag: "en-US", speechRecognitionSupported: true, realtimeSupported: true, textGenerationSupported: true, textToSpeechSupported: true, voiceSupported: true, qualityLevel: "native", provider: "universal" }],
  ]);

  private constructor() {}

  public static getInstance(): LanguageContextService {
    if (!LanguageContextService.instance) {
      LanguageContextService.instance = new LanguageContextService();
    }
    return LanguageContextService.instance;
  }

  public static resetInstance(): void {
    if (LanguageContextService.instance) {
      LanguageContextService.instance.listeners.clear();
      LanguageContextService.instance.currentContext = {
        detectedLanguage: "auto",
        confidence: 1.0,
        previousLanguage: "auto",
        responseLanguage: "auto",
        languageChanged: false,
        mixedLanguage: false,
        languageCode: "auto",
        languageName: "Auto Detect",
        nativeName: "Auto Detect",
        isExplicitOverride: false,
        timestamp: Date.now(),
      };
      LanguageContextService.instance = null;
    }
  }

  public getContext(): LanguageContext {
    return { ...this.currentContext };
  }

  /**
   * Universal Language Detection
   * Identifies user language from actual speech without any default English bias.
   */
  public detectLanguage(text: string): LanguageDetectionResult {
    const trimmed = text.trim();
    if (!trimmed) {
      const fallbackLang =
        this.currentContext.responseLanguage !== "auto"
          ? this.currentContext.responseLanguage
          : "unknown";
      return {
        detectedLanguage: fallbackLang,
        confidence: 0.5,
        languageCode: fallbackLang,
        languageName: LanguageContextService.getLanguageLabel(fallbackLang),
        nativeName: LanguageContextService.getNativeName(fallbackLang),
        isMixed: false,
      };
    }

    // -----------------------------------------------------------------------
    // A. Check for Explicit Language Directives (e.g. "Answer me in Spanish")
    // -----------------------------------------------------------------------
    for (const directive of this.EXPLICIT_DIRECTIVES) {
      if (directive.regex.test(trimmed)) {
        return {
          detectedLanguage: directive.code,
          confidence: 0.98,
          languageCode: directive.code,
          languageName: LanguageContextService.getLanguageLabel(directive.code),
          nativeName: LanguageContextService.getNativeName(directive.code),
          isMixed: false,
          isExplicitOverride: true,
        };
      }
    }

    // -----------------------------------------------------------------------
    // B. Script-Based Detection (High-Confidence Unicode Ranges)
    // -----------------------------------------------------------------------
    // 1. Japanese (Hiragana or Katakana present)
    if (this.SCRIPT_PATTERNS.japaneseKana.test(trimmed)) {
      return {
        detectedLanguage: "ja",
        confidence: 0.96,
        languageCode: "ja",
        languageName: "Japanese",
        nativeName: "日本語",
        isMixed: false,
      };
    }

    // 2. Korean (Hangul syllables or jamo)
    if (this.SCRIPT_PATTERNS.koreanHangul.test(trimmed)) {
      return {
        detectedLanguage: "ko",
        confidence: 0.96,
        languageCode: "ko",
        languageName: "Korean",
        nativeName: "한국어",
        isMixed: false,
      };
    }

    // 3. Arabic script
    if (this.SCRIPT_PATTERNS.arabic.test(trimmed)) {
      return {
        detectedLanguage: "ar",
        confidence: 0.95,
        languageCode: "ar",
        languageName: "Arabic",
        nativeName: "العربية",
        isMixed: false,
      };
    }

    // 4. Hindi (Devanagari)
    if (this.SCRIPT_PATTERNS.hindiDevanagari.test(trimmed)) {
      return {
        detectedLanguage: "hi",
        confidence: 0.95,
        languageCode: "hi",
        languageName: "Hindi",
        nativeName: "हिन्दी",
        isMixed: false,
      };
    }

    // 5. Bengali
    if (this.SCRIPT_PATTERNS.bengali.test(trimmed)) {
      return {
        detectedLanguage: "bn",
        confidence: 0.95,
        languageCode: "bn",
        languageName: "Bengali",
        nativeName: "বাংলা",
        isMixed: false,
      };
    }

    // 6. Tamil
    if (this.SCRIPT_PATTERNS.tamil.test(trimmed)) {
      return {
        detectedLanguage: "ta",
        confidence: 0.95,
        languageCode: "ta",
        languageName: "Tamil",
        nativeName: "தமிழ்",
        isMixed: false,
      };
    }

    // 7. Telugu
    if (this.SCRIPT_PATTERNS.telugu.test(trimmed)) {
      return {
        detectedLanguage: "te",
        confidence: 0.95,
        languageCode: "te",
        languageName: "Telugu",
        nativeName: "తెలుగు",
        isMixed: false,
      };
    }

    // 8. Thai
    if (this.SCRIPT_PATTERNS.thai.test(trimmed)) {
      return {
        detectedLanguage: "th",
        confidence: 0.95,
        languageCode: "th",
        languageName: "Thai",
        nativeName: "ไทย",
        isMixed: false,
      };
    }

    // 9. Hebrew
    if (this.SCRIPT_PATTERNS.hebrew.test(trimmed)) {
      return {
        detectedLanguage: "he",
        confidence: 0.95,
        languageCode: "he",
        languageName: "Hebrew",
        nativeName: "עברית",
        isMixed: false,
      };
    }

    // 10. Greek
    if (this.SCRIPT_PATTERNS.greek.test(trimmed)) {
      return {
        detectedLanguage: "el",
        confidence: 0.95,
        languageCode: "el",
        languageName: "Greek",
        nativeName: "Ελληνικά",
        isMixed: false,
      };
    }

    // 11. Cyrillic (Russian / Ukrainian)
    if (this.SCRIPT_PATTERNS.cyrillic.test(trimmed)) {
      const lower = trimmed.toLowerCase();
      const isUk = lower.includes("дякую") || lower.includes("привіт") || lower.includes("є") || lower.includes("і");
      const code = isUk ? "uk" : "ru";
      return {
        detectedLanguage: code,
        confidence: 0.94,
        languageCode: code,
        languageName: isUk ? "Ukrainian" : "Russian",
        nativeName: isUk ? "Українська" : "Русский",
        isMixed: false,
      };
    }

    // 12. Chinese (CJK Ideographs with NO Japanese Kana)
    const cjkChars = trimmed.match(/[\u4e00-\u9fff]/g);
    const cjkCount = cjkChars ? cjkChars.length : 0;
    const totalChars = trimmed.replace(/\s+/g, "").length;
    const cjkRatio = totalChars > 0 ? cjkCount / totalChars : 0;

    // Check words for code-mixing and lexical matching (normalize diacritics for Spanish/French accents)
    const words = trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s\u4e00-\u9fff]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    if (cjkCount > 0 && cjkRatio >= 0.3) {
      // Check if code-mixed with English or Malay words
      const hasLatin = words.some((w) => /^[a-z]+$/.test(w));
      return {
        detectedLanguage: "zh",
        confidence: Math.min(0.98, 0.7 + cjkRatio * 0.3),
        languageCode: "zh",
        languageName: "Mandarin Chinese",
        nativeName: "中文 (普通话)",
        isMixed: hasLatin,
      };
    }

    // -----------------------------------------------------------------------
    // C. Latin-Script Multilingual Lexical Analysis
    // -----------------------------------------------------------------------
    const scores: Record<string, number> = {};
    for (const [langCode, stopWords] of Object.entries(this.LEXICON_PATTERNS)) {
      let hits = 0;
      for (const word of words) {
        if (stopWords.has(word)) {
          hits++;
        }
      }
      scores[langCode] = hits;
    }

    // Code-Mixed detection (e.g. Manglish / Bahasa Rojak: balanced Malay + English)
    const msHits = scores.ms || 0;
    const enHits = scores.en || 0;
    const minMsEn = Math.min(msHits, enHits);
    if ((minMsEn >= 2 && minMsEn / (msHits + enHits) >= 0.25) || (minMsEn >= 1 && msHits + enHits >= 3 && minMsEn / (msHits + enHits) >= 0.2)) {
      return {
        detectedLanguage: "mixed",
        confidence: 0.88,
        languageCode: "mixed",
        languageName: "Multilingual (Mixed)",
        nativeName: "Multilingual",
        isMixed: true,
      };
    }

    // Find language with maximum score
    let bestLang: string | null = null;
    let maxHits = 0;

    for (const [lang, hits] of Object.entries(scores)) {
      if (hits > maxHits) {
        maxHits = hits;
        bestLang = lang;
      }
    }

    if (bestLang && maxHits > 0) {
      const conf = Math.min(0.96, 0.6 + (maxHits / (words.length || 1)) * 0.4);
      return {
        detectedLanguage: bestLang,
        confidence: conf,
        languageCode: bestLang,
        languageName: LanguageContextService.getLanguageLabel(bestLang),
        nativeName: LanguageContextService.getNativeName(bestLang),
        isMixed: false,
      };
    }

    // Small CJK fallback
    if (cjkCount > 0) {
      return {
        detectedLanguage: "zh",
        confidence: 0.75,
        languageCode: "zh",
        languageName: "Mandarin Chinese",
        nativeName: "中文 (普通话)",
        isMixed: true,
      };
    }

    // -----------------------------------------------------------------------
    // D. Confidence Hysteresis (Zero English Bias)
    // -----------------------------------------------------------------------
    // If text is short or ambiguous (e.g. "OK", "Hmm", numbers), retain the
    // PREVIOUS active conversation language instead of defaulting to English!
    const prevLang = this.currentContext.responseLanguage;
    if (prevLang && prevLang !== "auto" && prevLang !== "unknown") {
      return {
        detectedLanguage: prevLang,
        confidence: 0.5,
        languageCode: prevLang,
        languageName: LanguageContextService.getLanguageLabel(prevLang),
        nativeName: LanguageContextService.getNativeName(prevLang),
        isMixed: false,
      };
    }

    // If genuinely undetermined with no previous context, mark as unknown
    return {
      detectedLanguage: "unknown",
      confidence: 0.3,
      languageCode: "unknown",
      languageName: "Unknown",
      nativeName: "Unknown",
      isMixed: false,
    };
  }

  /**
   * Updates Language Context following user speech turn and preserves
   * single conversation continuity across language switches.
   */
  public updateContext(text: string, forceLanguage?: string): LanguageContext {
    const detection = this.detectLanguage(text);
    const previousLang = this.currentContext.responseLanguage;

    let targetResponseLanguage: SupportedLanguage;
    const isExplicitForced = Boolean(forceLanguage && forceLanguage !== "auto");

    if (isExplicitForced) {
      targetResponseLanguage = forceLanguage!;
    } else if (detection.isExplicitOverride && detection.languageCode) {
      targetResponseLanguage = detection.languageCode;
    } else if (detection.detectedLanguage === "mixed") {
      // Natural register for code-mixed speech: determine dominant vocabulary
      const words = text.toLowerCase().split(/\s+/);
      const msHits = words.filter((w) => this.LEXICON_PATTERNS.ms.has(w)).length;
      const enHits = words.filter((w) => this.LEXICON_PATTERNS.en.has(w)).length;
      targetResponseLanguage = msHits >= enHits ? "ms" : "en";
    } else if (detection.detectedLanguage === "unknown") {
      // Retain previous response language if available; otherwise initialize to auto or en
      targetResponseLanguage = previousLang !== "auto" && previousLang !== "unknown" ? previousLang : "en";
    } else {
      targetResponseLanguage = detection.detectedLanguage;
    }

    // Only flag language change if transitioning between established languages
    const languageChanged =
      previousLang !== "auto" &&
      previousLang !== "unknown" &&
      targetResponseLanguage !== previousLang;

    this.currentContext = {
      detectedLanguage: detection.detectedLanguage,
      confidence: detection.confidence,
      previousLanguage: previousLang,
      responseLanguage: targetResponseLanguage,
      languageChanged,
      mixedLanguage: detection.isMixed,
      languageCode: targetResponseLanguage,
      languageName: LanguageContextService.getLanguageLabel(targetResponseLanguage),
      nativeName: LanguageContextService.getNativeName(targetResponseLanguage),
      isExplicitOverride: isExplicitForced || Boolean(detection.isExplicitOverride),
      timestamp: Date.now(),
    };

    this.notifyListeners();
    return this.getContext();
  }

  /**
   * Explicitly locks or sets the conversational response language
   */
  public setResponseLanguage(langCode: string): LanguageContext {
    const prev = this.currentContext.responseLanguage;
    this.currentContext = {
      ...this.currentContext,
      responseLanguage: langCode,
      languageCode: langCode,
      languageName: LanguageContextService.getLanguageLabel(langCode),
      nativeName: LanguageContextService.getNativeName(langCode),
      previousLanguage: prev,
      languageChanged: prev !== langCode,
      isExplicitOverride: true,
      timestamp: Date.now(),
    };
    this.notifyListeners();
    return this.getContext();
  }

  public subscribe(listener: (context: LanguageContext) => void): () => void {
    this.listeners.add(listener);
    listener(this.getContext());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getContext());
      } catch (err) {
        console.error("[LanguageContextService] Listener error", err);
      }
    });
  }

  // =========================================================================
  // 5. PROVIDER CAPABILITY METHODS & UTILITIES
  // =========================================================================
  public getCapability(languageCode: string): LanguageCapability {
    const code = languageCode.toLowerCase().split("-")[0];
    const existing = this.CAPABILITY_REGISTRY.get(code);
    if (existing) {
      return existing;
    }

    // Dynamic fallback capability for any new ISO 639-1 code
    return {
      languageCode,
      languageName: LanguageContextService.getLanguageLabel(languageCode),
      nativeName: LanguageContextService.getNativeName(languageCode),
      bcp47Tag: LanguageContextService.getBcp47Tag(languageCode),
      speechRecognitionSupported: true,
      realtimeSupported: true,
      textGenerationSupported: true,
      textToSpeechSupported: true,
      voiceSupported: true,
      qualityLevel: "standard",
      provider: "universal",
    };
  }

  public getAllCapabilities(): LanguageCapability[] {
    return Array.from(this.CAPABILITY_REGISTRY.values());
  }

  /**
   * Resolves language code into canonical English/International label
   */
  public static getLanguageLabel(code: string): string {
    const normalized = (code || "").toLowerCase().split("-")[0];
    switch (normalized) {
      case "en":
        return "English";
      case "ms":
        return "Bahasa Melayu";
      case "zh":
        return "Mandarin (中文)";
      case "yue":
        return "Cantonese (粵語)";
      case "es":
        return "Spanish (Español)";
      case "fr":
        return "French (Français)";
      case "de":
        return "German (Deutsch)";
      case "ja":
        return "Japanese (日本語)";
      case "ko":
        return "Korean (한국어)";
      case "ar":
        return "Arabic (العربية)";
      case "hi":
        return "Hindi (हिन्दी)";
      case "id":
        return "Indonesian (Bahasa Indonesia)";
      case "it":
        return "Italian (Italiano)";
      case "pt":
        return "Portuguese (Português)";
      case "ru":
        return "Russian (Русский)";
      case "th":
        return "Thai (ไทย)";
      case "vi":
        return "Vietnamese (Tiếng Việt)";
      case "nl":
        return "Dutch (Nederlands)";
      case "tr":
        return "Turkish (Türkçe)";
      case "pl":
        return "Polish (Polski)";
      case "uk":
        return "Ukrainian (Українська)";
      case "bn":
        return "Bengali (বাংলা)";
      case "ur":
        return "Urdu (اردو)";
      case "ta":
        return "Tamil (தமிழ்)";
      case "te":
        return "Telugu (తెలుగు)";
      case "he":
        return "Hebrew (עברית)";
      case "el":
        return "Greek (Ελληνικά)";
      case "sv":
        return "Swedish (Svenska)";
      case "no":
        return "Norwegian (Norsk)";
      case "da":
        return "Danish (Dansk)";
      case "fi":
        return "Finnish (Suomi)";
      case "cs":
        return "Czech (Čeština)";
      case "ro":
        return "Romanian (Română)";
      case "fa":
        return "Persian (فارسی)";
      case "mixed":
        return "Multilingual (Mixed)";
      case "auto":
        return "Auto Detect";
      default:
        return code.toUpperCase();
    }
  }

  /**
   * Resolves language code into its native endonym
   */
  public static getNativeName(code: string): string {
    const normalized = (code || "").toLowerCase().split("-")[0];
    switch (normalized) {
      case "en":
        return "English";
      case "ms":
        return "Bahasa Melayu";
      case "zh":
        return "中文";
      case "yue":
        return "粵語";
      case "es":
        return "Español";
      case "fr":
        return "Français";
      case "de":
        return "Deutsch";
      case "ja":
        return "日本語";
      case "ko":
        return "한국어";
      case "ar":
        return "العربية";
      case "hi":
        return "हिन्दी";
      case "id":
        return "Bahasa Indonesia";
      case "it":
        return "Italiano";
      case "pt":
        return "Português";
      case "ru":
        return "Русский";
      case "th":
        return "ไทย";
      case "vi":
        return "Tiếng Việt";
      case "nl":
        return "Nederlands";
      case "tr":
        return "Türkçe";
      case "pl":
        return "Polski";
      case "uk":
        return "Українська";
      case "bn":
        return "বাংলা";
      case "ur":
        return "اردو";
      case "ta":
        return "தமிழ்";
      case "te":
        return "తెలుగు";
      case "he":
        return "עברית";
      case "el":
        return "Ελληνικά";
      case "sv":
        return "Svenska";
      case "no":
        return "Norsk";
      case "da":
        return "Dansk";
      case "fi":
        return "Suomi";
      case "cs":
        return "Čeština";
      case "ro":
        return "Română";
      case "fa":
        return "فارسی";
      case "mixed":
        return "Multilingual";
      default:
        return code;
    }
  }

  /**
   * Translates language code to exact BCP-47 tag for Speech Recognition & Synthesis
   */
  public static getBcp47Tag(code: string): string {
    if (!code || code === "auto") return "en-US";
    const lower = code.toLowerCase().trim();
    if (lower.includes("-")) return code;

    const bcpMap: Record<string, string> = {
      en: "en-US",
      ms: "ms-MY",
      zh: "zh-CN",
      yue: "zh-HK",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      ja: "ja-JP",
      ko: "ko-KR",
      ar: "ar-SA",
      hi: "hi-IN",
      id: "id-ID",
      it: "it-IT",
      pt: "pt-BR",
      ru: "ru-RU",
      th: "th-TH",
      vi: "vi-VN",
      nl: "nl-NL",
      tr: "tr-TR",
      pl: "pl-PL",
      uk: "uk-UA",
      bn: "bn-BD",
      ur: "ur-PK",
      ta: "ta-IN",
      te: "te-IN",
      he: "he-IL",
      el: "el-GR",
      sv: "sv-SE",
      no: "no-NO",
      da: "da-DK",
      fi: "fi-FI",
      cs: "cs-CZ",
      ro: "ro-RO",
      fa: "fa-IR",
      mixed: "en-US",
    };

    return bcpMap[lower] || `${lower}-${lower.toUpperCase()}`;
  }

  /**
   * Distinguishes translation requests from normal inquiries in another language.
   * e.g., "Translate this into Japanese: The quarterly meeting is at 2 PM" -> isTranslation: true, targetLanguage: "ja"
   * whereas "今日は何をすればいいですか？" -> isTranslation: false
   */
  public static isTranslationRequest(text: string): {
    isTranslation: boolean;
    targetLanguage?: string;
    targetLanguageName?: string;
    sourceText?: string;
  } {
    const trimmed = text.trim();
    if (!trimmed) return { isTranslation: false };

    // Patterns in English, Malay, Chinese, Spanish, French, German
    const patterns: { regex: RegExp; langIndex: number; textIndex: number }[] = [
      // English: "Translate this into Japanese: [text]" or "Translate to French: [text]"
      {
        regex: /(?:please\s+)?translate(?:\s+this|\s+the\s+following)?\s+(?:in|into|to)\s+([a-zA-Z]+)(?:\s*[:\-]\s*(.*))?/i,
        langIndex: 1,
        textIndex: 2,
      },
      // Malay: "Tolong terjemahkan ke Bahasa Jepun: [text]" or "Terjemahkan ke dalam Bahasa Melayu: [text]"
      {
        regex: /(?:tolong\s+)?terjemahkan(?:\s+ini)?\s+ke\s+(?:dalam\s+)?(?:bahasa\s+)?([a-zA-Z]+)(?:\s*[:\-]\s*(.*))?/i,
        langIndex: 1,
        textIndex: 2,
      },
      // Chinese: "请翻译成日语：[text]" or "把这段话翻译成中文：[text]"
      {
        regex: /(?:请\s*)?(?:把(?:这段(?:话|文字)?)?\s*)?翻译成([^\s:：]+)[：:\s]*(.*)?/i,
        langIndex: 1,
        textIndex: 2,
      },
      // Spanish: "Traduce esto al japonés: [text]" or "Por favor traduzca al español: [text]"
      {
        regex: /(?:por\s+favor\s+)?tradu(?:ce|zca)(?:\s+esto)?\s+al\s+([a-zA-Z]+)(?:\s*[:\-]\s*(.*))?/i,
        langIndex: 1,
        textIndex: 2,
      },
      // French: "Traduisez ceci en japonais: [text]" or "Traduire en français: [text]"
      {
        regex: /(?:s'il\s+vous\s+plaît\s+)?tradui(?:re|sez)(?:\s+ceci)?\s+en\s+([a-zA-Z]+)(?:\s*[:\-]\s*(.*))?/i,
        langIndex: 1,
        textIndex: 2,
      },
    ];

    for (const p of patterns) {
      const match = trimmed.match(p.regex);
      if (match) {
        const langStr = match[p.langIndex]?.toLowerCase().trim();
        const src = match[p.textIndex]?.trim();
        const code = LanguageContextService.resolveLanguageStringToCode(langStr);
        if (code) {
          return {
            isTranslation: true,
            targetLanguage: code,
            targetLanguageName: LanguageContextService.getLanguageLabel(code),
            sourceText: src || undefined,
          };
        }
      }
    }

    return { isTranslation: false };
  }

  public static resolveLanguageStringToCode(langStr: string): string | null {
    if (!langStr) return null;
    const s = langStr.toLowerCase().trim();
    if (s.includes("japan") || s.includes("jepun") || s.includes("日语") || s.includes("日本語") || s === "ja") return "ja";
    if (s.includes("malay") || s.includes("melayu") || s.includes("马来语") || s === "ms") return "ms";
    if (s.includes("chin") || s.includes("mandarin") || s.includes("cina") || s.includes("中文") || s.includes("华语") || s === "zh") return "zh";
    if (s.includes("span") || s.includes("esp") || s.includes("spanyol") || s.includes("西班牙语") || s === "es") return "es";
    if (s.includes("eng") || s.includes("inggeris") || s.includes("inggris") || s.includes("英语") || s === "en") return "en";
    if (s.includes("arab") || s.includes("阿拉伯语") || s === "ar") return "ar";
    if (s.includes("french") || s.includes("perancis") || s.includes("français") || s.includes("法语") || s === "fr") return "fr";
    if (s.includes("germ") || s.includes("jerman") || s.includes("deutsch") || s.includes("德语") || s === "de") return "de";
    if (s.includes("kore") || s.includes("韩国语") || s.includes("韩语") || s === "ko") return "ko";
    if (s.includes("hind") || s.includes("印地语") || s === "hi") return "hi";
    if (s.includes("port") || s.includes("葡萄牙语") || s === "pt") return "pt";
    if (s.includes("russ") || s.includes("俄语") || s === "ru") return "ru";
    if (s.includes("indo") || s === "id") return "id";
    if (s.includes("ital") || s.includes("意大利语") || s === "it") return "it";
    if (s.includes("thai") || s.includes("泰语") || s === "th") return "th";
    if (s.includes("viet") || s.includes("越南语") || s === "vi") return "vi";
    return null;
  }
}
