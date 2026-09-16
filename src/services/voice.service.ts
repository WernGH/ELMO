/**
 * ELMO Phase 3 — Voice CEO Service
 * Unified speech-to-text (STT) and text-to-speech (TTS) engine.
 * Manages audio lifecycle, hardware permissions, sentence-queued speech synthesis,
 * and state transitions (idle, listening, processing, speaking, error).
 */

import {
  VoiceConfig,
  VoiceError,
  VoiceState,
  VoiceErrorCode,
} from "@/types/voice.types";
import { getClientEnv } from "@/config/env";
import { LanguageContextService } from "@/services/voice/language-context.service";

export type StateListener = (state: VoiceState) => void;
export type TranscriptListener = (text: string, isFinal: boolean) => void;
export type ErrorListener = (error: VoiceError) => void;

export class VoiceService {
  private static instance: VoiceService | null = null;

  private state: VoiceState = "idle";
  private currentTranscript = "";
  private recognitionInstance: any = null;
  private activeUtteranceQueue: SpeechSynthesisUtterance[] = [];
  private isSynthesizing = false;

  private config: VoiceConfig = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lang: "en-US",
    autoSend: true,
  };

  private stateListeners: Set<StateListener> = new Set();
  private transcriptListeners: Set<TranscriptListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();

  private constructor() {
    try {
      const client = getClientEnv();
      if (client?.voiceLanguage) {
        this.config.lang = client.voiceLanguage;
      } else if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("elmo_voice_language");
        if (saved) this.config.lang = saved;
      }
    } catch {
      // Graceful fallback for non-configured or minimal environments
    }
  }

  public setLanguage(lang: string): void {
    const bcp47 = LanguageContextService.getBcp47Tag(lang);
    this.config.lang = bcp47;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("elmo_voice_language", bcp47);
      } catch {}
    }
    if (this.state === "listening" && this.recognitionInstance) {
      try {
        this.recognitionInstance.abort();
      } catch {}
      this.recognitionInstance = null;
      this.startListening();
    }
  }

  public getLanguage(): string {
    return this.config.lang;
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  /**
   * Reset instance (useful for unit testing)
   */
  public static resetInstance(): void {
    if (VoiceService.instance) {
      VoiceService.instance.stopSpeaking();
      VoiceService.instance.abortListening();
      VoiceService.instance.stateListeners.clear();
      VoiceService.instance.transcriptListeners.clear();
      VoiceService.instance.errorListeners.clear();
      VoiceService.instance = null;
    }
  }

  // ==========================================
  // CAPABILITY DETECTION
  // ==========================================

  public isSTTSupported(): boolean {
    if (typeof window === "undefined") return false;
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  public isTTSSupported(): boolean {
    if (typeof window === "undefined") return false;
    return "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  }

  // ==========================================
  // STATE & SUBSCRIPTIONS
  // ==========================================

  public getState(): VoiceState {
    return this.state;
  }

  public setState(newState: VoiceState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.notifyStateListeners(newState);
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeTranscript(listener: TranscriptListener): () => void {
    this.transcriptListeners.add(listener);
    return () => this.transcriptListeners.delete(listener);
  }

  public subscribeError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private notifyStateListeners(state: VoiceState): void {
    this.stateListeners.forEach((l) => {
      try {
        l(state);
      } catch (err) {
        console.error("[VoiceService] Error in state listener", err);
      }
    });
  }

  private notifyTranscriptListeners(text: string, isFinal: boolean): void {
    this.transcriptListeners.forEach((l) => {
      try {
        l(text, isFinal);
      } catch (err) {
        console.error("[VoiceService] Error in transcript listener", err);
      }
    });
  }

  private notifyError(code: VoiceErrorCode, message: string, details?: string): void {
    const error: VoiceError = { code, message, details };
    this.setState("error");
    this.errorListeners.forEach((l) => {
      try {
        l(error);
      } catch (err) {
        console.error("[VoiceService] Error in error listener", err);
      }
    });
  }

  public updateConfig(newConfig: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): VoiceConfig {
    return { ...this.config };
  }

  // ==========================================
  // SPEECH-TO-TEXT (MICROPHONE CAPTURE)
  // ==========================================

  /**
   * Request microphone permission explicitly via mediaDevices if available
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return true; // Fallback to SpeechRecognition's native prompt
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop stream tracks immediately so mic isn't held open unnecessarily
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        this.notifyError(
          "mic_permission_denied",
          "Microphone access was denied. Please allow microphone permissions in your browser to speak with ELMO."
        );
      } else {
        this.notifyError(
          "speech_recognition_error",
          "Failed to access audio hardware.",
          err.message
        );
      }
      return false;
    }
  }

  /**
   * Start listening for voice input
   */
  public async startListening(): Promise<void> {
    if (!this.isSTTSupported()) {
      this.notifyError(
        "not_supported",
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    // Stop speaking if currently speaking
    if (this.state === "speaking") {
      this.stopSpeaking();
    }

    // Verify mic access first
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) return;

    // Abort existing active instance if any to release browser microphone
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.abort();
      } catch {}
      this.recognitionInstance = null;
    }

    this.currentTranscript = "";
    this.setState("listening");

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false; // Turn-based listening
      recognition.interimResults = true;
      recognition.lang = this.config.lang || "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.setState("listening");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }

        const totalTranscript = (this.currentTranscript + " " + (final || interim)).trim();
        if (final) {
          this.currentTranscript = (this.currentTranscript + " " + final).trim();
          this.notifyTranscriptListeners(this.currentTranscript, true);
        } else {
          this.notifyTranscriptListeners(totalTranscript, false);
        }
      };

      recognition.onerror = (event: any) => {
        const errorType = event.error;
        if (errorType === "not-allowed" || errorType === "service-not-allowed") {
          this.notifyError(
            "mic_permission_denied",
            "Microphone permission was denied by the browser."
          );
        } else if (errorType === "no-speech" || errorType === "aborted") {
          // User stayed silent or recognition was stopped/preempted; cleanly reset to idle without alert
          this.setState("idle");
        } else if (errorType === "network") {
          this.notifyError(
            "network_error",
            "Speech recognition network error. Please check your connection."
          );
        } else {
          this.notifyError(
            "speech_recognition_error",
            `Speech recognition encountered an issue (${errorType}).`
          );
        }
      };

      recognition.onend = () => {
        this.recognitionInstance = null;
        if (this.state === "listening") {
          // If we had final transcript captured, transition to processing, else idle
          if (this.currentTranscript.trim().length > 0) {
            this.setState("processing");
          } else {
            this.setState("idle");
          }
        }
      };

      this.recognitionInstance = recognition;
      recognition.start();
    } catch (err: any) {
      this.notifyError(
        "speech_recognition_error",
        "Failed to initialize speech recognition engine.",
        err.message
      );
    }
  }

  /**
   * Stop listening gracefully
   */
  public stopListening(): void {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {
        // Ignore if already stopped
      }
    }
  }

  /**
   * Abort listening immediately
   */
  public abortListening(): void {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.abort();
      } catch {
        // Ignore
      }
      this.recognitionInstance = null;
    }
    if (this.state === "listening") {
      this.setState("idle");
    }
  }

  // ==========================================
  // TEXT-TO-SPEECH (SPEECH SYNTHESIS)
  // ==========================================

  /**
   * Strip markdown syntax so the voice synthesis reads clean natural speech
   */
  public cleanMarkdownForSpeech(text: string): string {
    return text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, " [Code block omitted] ")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove markdown headings (#, ##, ###)
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italics
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove bullet points and numbered lists
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Remove blockquotes
      .replace(/^\s*>\s+/gm, "")
      // Collapse multiple whitespace/newlines
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Split clean text into natural sentences to avoid the browser 15s freeze bug
   */
  private splitIntoSentences(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
    if (!sentences || sentences.length === 0) {
      return text.trim() ? [text.trim()] : [];
    }
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  /**
   * Get best available executive English voice
   */
  public getPreferredVoice(): SpeechSynthesisVoice | null {
    if (!this.isTTSSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Preference hierarchy for professional/executive voices
    const preferredNames = [
      "Google US English",
      "Samantha",
      "Daniel",
      "Microsoft David",
      "Microsoft Mark",
      "Natural",
    ];

    for (const name of preferredNames) {
      const match = voices.find(
        (v) => v.name.includes(name) && v.lang.startsWith("en")
      );
      if (match) return match;
    }

    // Default to any English voice
    return voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
  }

  /**
   * Speak response aloud with sentence queue
   */
  public async speak(rawText: string, options?: Partial<VoiceConfig>): Promise<void> {
    if (!this.isTTSSupported()) {
      this.notifyError(
        "tts_error",
        "Text-to-speech is not supported in this browser."
      );
      return;
    }

    // Cancel any ongoing speech first
    this.stopSpeaking();

    const cleanText = this.cleanMarkdownForSpeech(rawText);
    if (!cleanText) {
      this.setState("idle");
      return;
    }

    const sentences = this.splitIntoSentences(cleanText);
    if (sentences.length === 0) {
      this.setState("idle");
      return;
    }

    const effectiveConfig = { ...this.config, ...options };
    const preferredVoice = this.getPreferredVoice();

    this.setState("speaking");
    this.isSynthesizing = true;

    // Create sentence utterances
    this.activeUtteranceQueue = sentences.map((sentence, index) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = effectiveConfig.rate;
      utterance.pitch = effectiveConfig.pitch;
      utterance.volume = effectiveConfig.volume;
      utterance.lang = effectiveConfig.lang;
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      const isLastSentence = index === sentences.length - 1;

      utterance.onend = () => {
        if (isLastSentence && this.isSynthesizing) {
          this.isSynthesizing = false;
          this.activeUtteranceQueue = [];
          this.setState("idle");
        }
      };

      utterance.onerror = (e: any) => {
        // "interrupted" or "canceled" are expected when user stops speaking
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.warn("[VoiceService] Speech synthesis error:", e.error);
          this.notifyError("tts_error", `Speech playback error: ${e.error}`);
        }
        if (isLastSentence) {
          this.isSynthesizing = false;
          this.activeUtteranceQueue = [];
          this.setState("idle");
        }
      };

      return utterance;
    });

    // Enqueue all sentences to speechSynthesis
    for (const utterance of this.activeUtteranceQueue) {
      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Stop speaking immediately (user clicks Stop Speaking)
   */
  public stopSpeaking(): void {
    this.isSynthesizing = false;
    this.activeUtteranceQueue = [];

    if (this.isTTSSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }

    if (this.state === "speaking") {
      this.setState("idle");
    }
  }

  /**
   * Pause speaking
   */
  public pauseSpeaking(): void {
    if (this.isTTSSupported() && this.state === "speaking") {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Resume speaking
   */
  public resumeSpeaking(): void {
    if (this.isTTSSupported()) {
      window.speechSynthesis.resume();
    }
  }
}
