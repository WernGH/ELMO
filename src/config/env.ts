/**
 * ELMO Centralized Environment Configuration Service
 * Provides typed, validated access to environment variables, distinguishing
 * server-only secrets from client-safe public configuration.
 */

export interface ClientEnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
  voiceEnabled: boolean;
  voiceRealtimeEnabled: boolean;
  voiceRealtimeProvider: string;
  voiceLanguageMode: "auto" | "manual";
  voiceLanguage: string;
  voiceAutoListen: boolean;
  voiceAutoSpeak: boolean;
  voiceInterruptEnabled: boolean;
  vadThreshold: number;
  vadSilenceDurationMs: number;
  vadMinSpeechDurationMs: number;
  vadMaxSpeechDurationMs: number;
  reconnectMaxRetries: number;
  reconnectBackoffMs: number;
}

export interface ServerEnvConfig {
  geminiApiKey: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  voiceRealtimeProvider: string;
  voiceLanguageMode: string;
  voiceSttProvider: string;
  voiceTtsProvider: string;
  voiceVadProvider: string;
  voiceSttApiKey: string | undefined;
  voiceSttApiUrl: string | undefined;
  voiceTtsApiKey: string | undefined;
  voiceTtsApiUrl: string | undefined;
  voiceTtsVoiceId: string | undefined;
  voiceTtsModel: string | undefined;
  voiceSessionTimeoutMs: number;
  voiceMaxSpeechDurationMs: number;
  voiceMaxResponseDurationMs: number;
}

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  features: {
    supabaseConfigured: boolean;
    geminiConfigured: boolean;
    voiceEnabled: boolean;
    realtimeVoiceEnabled: boolean;
    customSttConfigured: boolean;
    customTtsConfigured: boolean;
  };
}

/**
 * Returns safe client-side environment configuration.
 * Accessible from both browser and Node environments.
 */
export function getClientEnv(): ClientEnvConfig {
  const isBrowser = typeof window !== "undefined";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Voice Enabled: defaults to true unless explicitly disabled
  const rawVoiceEnabled = isBrowser
    ? process.env.NEXT_PUBLIC_VOICE_ENABLED
    : process.env.NEXT_PUBLIC_VOICE_ENABLED ?? process.env.VOICE_ENABLED;
  const voiceEnabled = rawVoiceEnabled !== "false";

  const rawRealtimeEnabled = isBrowser
    ? process.env.NEXT_PUBLIC_VOICE_REALTIME_ENABLED
    : process.env.NEXT_PUBLIC_VOICE_REALTIME_ENABLED ?? process.env.VOICE_REALTIME_ENABLED;
  const voiceRealtimeEnabled = rawRealtimeEnabled !== "false";

  const voiceRealtimeProvider = process.env.VOICE_REALTIME_PROVIDER || "gemini-live";
  const voiceLanguageMode = (process.env.VOICE_LANGUAGE_MODE === "manual" ? "manual" : "auto") as "auto" | "manual";
  const voiceLanguage = process.env.VOICE_LANGUAGE || (voiceLanguageMode === "auto" ? "auto" : "en-US");

  // VAD thresholds with sensible browser defaults
  const vadThreshold = parseFloat(process.env.VOICE_VAD_THRESHOLD || "0.015");
  const vadSilenceDurationMs = parseInt(
    process.env.VOICE_VAD_SILENCE_DURATION_MS || process.env.VOICE_SILENCE_TIMEOUT_MS || "1200",
    10
  );
  const vadMinSpeechDurationMs = parseInt(
    process.env.VOICE_VAD_MIN_SPEECH_DURATION_MS || "250",
    10
  );
  const vadMaxSpeechDurationMs = parseInt(
    process.env.VOICE_VAD_MAX_SPEECH_DURATION_MS || process.env.VOICE_MAX_SPEECH_DURATION_MS || "60000",
    10
  );

  const reconnectMaxRetries = parseInt(process.env.VOICE_RECONNECT_MAX_RETRIES || "3", 10);
  const reconnectBackoffMs = parseInt(process.env.VOICE_RECONNECT_BACKOFF_MS || "1000", 10);

  return {
    supabaseUrl,
    supabaseAnonKey,
    appUrl,
    voiceEnabled,
    voiceRealtimeEnabled,
    voiceRealtimeProvider,
    voiceLanguageMode,
    voiceLanguage,
    voiceAutoListen: process.env.VOICE_AUTO_LISTEN !== "false",
    voiceAutoSpeak: process.env.VOICE_AUTO_SPEAK !== "false",
    voiceInterruptEnabled: process.env.VOICE_INTERRUPT_ENABLED !== "false",
    vadThreshold: isNaN(vadThreshold) ? 0.015 : vadThreshold,
    vadSilenceDurationMs: isNaN(vadSilenceDurationMs) ? 1200 : vadSilenceDurationMs,
    vadMinSpeechDurationMs: isNaN(vadMinSpeechDurationMs) ? 250 : vadMinSpeechDurationMs,
    vadMaxSpeechDurationMs: isNaN(vadMaxSpeechDurationMs) ? 60000 : vadMaxSpeechDurationMs,
    reconnectMaxRetries: isNaN(reconnectMaxRetries) ? 3 : reconnectMaxRetries,
    reconnectBackoffMs: isNaN(reconnectBackoffMs) ? 1000 : reconnectBackoffMs,
  };
}

