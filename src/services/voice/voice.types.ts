/**
 * ELMO Phase 3 — Voice Architecture Types
 * Provider abstractions and canonical voice states for continuous conversational AI.
 */

// Canonical Phase 3 Voice States
export type VoiceState =
  | "STANDBY"
  | "LISTENING"
  | "USER_SPEAKING"
  | "PROCESSING"
  | "ELMO_SPEAKING"
  | "INTERRUPTED"
  | "RECONNECTING"
  | "EXECUTING"
  | "ERROR";

// Connection Status
export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected"
  | "error";

// Multilingual Conversation Types (Global Open-Ended Support)
export type WellKnownLanguage =
  | "en"
  | "ms"
  | "zh"
  | "es"
  | "fr"
  | "ja"
  | "ko"
  | "ar"
  | "hi"
  | "id"
  | "de"
  | "it"
  | "pt"
  | "ru"
  | "th"
  | "vi"
  | "tr"
  | "nl"
  | "pl"
  | "uk"
  | "mixed"
  | "unknown";

export type SupportedLanguage = WellKnownLanguage | (string & {});

/**
 * Provider Language Capability Abstraction
 */
export interface LanguageCapability {
  languageCode: string; // ISO 639-1 or BCP-47 (e.g. "es", "ja", "ms", "zh")
  languageName: string; // Canonical English/International name
  nativeName: string;   // Endonym (e.g. "Español", "日本語", "Bahasa Melayu")
  bcp47Tag: string;     // e.g. "es-ES", "ja-JP", "ar-SA"
  speechRecognitionSupported: boolean;
  realtimeSupported: boolean;
  textGenerationSupported: boolean;
  textToSpeechSupported: boolean;
  voiceSupported: boolean;
  qualityLevel: "native" | "standard" | "experimental";
  provider: string;
  fallbackProvider?: string;
}

export interface LanguageDetectionResult {
  detectedLanguage: SupportedLanguage;
  confidence: number;
  languageCode?: string;
  languageName?: string;
  nativeName?: string;
  bilingualSegments?: {
    language: SupportedLanguage;
    text: string;
  }[];
  isMixed: boolean;
  isExplicitOverride?: boolean;
}

export interface LanguageContext {
  detectedLanguage: SupportedLanguage;
  confidence: number;
  previousLanguage: SupportedLanguage;
  responseLanguage: SupportedLanguage;
  languageChanged: boolean;
  mixedLanguage: boolean;
  languageCode?: string;
  languageName?: string;
  nativeName?: string;
  isExplicitOverride?: boolean;
  timestamp?: number;
}

// Microphone Permission States
export type MicPermissionState =
  | "unrequested"
  | "prompting"
  | "granted"
  | "denied"
  | "unavailable";

// Voice Activity Detection (VAD) States & Events
export type VADState =
  | "NO_SPEECH"
  | "USER_STARTS_SPEAKING"
  | "USER_SPEAKING"
  | "USER_STOPS_SPEAKING"
  | "END_OF_UTTERANCE";

export interface VADConfig {
  speechThreshold: number; // RMS energy threshold (e.g. 0.015 - 0.05)
  silenceDurationMs: number; // Milliseconds of silence to qualify end of utterance (e.g. 1000 - 1500)
  minSpeechDurationMs: number; // Minimum ms of speech to avoid spurious noise triggers (e.g. 250 - 400)
  maxUtteranceDurationMs: number; // Max ms of speech before forcing utterance completion (e.g. 15000)
}

export const DEFAULT_VAD_CONFIG: VADConfig = {
  speechThreshold: 0.008,
  silenceDurationMs: 1200,
  minSpeechDurationMs: 250,
  maxUtteranceDurationMs: 25000,
};

export type VoiceErrorCode =
  | "mic_permission_denied"
  | "mic_unavailable"
  | "speech_recognition_error"
  | "tts_error"
  | "network_error"
  | "not_supported"
  | "inactivity_timeout"
  | "vad_error"
  | "gemini_error"
  | "unknown";

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
  details?: string;
  recoverable?: boolean;
}

