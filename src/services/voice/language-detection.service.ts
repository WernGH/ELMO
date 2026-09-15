/**
 * ELMO Language Detection & Conversational Intent Service
 *
 * Provides authoritative, zero-bias multilingual detection and semantic intent classification
 * for both TEXT and VOICE inputs.
 */

export type ConversationalIntent =
  | "greeting"
  | "casual_conversation"
  | "small_talk"
  | "question"
  | "follow_up"
  | "clarification"
  | "information_request"
  | "business_discussion"
  | "task_request"
  | "instruction"
  | "brainstorming"
  | "planning"
  | "confirmation"
  | "emotional_conversation";

export interface DetectedLanguage {
  languageCode: string;
  languageName: string;
  nativeName: string;
  confidence: number;
  source: "voice" | "text" | "explicit";
  intent: ConversationalIntent;
  isMixed?: boolean;
  isExplicitOverride?: boolean;
}

export class LanguageDetectionService {
  private static instance: LanguageDetectionService | null = null;

  // Unicode Script Patterns
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

  // Latin-Script Lexicons with rich conversational coverage
  private readonly LEXICONS: Record<string, Set<string>> = {
    // Malay (Bahasa Melayu) & Casual Colloquial Malay
    ms: new Set([
      "sudah", "makan", "khabar", "penat", "tidur", "esok", "nak", "pergi", "pukul",
      "berapa", "sesuai", "sihat", "dah", "belum", "lapar", "minum", "kenapa", "siapa",
      "mana", "bila", "tanya", "makasih", "terima", "kasih", "salam", "sejahtera",
      "pagi", "petang", "malam", "siang", "awak", "saya", "kamu", "dia", "mereka",
      "kita", "kami", "boleh", "tolong", "buat", "macam", "apa", "lagi", "tahu",
      "ada", "tiada", "tak", "bukan", "ya", "tidak", "ialah", "adalah", "di",
      "ke", "dari", "daripada", "kepada", "pada", "untuk", "dengan", "ini", "itu",
      "sini", "sana", "situ", "bawa", "cadangan", "syarikat", "jualan", "perniagaan",
      "strategi", "untung", "rugi", "tuan", "puan", "pelanggan", "sekarang", "baik",
      "bagus", "nanti", "kalau", "jika", "sebab", "kerana", "hari", "bulan", "tahun",
      "minggu", "rehat", "letih", "senang", "susah", "kawan", "tolonglah", "tengok",
      "balik", "semula", "hai", "helo", "lebih", "fokus", "bina", "tukar", "laman", "tajuk"
    ]),
    // Indonesian (Bahasa Indonesia)
    id: new Set([
      "sudah", "makan", "kabar", "capek", "tidur", "besok", "mau", "pergi", "jam",
      "berapa", "sehat", "belum", "lapar", "minum", "kenapa", "siapa", "mana", "kapan",
      "terima", "kasih", "selamat", "pagi", "siang", "sore", "malam", "kamu", "aku",
      "dia", "mereka", "kita", "kami", "bisa", "tolong", "bikin", "gimana", "apa",
      "lagi", "tahu", "ada", "tidak", "nggak", "bukan", "ya", "di", "ke", "dari",
      "untuk", "dengan", "ini", "itu", "sini", "sana", "bawa", "perusahaan", "bisnis",
      "hari", "halo", "lelah"
    ]),
    // Spanish
    es: new Set([
      "hola", "gracias", "por", "favor", "cómo", "como", "estás", "estas", "está",
      "esta", "buenos", "días", "dias", "tardes", "noches", "qué", "que", "tal",
      "has", "comido", "cansado", "cansada", "proyecto", "estado", "empresa", "informe",
      "ingresos", "ventas", "revisar", "cuándo", "cuando", "dónde", "donde", "quién",
      "quien", "para", "con", "los", "las", "una", "uno", "del", "estoy", "ayuda",
      "puedes", "necesito", "sistema", "todos", "sobre", "nuestro", "nuestra", "ahora",
      "puedo", "conseguir", "clientes", "más", "mas", "cuál", "cual", "este", "mañana"
    ]),
    // French
    fr: new Set([
      "bonjour", "merci", "s'il", "vous", "plaît", "projet", "statut", "entreprise",
      "rapport", "revenus", "comment", "que", "quoi", "quand", "pour", "avec", "les",
      "des", "une", "dans", "est", "sont", "notre", "nos", "pouvez", "besoin",
      "système", "aujourd'hui", "demain", "hier", "aide", "salut", "fatigué", "manger"
    ]),
    // German
    de: new Set([
      "hallo", "guten", "tag", "danke", "bitte", "projekt", "status", "unternehmen",
      "bericht", "umsatz", "wie", "was", "wann", "wo", "für", "mit", "ist", "sind",
      "unsere", "können", "brauche", "system", "heute", "morgen", "hilfe", "müde", "essen"
    ]),
    // Italian
    it: new Set([
      "ciao", "grazie", "per", "favore", "progetto", "stato", "azienda", "rapporto",
      "entrate", "come", "cosa", "quando", "dove", "con", "sono", "nostro", "nostra",
      "puoi", "bisogno", "sistema", "oggi", "aiuto", "buongiorno", "stanco", "mangiato"
    ]),
    // Portuguese
    pt: new Set([
      "olá", "ola", "obrigado", "obrigada", "por", "favor", "projeto", "status",
      "empresa", "relatório", "receita", "como", "que", "quando", "onde", "para",
      "com", "está", "nosso", "nossa", "pode", "preciso", "sistema", "hoje", "ajuda",
      "bom", "dia", "cansado", "comeu"
    ]),
    // Vietnamese
    vi: new Set([
      "xin", "chào", "cảm", "ơn", "làm", "dự", "án", "trạng", "thái", "công", "ty",
      "báo", "cáo", "doanh", "thu", "như", "thế", "nào", "gì", "khi", "đâu", "cho",
      "với", "của", "các", "được", "tôi", "bạn", "hôm", "nay", "ăn", "mệt"
    ]),
    // English
    en: new Set([
      "the", "is", "are", "what", "how", "why", "check", "status", "revenue", "please",
      "help", "show", "tell", "summary", "summarize", "readiness", "project", "report",
      "create", "update", "delete", "user", "system", "can", "will", "would", "could",
      "should", "today", "yesterday", "tomorrow", "month", "year", "week", "customer",
      "invoice", "overview", "dashboard", "analytics", "total", "growth", "active",
      "pending", "hello", "thanks", "thank", "you", "good", "morning", "afternoon",
      "evening", "our", "we", "i", "my", "me", "for", "this", "in", "on", "at", "to",
      "of", "and", "or", "a", "an", "eaten", "tired", "weather", "schedule", "meeting",
      "bring", "focus", "plan", "business", "marketing", "strategy"
    ]),
  };

