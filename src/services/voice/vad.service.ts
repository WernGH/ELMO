/**
 * ELMO Phase 3 — Voice Activity Detector (VAD)
 * Implements natural speech detection:
 * NO_SPEECH -> USER_STARTS_SPEAKING -> USER_SPEAKING -> USER_STOPS_SPEAKING -> END_OF_UTTERANCE
 *
 * Configured with:
 * - Speech threshold (RMS energy level)
 * - Silence duration (pause length before utterance completion)
 * - Minimum speech duration (rejects clicks, pops, and ambient transients)
 * - Maximum utterance duration (safety ceiling)
 */

import { AudioManager } from "./audio-manager";
import {
  DEFAULT_VAD_CONFIG,
  VADConfig,
  VADState,
  VoiceActivityProvider,
} from "./voice.types";
import { getClientEnv } from "@/config/env";

export type VADStateListener = (state: VADState, audioLevel: number) => void;

export class VoiceActivityDetector implements VoiceActivityProvider {
  private config: VADConfig;
  private audioManager: AudioManager;

  private vadState: VADState = "NO_SPEECH";
  private currentAudioLevel = 0;
  private isActive = false;

  private speechStartTime = 0;
  private utteranceStartTime = 0;
  private silenceStartTime = 0;

  private stateListeners: Set<VADStateListener> = new Set();
  private speechStartListeners: Set<() => void> = new Set();
  private speechEndListeners: Set<() => void> = new Set();
  private audioLevelUnsubscribe: (() => void) | null = null;

  constructor(config?: Partial<VADConfig>, audioManager?: AudioManager) {
    let envConfig: Partial<VADConfig> = {};
    try {
      const client = getClientEnv();
      if (client) {
        envConfig = {
          speechThreshold: client.vadThreshold,
          silenceDurationMs: client.vadSilenceDurationMs,
          minSpeechDurationMs: client.vadMinSpeechDurationMs,
          maxUtteranceDurationMs: client.vadMaxSpeechDurationMs,
        };
      }
    } catch {
      // Safe fallback
    }
    this.config = { ...DEFAULT_VAD_CONFIG, ...envConfig, ...config };
    this.audioManager = audioManager || AudioManager.getInstance();
  }

  public getConfig(): VADConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<VADConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getVADState(): VADState {
    return this.vadState;
  }

  public getCurrentAudioLevel(): number {
    return this.currentAudioLevel;
  }

  // ==========================================
  // LIFECYCLE
  // ==========================================

  public async start(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;
    this.vadState = "NO_SPEECH";
    this.currentAudioLevel = 0;

    // Connect to real-time audio levels from AudioManager
    this.audioLevelUnsubscribe = this.audioManager.subscribeAudioLevel((level) => {
      this.processSample(level, Date.now());
    });
  }

  public stop(): void {
    this.isActive = false;
    if (this.audioLevelUnsubscribe) {
      this.audioLevelUnsubscribe();
      this.audioLevelUnsubscribe = null;
    }
    this.setVADState("NO_SPEECH", 0);
  }

  // ==========================================
  // CORE VAD LOGIC
  // ==========================================

  /**
   * Process an audio frame level (RMS 0.0 to 1.0)
   * Can be called directly by unit tests or continuously by the audio pipeline.
   */
  public processSample(level: number, timestamp: number = Date.now()): void {
    this.currentAudioLevel = level;
    const isAboveThreshold = level >= this.config.speechThreshold;

    switch (this.vadState) {
      case "NO_SPEECH": {
        if (isAboveThreshold) {
          this.speechStartTime = timestamp;
          this.utteranceStartTime = timestamp;
          this.setVADState("USER_STARTS_SPEAKING", level);
        }
        break;
      }

      case "USER_STARTS_SPEAKING": {
        if (isAboveThreshold) {
          // Check if speech has persisted long enough to disqualify transient click/pop
          if (timestamp - this.speechStartTime >= this.config.minSpeechDurationMs) {
            this.setVADState("USER_SPEAKING", level);
            this.notifySpeechStart();
          }
        } else {
          // Sound dropped before reaching min speech duration: reset as spurious noise
          this.setVADState("NO_SPEECH", level);
        }
        break;
      }

      case "USER_SPEAKING": {
        // Enforce maximum utterance duration safety cutoff
        if (timestamp - this.utteranceStartTime >= this.config.maxUtteranceDurationMs) {
          this.setVADState("END_OF_UTTERANCE", level);
          this.notifySpeechEnd();
          this.setVADState("NO_SPEECH", 0);
          return;
        }

        if (!isAboveThreshold) {
          // User paused speaking
          this.silenceStartTime = timestamp;
          this.setVADState("USER_STOPS_SPEAKING", level);
        }
        break;
      }

      case "USER_STOPS_SPEAKING": {
        if (isAboveThreshold) {
          // User resumed speaking within pause window (natural sentence pause)
          this.setVADState("USER_SPEAKING", level);
        } else {
          // Silence continues: check if it reached silence threshold
          if (timestamp - this.silenceStartTime >= this.config.silenceDurationMs) {
            this.setVADState("END_OF_UTTERANCE", level);
            this.notifySpeechEnd();
            this.setVADState("NO_SPEECH", 0);
          }
        }
        break;
      }

      case "END_OF_UTTERANCE": {
        this.setVADState("NO_SPEECH", level);
        break;
      }
    }
  }

  // ==========================================
  // SUBSCRIPTIONS & EVENT NOTIFICATIONS
  // ==========================================

  public onVADStateChange(callback: VADStateListener): () => void {
    this.stateListeners.add(callback);
    callback(this.vadState, this.currentAudioLevel);
    return () => this.stateListeners.delete(callback);
  }

  public onSpeechStart(callback: () => void): () => void {
    this.speechStartListeners.add(callback);
    return () => this.speechStartListeners.delete(callback);
  }

  public onSpeechEnd(callback: () => void): () => void {
    this.speechEndListeners.add(callback);
    return () => this.speechEndListeners.delete(callback);
  }

  private setVADState(newState: VADState, level: number): void {
    this.vadState = newState;
    this.stateListeners.forEach((listener) => {
      try {
        listener(newState, level);
      } catch (err) {
        console.error("[VAD] Error in VAD state listener", err);
      }
    });
  }

  private notifySpeechStart(): void {
    this.speechStartListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("[VAD] Error in speechStart listener", err);
      }
    });
  }

  private notifySpeechEnd(): void {
    this.speechEndListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("[VAD] Error in speechEnd listener", err);
      }
    });
  }
}