/**
 * Returns server-only environment variables and secrets.
 * Throws an error if invoked on the client-side to prevent credential leakage.
 */
export function getServerEnv(): ServerEnvConfig {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Security Violation] Attempted to access server-only environment secrets from client-side browser runtime."
    );
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    geminiApiKey,
    supabaseServiceRoleKey,
    voiceRealtimeProvider: process.env.VOICE_REALTIME_PROVIDER || "gemini-live",
    voiceLanguageMode: process.env.VOICE_LANGUAGE_MODE || "auto",
    voiceSttProvider: process.env.VOICE_STT_PROVIDER || "browser",
    voiceTtsProvider: process.env.VOICE_TTS_PROVIDER || "browser",
    voiceVadProvider: process.env.VOICE_VAD_PROVIDER || "browser",
    voiceSttApiKey: process.env.VOICE_STT_API_KEY,
    voiceSttApiUrl: process.env.VOICE_STT_API_URL,
    voiceTtsApiKey: process.env.VOICE_TTS_API_KEY,
    voiceTtsApiUrl: process.env.VOICE_TTS_API_URL,
    voiceTtsVoiceId: process.env.VOICE_TTS_VOICE_ID,
    voiceTtsModel: process.env.VOICE_TTS_MODEL,
    voiceSessionTimeoutMs: parseInt(process.env.VOICE_SESSION_TIMEOUT_MS || "300000", 10),
    voiceMaxSpeechDurationMs: parseInt(process.env.VOICE_MAX_SPEECH_DURATION_MS || "60000", 10),
    voiceMaxResponseDurationMs: parseInt(process.env.VOICE_MAX_RESPONSE_DURATION_MS || "120000", 10),
  };
}

/**
 * Validates the runtime environment without crashing the application.
 * Reports missing required variables, warnings, and feature readiness.
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isBrowser = typeof window !== "undefined";
  const clientEnv = getClientEnv();

  // 1. Supabase Validation
  const hasRealSupabase = Boolean(
    clientEnv.supabaseUrl &&
    !clientEnv.supabaseUrl.includes("placeholder") &&
    clientEnv.supabaseAnonKey &&
    !clientEnv.supabaseAnonKey.includes("placeholder")
  );

  if (!hasRealSupabase) {
    warnings.push("Supabase URL or Anon Key is unconfigured or using placeholder values. Local mock storage will be active.");
  }

  // 2. Gemini Validation (Server-side check)
  let geminiConfigured = false;
  let customSttConfigured = false;
  let customTtsConfigured = false;

  if (!isBrowser) {
    const serverEnv = getServerEnv();
    geminiConfigured = Boolean(serverEnv.geminiApiKey && !serverEnv.geminiApiKey.includes("placeholder"));

    if (!geminiConfigured) {
      warnings.push("GEMINI_API_KEY is not configured. ELMO will fall back to local rule-based intelligence responses.");
    }

    customSttConfigured = Boolean(serverEnv.voiceSttApiKey || serverEnv.voiceSttApiUrl);
    customTtsConfigured = Boolean(serverEnv.voiceTtsApiKey || serverEnv.voiceTtsApiUrl);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    features: {
      supabaseConfigured: hasRealSupabase,
      geminiConfigured,
      voiceEnabled: clientEnv.voiceEnabled,
      realtimeVoiceEnabled: clientEnv.voiceRealtimeEnabled,
      customSttConfigured,
      customTtsConfigured,
    },
  };
}

/**
 * Export default environment instance for convenience
 */
export const env = {
  client: getClientEnv,
  server: getServerEnv,
  validate: validateEnv,
};