  // Explicit Directives
  private readonly EXPLICIT_DIRECTIVES: { regex: RegExp; code: string }[] = [
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+spanish/i, code: "es" },
    { regex: /responde\s+en\s+español/i, code: "es" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+french/i, code: "fr" },
    { regex: /réponds\s+en\s+français/i, code: "fr" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+german/i, code: "de" },
    { regex: /antworte\s+auf\s+deutsch/i, code: "de" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+japanese/i, code: "ja" },
    { regex: /日本語で(?:答えて|話して|返事して)/i, code: "ja" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+(?:chinese|mandarin)/i, code: "zh" },
    { regex: /(?:用|以|请用)(?:中文|普通话|华语)(?:回答|回复|交流|跟我说)/i, code: "zh" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+(?:malay|bahasa\s+melayu)/i, code: "ms" },
    { regex: /(?:cakap|jawab|balas|guna|balik\s+kepada)\s+(?:dalam\s+)?bahasa\s+melayu/i, code: "ms" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+(?:indonesian|bahasa\s+indonesia)/i, code: "id" },
    { regex: /(?:bicara|jawab|balas)\s+(?:dalam\s+)?bahasa\s+indonesia/i, code: "id" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+arabic/i, code: "ar" },
    { regex: /(?:تحدث|أجب|رد)\s+بالعربية/i, code: "ar" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+hindi/i, code: "hi" },
    { regex: /(?:now\s+)?(?:answer|speak|respond|talk|reply)\s+(?:(?:to\s+)?me\s+)?in\s+english/i, code: "en" },
    { regex: /(?:switch\s+to|speak|reply\s+in)\s+english/i, code: "en" },
  ];

  private constructor() {}

  public static getInstance(): LanguageDetectionService {
    if (!LanguageDetectionService.instance) {
      LanguageDetectionService.instance = new LanguageDetectionService();
    }
    return LanguageDetectionService.instance;
  }

  public static resetInstance(): void {
    LanguageDetectionService.instance = null;
  }

  /**
   * Primary detection doorway
   */
  public detect(
    text: string,
    source: "voice" | "text" = "text",
    previousLanguage = "auto"
  ): DetectedLanguage {
    const trimmed = text.trim();
    const intent = this.classifyIntent(trimmed);

    if (!trimmed) {
      const fallbackLang =
        previousLanguage !== "auto" && previousLanguage !== "unknown"
          ? previousLanguage
          : "ms"; // Regional default if completely empty
      return {
        languageCode: fallbackLang,
        languageName: this.getLanguageLabel(fallbackLang),
        nativeName: this.getNativeName(fallbackLang),
        confidence: 0.5,
        source,
        intent,
        isMixed: false,
      };
    }

    // 1. Explicit Directives
    for (const directive of this.EXPLICIT_DIRECTIVES) {
      if (directive.regex.test(trimmed)) {
        return {
          languageCode: directive.code,
          languageName: this.getLanguageLabel(directive.code),
          nativeName: this.getNativeName(directive.code),
          confidence: 0.99,
          source: "explicit",
          intent,
          isMixed: false,
          isExplicitOverride: true,
        };
      }
    }

    // 2. Unicode Scripts
    if (this.SCRIPT_PATTERNS.japaneseKana.test(trimmed)) {
      return {
        languageCode: "ja",
        languageName: "Japanese",
        nativeName: "日本語",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.koreanHangul.test(trimmed)) {
      return {
        languageCode: "ko",
        languageName: "Korean",
        nativeName: "한국어",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.arabic.test(trimmed)) {
      return {
        languageCode: "ar",
        languageName: "Arabic",
        nativeName: "العربية",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.hindiDevanagari.test(trimmed)) {
      return {
        languageCode: "hi",
        languageName: "Hindi",
        nativeName: "हिन्दी",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.bengali.test(trimmed)) {
      return {
        languageCode: "bn",
        languageName: "Bengali",
        nativeName: "বাংলা",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.tamil.test(trimmed)) {
      return {
        languageCode: "ta",
        languageName: "Tamil",
        nativeName: "தமிழ்",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.telugu.test(trimmed)) {
      return {
        languageCode: "te",
        languageName: "Telugu",
        nativeName: "తెలుగు",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.thai.test(trimmed)) {
      return {
        languageCode: "th",
        languageName: "Thai",
        nativeName: "ไทย",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.hebrew.test(trimmed)) {
      return {
        languageCode: "he",
        languageName: "Hebrew",
        nativeName: "עברית",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.greek.test(trimmed)) {
      return {
        languageCode: "el",
        languageName: "Greek",
        nativeName: "Ελληνικά",
        confidence: 0.98,
        source,
        intent,
        isMixed: false,
      };
    }

    if (this.SCRIPT_PATTERNS.cyrillic.test(trimmed)) {
      const lower = trimmed.toLowerCase();
      const isUk = lower.includes("дякую") || lower.includes("привіт") || lower.includes("є") || lower.includes("і");
      const code = isUk ? "uk" : "ru";
      return {
        languageCode: code,
        languageName: isUk ? "Ukrainian" : "Russian",
        nativeName: isUk ? "Українська" : "Русский",
        confidence: 0.96,
        source,
        intent,
        isMixed: false,
      };
    }

    // Chinese (CJK Ideographs with NO Japanese Kana)
    const cjkChars = trimmed.match(/[\u4e00-\u9fff]/g);
    const cjkCount = cjkChars ? cjkChars.length : 0;
    const totalChars = trimmed.replace(/\s+/g, "").length;
    const cjkRatio = totalChars > 0 ? cjkCount / totalChars : 0;

    const words = trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s\u4e00-\u9fff]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    if (cjkCount > 0 && cjkRatio >= 0.25) {
      const hasLatin = words.some((w) => /^[a-z]+$/.test(w));
      return {
        languageCode: "zh",
        languageName: "Mandarin Chinese",
        nativeName: "中文 (普通话)",
        confidence: Math.min(0.98, 0.75 + cjkRatio * 0.25),
        source,
        intent,
        isMixed: hasLatin,
      };
    }

    // 3. Latin Lexicon Scoring
    const scores: Record<string, number> = {};
    for (const [langCode, vocabSet] of Object.entries(this.LEXICONS)) {
      let hits = 0;
      for (const word of words) {
        if (vocabSet.has(word)) {
          hits++;
        }
      }
      scores[langCode] = hits;
    }

    // Code-Mixed detection (Manglish: Malay + English)
    const msHits = scores.ms || 0;
    const enHits = scores.en || 0;
    const minMsEn = Math.min(msHits, enHits);
    if ((minMsEn >= 2 && minMsEn / (msHits + enHits) >= 0.25) || (minMsEn >= 1 && msHits + enHits >= 3 && minMsEn / (msHits + enHits) >= 0.2)) {
      return {
        languageCode: msHits >= enHits ? "ms" : "en",
        languageName: msHits >= enHits ? "Malay (Manglish)" : "English (Manglish)",
        nativeName: "Bahasa Rojak / Manglish",
        confidence: 0.89,
        source,
        intent,
        isMixed: true,
      };
    }

    // Highest score
    let bestLang: string | null = null;
    let maxHits = 0;
    for (const [lang, hits] of Object.entries(scores)) {
      if (hits > maxHits) {
        maxHits = hits;
        bestLang = lang;
      }
    }

    if (bestLang && maxHits > 0) {
      const conf = Math.min(0.97, 0.6 + (maxHits / (words.length || 1)) * 0.4);
      return {
        languageCode: bestLang,
        languageName: this.getLanguageLabel(bestLang),
        nativeName: this.getNativeName(bestLang),
        confidence: conf,
        source,
        intent,
        isMixed: false,
      };
    }

    // Single CJK word fallback
    if (cjkCount > 0) {
      return {
        languageCode: "zh",
        languageName: "Mandarin Chinese",
        nativeName: "中文 (普通话)",
        confidence: 0.8,
        source,
        intent,
        isMixed: true,
      };
    }

    // 4. Hysteresis memory: preserve previous language for short/ambiguous phrases
    if (previousLanguage && previousLanguage !== "auto" && previousLanguage !== "unknown") {
      return {
        languageCode: previousLanguage,
        languageName: this.getLanguageLabel(previousLanguage),
        nativeName: this.getNativeName(previousLanguage),
        confidence: 0.6,
        source,
        intent,
        isMixed: false,
      };
    }

    // Genuine default
    return {
      languageCode: "ms", // Default regional anchor when undetermined
      languageName: "Malay",
      nativeName: "Bahasa Melayu",
      confidence: 0.4,
      source,
      intent,
      isMixed: false,
    };
  }

  /**
   * Conversational Intent Classification
   */
  public classifyIntent(text: string): ConversationalIntent {
    const t = text.trim().toLowerCase();

    // 1. Casual eating / check-in
    if (
      t.includes("sudah makan") ||
      t.includes("dah makan") ||
      t.includes("have you eaten") ||
      t.includes("did you eat") ||
      t.includes("吃饭了吗") ||
      t.includes("吃了吗") ||
      t.includes("has comido") ||
      t.includes("makan belum")
    ) {
      return "casual_conversation";
    }

    // 2. Greetings
    if (
      t === "hi" ||
      t === "hello" ||
      t === "helo" ||
      t === "hai" ||
      t.startsWith("hi ") ||
      t.startsWith("hello ") ||
      t.startsWith("salam") ||
      t.startsWith("selamat pagi") ||
      t.startsWith("selamat petang") ||
      t.startsWith("selamat malam") ||
      t.includes("apa khabar") ||
      t.includes("how are you") ||
      t.includes("cómo estás") ||
      t.includes("你好") ||
      t.includes("早安") ||
      t.includes("bonjour") ||
      t.includes("hallo")
    ) {
      return "greeting";
    }

    // 3. Emotional check-in / fatigue
    if (
      t.includes("penat") ||
      t.includes("letih") ||
      t.includes("tired") ||
      t.includes("exhausted") ||
      t.includes("stress") ||
      t.includes("sedih") ||
      t.includes("capek") ||
      t.includes("lelah") ||
      t.includes("累")
    ) {
      return "emotional_conversation";
    }

    // 4. Follow-up questions & time / scheduling
    if (
      t.includes("pukul berapa") ||
      t.includes("what time") ||
      t.includes("what should i bring") ||
      t.includes("bawa apa") ||
      t.includes("sesuai") ||
      t.includes("how about") ||
      t.includes("macam mana pula") ||
      t.includes("what about") ||
      t.includes("then what")
    ) {
      return "follow_up";
    }

    // 5. General / Information questions
    if (
      t.includes("weather") ||
      t.includes("cuaca") ||
      t.includes("suhu") ||
      t.includes("siapa anda") ||
      t.includes("who are you") ||
      t.includes("what is") ||
      t.includes("apa itu") ||
      t.includes("di mana") ||
      t.includes("where is")
    ) {
      return "information_request";
    }

    // 6. Business, Strategy, Planning
    if (
      t.includes("plan my business") ||
      t.includes("marketing") ||
      t.includes("strategy") ||
      t.includes("business") ||
      t.includes("pelan perniagaan") ||
      t.includes("strategi") ||
      t.includes("jualan") ||
      t.includes("revenue") ||
      t.includes("untung") ||
      t.includes("analytics") ||
      t.includes("roadmap")
    ) {
      return "planning";
    }

    // 7. General Questions
    if (t.includes("?") || t.startsWith("boleh") || t.startsWith("can you") || t.startsWith("could you")) {
      return "question";
    }

    // 8. Default small talk
    return "small_talk";
  }

  public getLanguageLabel(code: string): string {
    const labels: Record<string, string> = {
      ms: "Malay",
      en: "English",
      zh: "Mandarin Chinese",
      es: "Spanish",
      fr: "French",
      de: "German",
      ja: "Japanese",
      ko: "Korean",
      ar: "Arabic",
      id: "Indonesian",
      hi: "Hindi",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      th: "Thai",
      vi: "Vietnamese",
    };
    return labels[code] || code.toUpperCase();
  }

  public getNativeName(code: string): string {
    const natives: Record<string, string> = {
      ms: "Bahasa Melayu",
      en: "English",
      zh: "中文 (普通话)",
      es: "Español",
      fr: "Français",
      de: "Deutsch",
      ja: "日本語",
      ko: "한국어",
      ar: "العربية",
      id: "Bahasa Indonesia",
      hi: "हिन्दी",
      it: "Italiano",
      pt: "Português",
      ru: "Русский",
      th: "ไทย",
      vi: "Tiếng Việt",
    };
    return natives[code] || code.toUpperCase();
  }
}
