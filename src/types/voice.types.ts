/**
 * ELMO Phase 3 — Voice CEO Types
 * Defines the states, audio configurations, errors, wake-word settings, and extensible interfaces.
 */

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export type VoiceMode = "voice" | "text";

export type WakeWordStatus = "active" | "paused" | "disabled" | "unsupported";

export type VoiceErrorCode =
  | "mic_permission_denied"
  | "speech_recognition_error"
  | "tts_error"
  | "network_error"
  | "not_supported"
  | "wake_word_error"
  | "unknown";

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
  details?: string;
}

export interface VoiceConfig {
  rate: number; // 0.1 to 10, default 1.0
  pitch: number; // 0 to 2, default 1.0
  volume: number; // 0 to 1, default 1.0
  lang: string; // e.g. "en-US"
  voiceName?: string;
  autoSend: boolean; // Auto-send message when user stops speaking
}

export interface VoiceSettings {
  wakeWord: string; // Default: "Hey ELMO"
  wakeWordDetection: boolean; // On / Off
  autoListenAfterWake: boolean; // On / Off
  voiceResponse: boolean; // On / Off (read responses aloud)
  interruptElmo: boolean; // On / Off (stop speaking when user speaks)
  allowBackgroundListening: boolean; // On / Off
  conversationTimeoutSeconds: number; // Active window timeout, default 12s
}

export interface WakeWordMatch {
  detected: boolean;
  rawTranscript: string;
  cleanedPrompt: string; // Stripped of "Hey ELMO"
  isWakeOnly: boolean; // True if user only said the wake word
}

export interface VoiceSessionState {
  state: VoiceState;
  mode: VoiceMode;
  transcript: string;
  interimTranscript: string;
  error: VoiceError | null;
  isMicAvailable: boolean;
  isTTSAvailable: boolean;
  wakeWordStatus: WakeWordStatus;
  isInConversationWindow: boolean;
  conversationTimerSeconds: number;
}

/**
 * Extensible Speech-to-Text provider interface
 */
export interface STTProvider {
  isSupported(): boolean;
  start(config?: Partial<VoiceConfig>): Promise<void>;
  stop(): void;
  abort(): void;
  onTranscript(callback: (text: string, isFinal: boolean) => void): void;
  onError(callback: (error: VoiceError) => void): void;
  onEnd(callback: () => void): void;
}

/**
 * Extensible Text-to-Speech provider interface
 */
export interface TTSProvider {
  isSupported(): boolean;
  speak(text: string, config?: Partial<VoiceConfig>): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  getVoices(): SpeechSynthesisVoice[];
  onStart(callback: () => void): void;
  onEnd(callback: () => void): void;
  onError(callback: (error: VoiceError) => void): void;
}

/**
 * Extensible Wake-Word Provider interface
 * Enables plugging in on-device WASM models (Porcupine/open-source keyword spotter) in future phases
 */
export interface WakeWordProvider {
  isSupported(): boolean;
  start(wakeWord: string): Promise<void>;
  stop(): void;
  onWakeWord(callback: (match: WakeWordMatch) => void): void;
  onError(callback: (error: VoiceError) => void): void;
}