export interface VoiceConfig {
  rate: number;
  pitch: number;
  volume: number;
  lang: string;
  voiceName?: string;
  inactivityTimeoutMs: number; // Standby transition after silence (300,000ms = 5 min)
  vadConfig: VADConfig;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  lang: "en-US",
  inactivityTimeoutMs: 300000,
  vadConfig: DEFAULT_VAD_CONFIG,
};

/**
 * Speech-to-Text Provider Abstraction
 */
export interface SpeechToTextProvider {
  isSupported(): boolean;
  start(lang?: string): Promise<void>;
  stop(): void;
  abort(): void;
  setLanguage?(lang: string): void;
  getCurrentLanguage?(): string;
  onTranscript(callback: (transcript: string, isFinal: boolean) => void): () => void;
  onError(callback: (error: VoiceError) => void): () => void;
  onEnd(callback: () => void): () => void;
}

/**
 * Text-to-Speech Provider Abstraction
 */
export interface TextToSpeechProvider {
  isSupported(): boolean;
  speak(text: string, config?: Partial<VoiceConfig>): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  isSpeaking(): boolean;
  getVoices(): SpeechSynthesisVoice[];
  onStart(callback: () => void): () => void;
  onEnd(callback: () => void): () => void;
  onError(callback: (error: VoiceError) => void): () => void;
}

/**
 * Voice Activity Provider Abstraction
 */
export interface VoiceActivityProvider {
  start(): Promise<void>;
  stop(): void;
  onVADStateChange(callback: (vadState: VADState, audioLevel: number) => void): () => void;
  onSpeechStart(callback: () => void): () => void;
  onSpeechEnd(callback: () => void): () => void;
  getCurrentAudioLevel(): number;
  updateConfig(config: Partial<VADConfig>): void;
  getConfig(): VADConfig;
}

/**
 * Voice Control Panel Settings
 */
export interface VoiceControlSettings {
  microphoneStatus: "ACTIVE" | "MUTED" | "STANDBY";
  voiceName: string;
  language: string;
  interruptionEnabled: boolean;
  voiceMode: "OFF" | "ON" | "PAUSED";
}

export const DEFAULT_VOICE_CONTROLS: VoiceControlSettings = {
  microphoneStatus: "STANDBY",
  voiceName: "ELMO Natural",
  language: "English",
  interruptionEnabled: true,
  voiceMode: "OFF",
};

/**
 * Realtime Voice Streaming Data Chunk
 */
export interface RealtimeVoiceChunk {
  data: ArrayBuffer | Uint8Array | Float32Array;
  timestamp: number;
  mimeType?: string;
}

export interface RealtimeVoiceTranscriptEvent {
  transcript: string;
  isFinal: boolean;
  language?: SupportedLanguage;
}

/**
 * Realtime Bidirectional Voice Provider Interface
 */
export interface RealtimeVoiceProvider {
  connect(sessionConfig?: { sessionId?: string; language?: string; organizationId?: string }): Promise<void>;
  disconnect(): Promise<void>;
  sendAudioChunk(chunk: RealtimeVoiceChunk): Promise<void>;
  onAudioStream(callback: (chunk: RealtimeVoiceChunk) => void): () => void;
  onTranscript(callback: (event: RealtimeVoiceTranscriptEvent) => void): () => void;
  onError(callback: (error: VoiceError) => void): () => void;
  onStateChange(callback: (state: VoiceState) => void): () => void;
  interrupt(): Promise<void>;
  isConnected(): boolean;
}

/**
 * Voice Session Persistent Data Structure (No raw audio stored)
 */
export interface VoiceSessionData {
  id: string;
  organizationId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  detectedLanguage: string;
  userTurnsCount: number;
  assistantTurnsCount: number;
  interruptionCount: number;
  status: "active" | "completed" | "interrupted" | "failed";
  metadata?: Record<string, unknown>;
}


