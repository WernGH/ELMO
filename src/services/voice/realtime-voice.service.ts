/**
 * ELMO Phase 3 — Realtime Voice Service
 * Main orchestrator for real-time bidirectional streaming, multilingual intelligence,
 * zero-latency barge-in interruption, and audio lifecycle management.
 */

import { AudioManager } from "./audio-manager";
import { VoiceStateManager } from "./voice-state-manager";
import { LanguageContextService } from "./language-context.service";
import { VoiceSessionManager } from "./voice-session-manager";
import {
  RealtimeVoiceChunk,
  RealtimeVoiceProvider,
  RealtimeVoiceTranscriptEvent,
  VoiceError,
  VoiceState,
} from "./voice.types";
import { createRealtimeVoiceProvider, RealtimeVoiceProviderType } from "./providers/realtime-voice.provider";

export interface RealtimeVoiceServiceConfig {
  providerType?: RealtimeVoiceProviderType;
  organizationId?: string;
  userId?: string;
  language?: string;
  onTranscript?: (event: RealtimeVoiceTranscriptEvent) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: VoiceError) => void;
}

export class RealtimeVoiceService {
  private static instance: RealtimeVoiceService | null = null;

  private audioManager: AudioManager;
  private stateManager: VoiceStateManager;
  private languageContextService: LanguageContextService;
  private sessionManager: VoiceSessionManager;
  private provider: RealtimeVoiceProvider;

  private isRunning = false;
  private config: RealtimeVoiceServiceConfig;
  private unsubscribers: (() => void)[] = [];

  private constructor(config?: RealtimeVoiceServiceConfig) {
    this.config = config || {};
    this.audioManager = AudioManager.getInstance();
    this.stateManager = VoiceStateManager.getInstance();
    this.languageContextService = LanguageContextService.getInstance();
    this.sessionManager = VoiceSessionManager.getInstance({
      onTimeout: () => this.handleTimeout(),
    });

    const providerType = this.config.providerType || "gemini-live";
    this.provider = createRealtimeVoiceProvider(providerType);
  }

  public static getInstance(config?: RealtimeVoiceServiceConfig): RealtimeVoiceService {
    if (!RealtimeVoiceService.instance) {
      RealtimeVoiceService.instance = new RealtimeVoiceService(config);
    }
    return RealtimeVoiceService.instance;
  }

  public static resetInstance(): void {
    if (RealtimeVoiceService.instance) {
      RealtimeVoiceService.instance.stop();
      RealtimeVoiceService.instance = null;
    }
  }

  public getState(): VoiceState {
    return this.stateManager.getState();
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Starts the continuous hands-free realtime voice loop
   */
  public async start(configOverrides?: Partial<RealtimeVoiceServiceConfig>): Promise<boolean> {
    if (this.isRunning) return true;

    if (configOverrides) {
      this.config = { ...this.config, ...configOverrides };
    }

    try {
      // 1. Initialize microphone pipeline
      const micReady = await this.audioManager.startAudioPipeline();
      if (!micReady) {
        this.stateManager.transition("ERROR", {
          code: "mic_unavailable",
          message: "Failed to initialize microphone hardware.",
        });
        return false;
      }

      // 2. Start Voice Session
      const session = this.sessionManager.startSession(
        this.config.organizationId || "org_default",
        this.config.userId || "user_default",
        this.config.language || "auto"
      );

      // 3. Connect Realtime Provider
      await this.provider.connect({
        sessionId: session.id,
        organizationId: session.organizationId,
        language: session.detectedLanguage,
      });

      // 4. Wire provider and audio events
      this.bindListeners();

      this.isRunning = true;
      this.stateManager.transition("LISTENING");
      return true;
    } catch (err: any) {
      console.error("[RealtimeVoiceService] Start failed:", err);
      this.stateManager.transition("ERROR", {
        code: "network_error",
        message: "Failed to establish realtime voice connection.",
        details: err?.message,
      });
      return false;
    }
  }

  /**
   * Stops the voice loop and closes active sessions
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Teardown listeners
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribers = [];

    // Interrupt any pending playback
    this.audioManager.cancelPlayback();
    this.audioManager.stopAudioPipeline();

    // Disconnect provider
    await this.provider.disconnect();

    // Close session
    await this.sessionManager.endSession("completed");

    this.stateManager.transition("STANDBY");
  }

  /**
   * Instant Barge-In Interruption:
   * Immediately halts speech synthesis and streaming audio output,
   * flushes buffers, and transitions to USER_SPEAKING.
   */
  public async interrupt(): Promise<void> {
    const currentState = this.stateManager.getState();
    if (currentState === "ELMO_SPEAKING" || currentState === "PROCESSING") {
      this.sessionManager.recordInterruption();

      // Instantly cancel playback
      this.audioManager.cancelPlayback();

      // Tell provider to abort in-flight output
      await this.provider.interrupt();

      this.stateManager.transition("USER_SPEAKING");
    }
  }

  /**
   * Sends audio data to active provider
   */
  public async sendAudio(chunk: RealtimeVoiceChunk): Promise<void> {
    if (!this.isRunning) return;

    // If user speaks while ELMO is speaking, trigger barge-in interrupt immediately
    if (this.stateManager.getState() === "ELMO_SPEAKING") {
      await this.interrupt();
    }

    await this.provider.sendAudioChunk(chunk);
  }

  private bindListeners(): void {
    // 1. Audio stream from assistant -> play via AudioManager
    const unsubAudio = this.provider.onAudioStream(async (chunk) => {
      if (this.stateManager.getState() !== "ELMO_SPEAKING") {
        this.stateManager.transition("ELMO_SPEAKING");
      }
      this.sessionManager.recordAssistantTurn();
      await this.audioManager.enqueueAudioChunk(chunk.data);
    });

    // 2. Playback state changes from AudioManager
    const unsubPlayback = this.audioManager.subscribePlayback((isPlaying) => {
      if (!isPlaying && this.stateManager.getState() === "ELMO_SPEAKING") {
        this.stateManager.transition("LISTENING");
      }
    });

    // 3. Transcript events from provider
    const unsubTranscript = this.provider.onTranscript((event) => {
      this.sessionManager.recordUserTurn();

      // Update language context dynamically
      const langCtx = this.languageContextService.updateContext(event.transcript);
      this.sessionManager.updateLanguage(langCtx.responseLanguage);

      if (this.config.onTranscript) {
        this.config.onTranscript(event);
      }

      if (event.isFinal) {
        this.stateManager.transition("PROCESSING");
      } else {
        this.stateManager.transition("USER_SPEAKING");
      }
    });

    // 4. Provider state changes
    const unsubState = this.provider.onStateChange((state) => {
      this.stateManager.transition(state);
      if (this.config.onStateChange) {
        this.config.onStateChange(state);
      }
    });

    // 5. Provider errors
    const unsubError = this.provider.onError((error) => {
      this.stateManager.transition("ERROR", error);
      if (this.config.onError) {
        this.config.onError(error);
      }
    });

    this.unsubscribers.push(unsubAudio, unsubPlayback, unsubTranscript, unsubState, unsubError);
  }

  private handleTimeout(): void {
    this.stop();
  }
}
