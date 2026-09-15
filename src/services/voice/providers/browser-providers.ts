/**
 * ELMO Phase 3 — Browser Fallback Realtime Voice Provider
 * Emulates the RealtimeVoiceProvider interface using Web Speech API (STT/TTS)
 * for environments without direct Gemini Live WebSocket connectivity.
 */

import { SpeechToTextService } from "../stt.service";
import { TextToSpeechService } from "../tts.service";
import {
  RealtimeVoiceChunk,
  RealtimeVoiceProvider,
  RealtimeVoiceTranscriptEvent,
  VoiceError,
  VoiceState,
} from "../voice.types";
import { LanguageContextService } from "../language-context.service";

export class BrowserRealtimeVoiceProvider implements RealtimeVoiceProvider {
  private sttService: SpeechToTextService;
  private ttsService: TextToSpeechService;
  private languageContextService: LanguageContextService;

  private connected = false;
  private sessionId: string | null = null;
  private organizationId: string | null = null;
  private language = "en-US";

  private audioStreamListeners: Set<(chunk: RealtimeVoiceChunk) => void> = new Set();
  private transcriptListeners: Set<(event: RealtimeVoiceTranscriptEvent) => void> = new Set();
  private errorListeners: Set<(error: VoiceError) => void> = new Set();
  private stateChangeListeners: Set<(state: VoiceState) => void> = new Set();

  private unsubscribers: (() => void)[] = [];

  constructor(
    sttService?: SpeechToTextService,
    ttsService?: TextToSpeechService,
    languageContextService?: LanguageContextService
  ) {
    this.sttService = sttService || new SpeechToTextService();
    this.ttsService = ttsService || new TextToSpeechService();
    this.languageContextService = languageContextService || LanguageContextService.getInstance();
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async connect(sessionConfig?: {
    sessionId?: string;
    language?: string;
    organizationId?: string;
  }): Promise<void> {
    if (this.connected) return;

    this.sessionId = sessionConfig?.sessionId || `vses_browser_${Date.now()}`;
    this.organizationId = sessionConfig?.organizationId || null;
    this.language = sessionConfig?.language || "auto";

    // Bind STT listeners
    const unsubTranscript = this.sttService.onTranscript((text, isFinal) => {
      const detected = this.languageContextService.updateContext(text);
      this.notifyTranscript({
        transcript: text,
        isFinal,
        language: detected.responseLanguage,
      });

      if (!isFinal) {
        this.notifyStateChange("USER_SPEAKING");
      }
    });

    const unsubError = this.sttService.onError((error) => {
      this.notifyError(error);
      this.notifyStateChange("ERROR");
    });

    this.unsubscribers.push(unsubTranscript, unsubError);
    this.connected = true;
    this.notifyStateChange("LISTENING");
  }

  public async disconnect(): Promise<void> {
    this.sttService.stop();
    this.ttsService.stop();

    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribers = [];

    this.connected = false;
    this.sessionId = null;
    this.notifyStateChange("STANDBY");
  }

  public async sendAudioChunk(_chunk: RealtimeVoiceChunk): Promise<void> {
    // Browser STT captures directly from microphone hardware
  }

  public async interrupt(): Promise<void> {
    this.ttsService.stop();
    this.sttService.abort();
    this.notifyStateChange("INTERRUPTED");
  }

  // ==========================================
  // EVENT SUBSCRIPTIONS
  // ==========================================

  public onAudioStream(callback: (chunk: RealtimeVoiceChunk) => void): () => void {
    this.audioStreamListeners.add(callback);
    return () => this.audioStreamListeners.delete(callback);
  }

  public onTranscript(callback: (event: RealtimeVoiceTranscriptEvent) => void): () => void {
    this.transcriptListeners.add(callback);
    return () => this.transcriptListeners.delete(callback);
  }

  public onError(callback: (error: VoiceError) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  public onStateChange(callback: (state: VoiceState) => void): () => void {
    this.stateChangeListeners.add(callback);
    return () => this.stateChangeListeners.delete(callback);
  }

  private notifyTranscript(event: RealtimeVoiceTranscriptEvent): void {
    this.transcriptListeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error("[BrowserVoiceProvider] Transcript error", err);
      }
    });
  }

  private notifyError(error: VoiceError): void {
    this.errorListeners.forEach((cb) => {
      try {
        cb(error);
      } catch (err) {
        console.error("[BrowserVoiceProvider] Error listener error", err);
      }
    });
  }

  private notifyStateChange(state: VoiceState): void {
    this.stateChangeListeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("[BrowserVoiceProvider] State change error", err);
      }
    });
  }
}
