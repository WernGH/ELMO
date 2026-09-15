/**
 * ELMO Phase 2 — Language Context Service
 * Shared root export uniting Text Intelligence (Phase 2) and Voice Intelligence (Phase 3).
 */

export { LanguageContextService } from "./voice/language-context.service";
export type {
  LanguageCapability,
  LanguageContext,
  LanguageDetectionResult,
  SupportedLanguage,
  WellKnownLanguage,
} from "./voice/voice.types";
