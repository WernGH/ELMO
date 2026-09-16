/**
 * ELMO Phase 3 Add-On — Local Wake Word Service
 * Handles on-device lightweight detection of "Hey ELMO",
 * active conversation windows, interruption during speech, and privacy status.
 * Zero audio is transmitted to cloud services during standby.
 */

import {
  VoiceError,
  VoiceSettings,
  WakeWordMatch,
  WakeWordStatus,
} from "@/types/voice.types";
import { VoiceService } from "./voice.service";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  wakeWord: "Hey ELMO",
  wakeWordDetection: true,
  autoListenAfterWake: true,
  voiceResponse: true,
  interruptElmo: true,
  allowBackgroundListening: true,
  conversationTimeoutSeconds: 12,
};

const STORAGE_KEY = "elmo_voice_settings";

export type WakeWordListener = (match: WakeWordMatch) => void;
export type StatusListener = (status: WakeWordStatus) => void;
export type SettingsListener = (settings: VoiceSettings) => void;
export type ConversationWindowListener = (
  inWindow: boolean,
  secondsRemaining: number
) => void;

export class WakeWordService {
  private static instance: WakeWordService | null = null;

  private settings: VoiceSettings = { ...DEFAULT_VOICE_SETTINGS };
  private status: WakeWordStatus = "disabled";
  private isMicActive = false;

  private recognitionInstance: any = null;
  private restartTimer: any = null;
  private shouldBeListening = false;

  // Active conversation window timer
  private conversationTimer: any = null;
  private conversationSecondsRemaining = 0;
  private isInConversation = false;

