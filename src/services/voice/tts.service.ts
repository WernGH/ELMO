/**
 * ELMO Phase 3 — Text-to-Speech (TTS) Service
 * Implements TextToSpeechProvider abstraction over the SpeechSynthesis API.
 * Features:
 * - Markdown cleansing for natural verbalization
 * - Sentence-level utterance chunking to defeat the browser 15s synthesis stall bug
 * - Instant cancellation on user barge-in (interruption)
 * - Autoplay restriction handling
 */

import { TextToSpeechProvider, VoiceConfig, VoiceError } from "./voice.types";

export class TextToSpeechService implements TextToSpeechProvider {
  private utteranceQueue: SpeechSynthesisUtterance[] = [];
  private activeSpeaking = false;
  private currentUtteranceIndex = 0;

  private startCallbacks: Set<() => void> = new Set();
  private endCallbacks: Set<() => void> = new Set();
  private errorCallbacks: Set<(error: VoiceError) => void> = new Set();

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  }

  public isSpeaking(): boolean {
    return this.activeSpeaking;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return window.speechSynthesis.getVoices() || [];
  }

  public getPreferredVoice(preferredLang?: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices.length) return null;

    if (!preferredLang || preferredLang === "auto") {
      return voices[0];
    }

    const lowerTag = preferredLang.toLowerCase().trim();
    const prefix = lowerTag.split("-")[0];

    // 1. Exact BCP-47 match (e.g. "es-ES", "ja-JP", "ms-MY", "zh-CN", "fr-FR")
    const exactMatch = voices.find((v) => v.lang.toLowerCase() === lowerTag);
    if (exactMatch) return exactMatch;

    // 2. Language prefix match (e.g. "es", "ja", "ms", "fr", "de", "ar", "hi")
    const matchingVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
    if (matchingVoices.length > 0) {
      // Prefer high-quality/natural voices for that target language
      const qualityMatch = matchingVoices.find(
        (v) =>
          v.name.includes("Natural") ||
          v.name.includes("Neural") ||
          v.name.includes("Premium") ||
          v.name.includes("Enhanced") ||
          v.name.includes("Google")
      );
      return qualityMatch || matchingVoices[0];
    }

    return voices[0];
  }

  /**
   * Cleans raw markdown so speech synthesis vocalizes naturally
   */
  public cleanMarkdownForSpeech(text: string): string {
    return text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, " Code block omitted. ")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove markdown headings (#, ##, ###)
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italics
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove lists and bullets
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Remove blockquotes
      .replace(/^\s*>\s+/gm, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Split clean text into natural sentences
   */
  public splitIntoSentences(text: string): string[] {
    const matched = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
    if (!matched || matched.length === 0) {
      return text.trim() ? [text.trim()] : [];
    }
    return matched.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  /**
   * Speak text automatically
   */
  public async speak(rawText: string, config?: Partial<VoiceConfig>): Promise<void> {
    if (!this.isSupported()) {
      this.notifyError({
        code: "not_supported",
        message: "Text-to-speech is not supported in this browser.",
      });
      return;
    }

    // Cancel any ongoing speech immediately before queuing new utterance
    this.stop();

    const cleanText = this.cleanMarkdownForSpeech(rawText);
    if (!cleanText) {
      this.notifyEnd();
      return;
    }

    const sentences = this.splitIntoSentences(cleanText);
    if (sentences.length === 0) {
      this.notifyEnd();
      return;
    }

    this.activeSpeaking = true;
    this.currentUtteranceIndex = 0;
    const preferredVoice = this.getPreferredVoice();

    this.utteranceQueue = sentences.map((sentence, idx) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = config?.rate ?? 1.0;
      utterance.pitch = config?.pitch ?? 1.0;
      utterance.volume = config?.volume ?? 1.0;
      utterance.lang = config?.lang ?? "en-US";
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      const isFirst = idx === 0;
      const isLast = idx === sentences.length - 1;

      utterance.onstart = () => {
        if (isFirst) {
          this.notifyStart();
        }
      };

      utterance.onend = () => {
        if (isLast && this.activeSpeaking) {
          this.activeSpeaking = false;
          this.utteranceQueue = [];
          this.notifyEnd();
        }
      };

      utterance.onerror = (e: any) => {
        // "interrupted" or "canceled" are standard during user barge-in
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.warn("[TTS] Speech synthesis error:", e.error);
          this.notifyError({
            code: "tts_error",
            message: `Speech playback error: ${e.error}`,
          });
        }
        if (isLast && this.activeSpeaking) {
          this.activeSpeaking = false;
          this.utteranceQueue = [];
          this.notifyEnd();
        }
      };

      return utterance;
    });

    try {
      for (const utt of this.utteranceQueue) {
        window.speechSynthesis.speak(utt);
      }
    } catch (err: any) {
      this.activeSpeaking = false;
      this.notifyError({
        code: "tts_error",
        message: "Failed to initiate speech playback.",
        details: err.message,
      });
      this.notifyEnd();
    }
  }

  /**
   * Immediate stop (crucial for barge-in interruption)
   */
  public stop(): void {
    this.activeSpeaking = false;
    this.utteranceQueue = [];

    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.notifyEnd();
  }

  public pause(): void {
    if (this.isSupported() && this.activeSpeaking) {
      try {
        window.speechSynthesis.pause();
      } catch {}
    }
  }

  public resume(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
  }

  // ==========================================
  // CALLBACKS
  // ==========================================

  public onStart(callback: () => void): () => void {
    this.startCallbacks.add(callback);
    return () => this.startCallbacks.delete(callback);
  }

  public onEnd(callback: () => void): () => void {
    this.endCallbacks.add(callback);
    return () => this.endCallbacks.delete(callback);
  }

  public onError(callback: (error: VoiceError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  private notifyStart(): void {
    this.startCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error("[TTS] Error in start callback", err);
      }
    });
  }

  private notifyEnd(): void {
    this.endCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error("[TTS] Error in end callback", err);
      }
    });
  }

  private notifyError(error: VoiceError): void {
    this.errorCallbacks.forEach((cb) => {
      try {
        cb(error);
      } catch (err) {
        console.error("[TTS] Error in error callback", err);
      }
    });
  }
}
