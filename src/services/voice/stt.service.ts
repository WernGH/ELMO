/**
 * ELMO Phase 3 — Speech-to-Text (STT) Service
 * Implements SpeechToTextProvider abstraction over the Web Speech API
 * with event streaming, error normalization, and clean teardown.
 */

import { SpeechToTextProvider, VoiceError } from "./voice.types";
import { LanguageContextService } from "./language-context.service";

export class SpeechToTextService implements SpeechToTextProvider {
  private recognition: any = null;
  private isListening = false;
  private shouldBeListening = false;
  private currentLang = "en-US";
  private currentTranscript = "";
  private restartTimeout: any = null;

  private transcriptCallbacks: Set<(transcript: string, isFinal: boolean) => void> = new Set();
  private errorCallbacks: Set<(error: VoiceError) => void> = new Set();
  private endCallbacks: Set<() => void> = new Set();

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Normalizes arbitrary language strings into valid BCP-47 tags
   * to avoid Web Speech API crash on "auto" or invalid formats.
   */
  private normalizeLanguage(lang?: string): string {
    let target = lang;
    if ((!target || target === "auto" || target === "mixed") && typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem("elmo_voice_language");
        if (saved) target = saved;
      } catch {}
    }
    if (!target || target === "auto" || target === "mixed") {
      const activeContextLang = LanguageContextService.getInstance().getContext().responseLanguage;
      if (activeContextLang && activeContextLang !== "auto" && activeContextLang !== "unknown") {
        return LanguageContextService.getBcp47Tag(activeContextLang);
      }
      if (typeof window !== "undefined" && window.navigator?.language) {
        return window.navigator.language;
      }
      return "en-US";
    }
    return LanguageContextService.getBcp47Tag(target);
  }

  public getCurrentLanguage(): string {
    return this.currentLang;
  }

  /**
   * Dynamically switches speech recognition language.
   * Immediately updates the Web Speech API recognition model.
   */
  public setLanguage(lang: string): void {
    const normalized = this.normalizeLanguage(lang);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("elmo_voice_language", normalized);
      } catch {}
    }
    if (this.currentLang === normalized && this.isListening && this.recognition) {
      return;
    }
    this.currentLang = normalized;

    // If currently listening, abort ongoing session and restart on new language model immediately
    if (this.isListening && this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
      this.isListening = false;
      this.start(this.currentLang).catch(() => {});
    }
  }

  public async start(lang?: string): Promise<void> {
    if (!this.isSupported()) {
      this.notifyError({
        code: "not_supported",
        message: "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.",
      });
      return;
    }

    this.shouldBeListening = true;
    const requestedLang = this.normalizeLanguage(lang);

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    // If already listening, check if language switch is requested
    if (this.isListening && this.recognition) {
      if (lang && requestedLang !== this.currentLang) {
        this.setLanguage(requestedLang);
      }
      return;
    }

    this.currentLang = requestedLang;
    this.currentTranscript = "";
    this.isListening = true;

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();

      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = this.currentLang;
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
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

        if (final) {
          this.currentTranscript = (this.currentTranscript + " " + final).trim();
          this.notifyTranscript(this.currentTranscript, true);
        } else if (interim) {
          const combined = (this.currentTranscript + " " + interim).trim();
          this.notifyTranscript(combined, false);
        }
      };

      rec.onerror = (event: any) => {
        const err = event.error;
        if (err === "not-allowed" || err === "service-not-allowed") {
          this.shouldBeListening = false;
          this.notifyError({
            code: "mic_permission_denied",
            message: "Microphone permission was denied by browser settings.",
          });
        } else if (err === "network") {
          // Network errors in speech recognition are often transient; schedule auto-recovery
          if (this.shouldBeListening) {
            this.scheduleRestart(500);
          }
        } else if (err === "no-speech" || err === "aborted") {
          // Normal harmless silence or abort event; will cleanly restart on onend
        } else {
          this.notifyError({
            code: "speech_recognition_error",
            message: `Speech recognition error: ${err}`,
            details: event.message,
          });
        }
      };

      rec.onend = () => {
        this.isListening = false;
        this.recognition = null;
        this.notifyEnd();

        // Hands-free continuous loop: auto-restart if voice mode is active
        if (this.shouldBeListening) {
          this.scheduleRestart(150);
        }
      };

      this.recognition = rec;
      rec.start();
    } catch (err: any) {
      this.isListening = false;
      this.recognition = null;
      if (this.shouldBeListening) {
        this.scheduleRestart(1000);
      } else {
        this.notifyError({
          code: "speech_recognition_error",
          message: "Failed to start speech recognition engine.",
          details: err.message,
        });
      }
    }
  }

  private scheduleRestart(delayMs = 150): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }
    this.restartTimeout = setTimeout(() => {
      this.restartTimeout = null;
      if (this.shouldBeListening && !this.isListening) {
        this.start(this.currentLang).catch(() => {});
      }
    }, delayMs);
  }

  public stop(): void {
    this.shouldBeListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isListening = false;
  }

  public abort(): void {
    this.shouldBeListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    this.isListening = false;
    this.currentTranscript = "";
  }

  public getTranscript(): string {
    return this.currentTranscript;
  }

  public clearTranscript(): void {
    this.currentTranscript = "";
  }

  // ==========================================
  // CALLBACKS & LISTENERS
  // ==========================================

  public onTranscript(callback: (transcript: string, isFinal: boolean) => void): () => void {
    this.transcriptCallbacks.add(callback);
    return () => this.transcriptCallbacks.delete(callback);
  }

  public onError(callback: (error: VoiceError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  public onEnd(callback: () => void): () => void {
    this.endCallbacks.add(callback);
    return () => this.endCallbacks.delete(callback);
  }

  private notifyTranscript(text: string, isFinal: boolean): void {
    this.transcriptCallbacks.forEach((cb) => {
      try {
        cb(text, isFinal);
      } catch (err) {
        console.error("[STT] Error in transcript callback", err);
      }
    });
  }

  private notifyError(error: VoiceError): void {
    this.errorCallbacks.forEach((cb) => {
      try {
        cb(error);
      } catch (err) {
        console.error("[STT] Error in error callback", err);
      }
    });
  }

  private notifyEnd(): void {
    this.endCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error("[STT] Error in end callback", err);
      }
    });
  }
}