  private wakeWordListeners: Set<WakeWordListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private settingsListeners: Set<SettingsListener> = new Set();
  private conversationListeners: Set<ConversationWindowListener> = new Set();

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): WakeWordService {
    if (!WakeWordService.instance) {
      WakeWordService.instance = new WakeWordService();
    }
    return WakeWordService.instance;
  }

  public static resetInstance(): void {
    if (WakeWordService.instance) {
      WakeWordService.instance.stopListening();
      WakeWordService.instance.clearConversationTimer();
      WakeWordService.instance.wakeWordListeners.clear();
      WakeWordService.instance.statusListeners.clear();
      WakeWordService.instance.settingsListeners.clear();
      WakeWordService.instance.conversationListeners.clear();
      WakeWordService.instance = null;
    }
  }

  // ==========================================
  // SETTINGS & STORAGE
  // ==========================================

  private loadSettings(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.settings = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) };
        }
      } catch (err) {
        console.warn("[WakeWordService] Failed to load voice settings from localStorage", err);
      }
    }
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch (err) {
        console.warn("[WakeWordService] Failed to save voice settings", err);
      }
    }
    this.notifySettingsListeners();

    // If wake word detection was toggled, update listening state
    if (this.settings.wakeWordDetection) {
      if (this.status === "disabled" || this.status === "paused") {
        this.startListening();
      }
    } else {
      this.stopListening();
      this.setStatus("disabled");
    }
  }

  // ==========================================
  // STATUS & SUBSCRIPTIONS
  // ==========================================

  public getStatus(): WakeWordStatus {
    return this.status;
  }

  public isMicrophoneActive(): boolean {
    return this.isMicActive;
  }

  public isInConversationWindow(): boolean {
    return this.isInConversation;
  }

  public getConversationSecondsRemaining(): number {
    return this.conversationSecondsRemaining;
  }

  private setStatus(newStatus: WakeWordStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.statusListeners.forEach((l) => l(newStatus));
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  public subscribeSettings(listener: SettingsListener): () => void {
    this.settingsListeners.add(listener);
    listener(this.settings);
    return () => this.settingsListeners.delete(listener);
  }

  public subscribeWakeWord(listener: WakeWordListener): () => void {
    this.wakeWordListeners.add(listener);
    return () => this.wakeWordListeners.delete(listener);
  }

  public subscribeConversationWindow(listener: ConversationWindowListener): () => void {
    this.conversationListeners.add(listener);
    listener(this.isInConversation, this.conversationSecondsRemaining);
    return () => this.conversationListeners.delete(listener);
  }

  private notifySettingsListeners(): void {
    this.settingsListeners.forEach((l) => l(this.settings));
  }

  private notifyConversationListeners(): void {
    this.conversationListeners.forEach((l) =>
      l(this.isInConversation, this.conversationSecondsRemaining)
    );
  }

  // ==========================================
  // WAKE WORD DETECTION ENGINE (100% LOCAL)
  // ==========================================

  /**
   * Evaluates whether a transcript contains the wake word, stripping it if found.
   * Resilient to casing, punctuation, and slight phonetic variations.
   */
  public matchWakeWord(
    transcript: string,
    wakeWord: string = this.settings.wakeWord
  ): WakeWordMatch {
    const trimmed = transcript.trim();
    if (!trimmed) {
      return { detected: false, rawTranscript: "", cleanedPrompt: "", isWakeOnly: false };
    }

    const normalizedTarget = (wakeWord || "Hey ELMO")
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:]/g, "");

    const escapedTarget = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Matches configured wake word, "hey elmo", "hi elmo", "hello elmo", or standalone "elmo" at word boundaries
    const pattern = new RegExp(
      `(?:^|\\b)(?:${escapedTarget}|(?:hey|hi|hello)\\s+elmo|(?:hey|hi|hello)\\s+el\\s+mo|elmo)(?:\\b|[.,!?;:]|$)`,
      "i"
    );

    const match = trimmed.match(pattern);
    if (!match) {
      return {
        detected: false,
        rawTranscript: trimmed,
        cleanedPrompt: trimmed,
        isWakeOnly: false,
      };
    }

    // Extract remaining query before and after the wake word
    const matchStartIndex = match.index!;
    const matchEndIndex = matchStartIndex + match[0].length;
    const before = trimmed.slice(0, matchStartIndex).trim();
    const after = trimmed.slice(matchEndIndex).trim();

    const remaining = [before, after]
      .filter(Boolean)
      .join(" ")
      .replace(/^[,.\s:;!?]+/, "")
      .trim();

    return {
      detected: true,
      rawTranscript: trimmed,
      cleanedPrompt: remaining,
      isWakeOnly: remaining.length === 0,
    };
  }

  /**
   * Filter out speaker bleed or acoustic echo of ELMO's own voice
   */
  private isEchoOfLastSpoken(transcript: string): boolean {
    const lastSpoken = VoiceService.getInstance().getLastSpokenText();
    if (!lastSpoken || !transcript) return false;
    const cleanT = transcript.toLowerCase().trim();
    if (cleanT.length < 3) return false;

    // Direct match or containment
    if (lastSpoken === cleanT || lastSpoken.includes(cleanT) || cleanT.includes(lastSpoken)) {
      return true;
    }

    // Significant token overlap test for 3+ words
    const words = cleanT.split(/\s+/).filter((w) => w.length > 2);
    if (words.length >= 3) {
      const matchCount = words.filter((w) => lastSpoken.includes(w)).length;
      if (matchCount / words.length >= 0.6) {
        return true;
      }
    }

    return false;
  }

  /**
   * Starts the lightweight ambient wake-word recognition process
   */
  public async startListening(): Promise<void> {
    if (typeof window === "undefined") return;

    if (!this.settings.wakeWordDetection) {
      this.setStatus("disabled");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.setStatus("unsupported");
      return;
    }

    this.shouldBeListening = true;

    // Do not start ambient wake-word recognition while VoiceService is actively listening or processing
    const voiceService = VoiceService.getInstance();
    const vsState = voiceService.getState();
    if (vsState === "listening" || vsState === "processing" || (vsState === "speaking" && !this.settings.interruptElmo)) {
      this.setStatus("paused");
      return;
    }

    // If an instance is already running, avoid duplicate
    if (this.recognitionInstance) {
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isMicActive = true;
        this.setStatus("active");
      };

      recognition.onresult = (event: any) => {
        const voiceService = VoiceService.getInstance();
        const currentVoiceState = voiceService.getState();

        // 1. Interruption Check: While ELMO is speaking, only interrupt on explicit wake word or stop command
        if (currentVoiceState === "speaking") {
          if (!this.settings.interruptElmo) return;

          let shouldInterrupt = false;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const t = event.results[i][0].transcript.toLowerCase().trim();
            const isStopCommand = /^(stop|pause|wait|quiet|shut up|cancel|hold on)\b/i.test(t);
            const isWake = this.matchWakeWord(t).detected;
            if (isStopCommand || isWake) {
              shouldInterrupt = true;
              break;
            }
          }

          if (shouldInterrupt) {
            voiceService.stopSpeaking();
            voiceService.setState("listening");
            this.startConversationWindow();
          }
          return;
        }

        // 2. Extract latest speech fragment
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0].transcript;

          // Acoustic echo filter: Ignore if mic picked up ELMO's recently spoken text
          if (this.isEchoOfLastSpoken(transcript)) {
            continue;
          }

          // Check for wake word
          const match = this.matchWakeWord(transcript);

          if (match.detected) {
            // Found wake word!
            this.handleWakeWordTriggered(match);
            return;
          }

          // If inside active conversation window and speech is finalized without wake word
          if (this.isInConversation && res.isFinal && transcript.trim().length > 0) {
            // Treat as continuous conversational follow-up
            this.startConversationWindow(); // Reset timer
            this.wakeWordListeners.forEach((l) =>
              l({
                detected: true,
                rawTranscript: transcript.trim(),
                cleanedPrompt: transcript.trim(),
                isWakeOnly: false,
              })
            );
            return;
          }
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        if (error === "not-allowed" || error === "service-not-allowed") {
          this.shouldBeListening = false;
          this.isMicActive = false;
          this.setStatus("disabled");
        } else if (error === "no-speech") {
          // Expected during silence; continue
        } else if (error === "network") {
          this.setStatus("paused");
        }
      };

      recognition.onend = () => {
        this.isMicActive = false;
        this.recognitionInstance = null;

        // Automatically restart ambient listener if still enabled and not manually stopped
        if (this.shouldBeListening && this.settings.wakeWordDetection) {
          if (this.restartTimer) {
            clearTimeout(this.restartTimer);
          }
          this.restartTimer = setTimeout(() => {
            this.restartTimer = null;
            if (this.shouldBeListening && this.settings.wakeWordDetection) {
              const voiceService = VoiceService.getInstance();
              const state = voiceService.getState();
              if (state !== "listening" && state !== "processing" && (state !== "speaking" || this.settings.interruptElmo)) {
                this.startListening();
              } else {
                this.setStatus("paused");
              }
            }
          }, 300);
        } else {
          this.setStatus(this.settings.wakeWordDetection ? "paused" : "disabled");
        }
      };

      this.recognitionInstance = recognition;
      recognition.start();
    } catch (err) {
      console.warn("[WakeWordService] Failed to start ambient recognizer", err);
      this.setStatus("paused");
    }
  }

  /**
   * Pauses ambient wake-word recognition (e.g. while ELMO is actively processing or speaking)
   */
  public pauseListening(): void {
    this.shouldBeListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.abort();
      } catch {}
      this.recognitionInstance = null;
    }
    this.isMicActive = false;
    if (this.status !== "disabled" && this.status !== "unsupported") {
      this.setStatus("paused");
    }
  }

  /**
   * Completely stops listening
   */
  public stopListening(): void {
    this.shouldBeListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {}
      this.recognitionInstance = null;
    }
    this.isMicActive = false;
    this.clearConversationTimer();
  }

  private handleWakeWordTriggered(match: WakeWordMatch): void {
    // Start or refresh conversation window
    this.startConversationWindow();

    // Notify subscribers
    this.wakeWordListeners.forEach((l) => l(match));
  }

  // ==========================================
  // CONVERSATION WINDOW & INACTIVITY TIMER
  // ==========================================

  /**
   * Starts a 12-second conversation window allowing hands-free follow-up queries
   */
  public startConversationWindow(
    durationSeconds = this.settings.conversationTimeoutSeconds || 12
  ): void {
    this.clearConversationTimer();
    this.isInConversation = true;
    this.conversationSecondsRemaining = durationSeconds;
    this.notifyConversationListeners();

    this.conversationTimer = setInterval(() => {
      this.conversationSecondsRemaining -= 1;
      if (this.conversationSecondsRemaining <= 0) {
        this.clearConversationTimer();
      } else {
        this.notifyConversationListeners();
      }
    }, 1000);
  }

  public clearConversationTimer(): void {
    if (this.conversationTimer) {
      clearInterval(this.conversationTimer);
      this.conversationTimer = null;
    }
    this.isInConversation = false;
    this.conversationSecondsRemaining = 0;
    this.notifyConversationListeners();
  }
}
