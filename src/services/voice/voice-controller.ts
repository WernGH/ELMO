/**
 * ELMO Phase 3 — Voice Controller
 * Master orchestrator connecting:
 * - AudioManager (hardware permissions & audio pipeline)
 * - VoiceStateManager (canonical 7-state lifecycle)
 * - VoiceActivityDetector (natural speech onset/end detection)
 * - SpeechToTextService (STT)
 * - TextToSpeechService (TTS)
 * - Existing ChatService & GeminiService (shared intelligence & persistence)
 *
 * Enforces:
 * - Hands-free continuous loop without wake word
 * - Instant barge-in interruption
 * - Inactivity auto-standby
 * - Resilient error recovery & text fallback
 */

import { AudioManager } from "./audio-manager";
import { VoiceStateManager } from "./voice-state-manager";
import { VoiceActivityDetector } from "./vad.service";
import { SpeechToTextService } from "./stt.service";
import { TextToSpeechService } from "./tts.service";
import {
  DEFAULT_VOICE_CONFIG,
  VoiceConfig,
  VoiceError,
  VoiceState,
} from "./voice.types";
import { LanguageContextService } from "./language-context.service";
import { VoiceSessionManager } from "./voice-session-manager";
import { ChatService } from "@/services/chat.service";
import { GeminiService } from "@/services/gemini.service";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";

export interface VoiceControllerOptions {
  organizationId?: string;
  userId?: string;
  conversationId?: string;
  config?: Partial<VoiceConfig>;
  onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
  onMessageCreated?: (role: "user" | "assistant", content: string) => void;
}

export class VoiceController {
  private static instance: VoiceController | null = null;

  private audioManager: AudioManager;
  private stateManager: VoiceStateManager;
  private vad: VoiceActivityDetector;
  private stt: SpeechToTextService;
  private tts: TextToSpeechService;
  private chatService: ChatService;
  private geminiService: GeminiService;
  private elmoIntelligence: ELMOIntelligenceService;
  private languageContextService: LanguageContextService;
  private sessionManager: VoiceSessionManager;

  private config: VoiceConfig;
  private organizationId = "11111111-1111-1111-1111-111111111111";
  private userId = "00000000-0000-0000-0000-000000000001";
  private conversationId: string | null = null;

  private currentTranscript = "";
  private lastProcessedUtterance = "";
  private lastProcessedTime = 0;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private utteranceDebounceTimer: NodeJS.Timeout | null = null;
  private isContinuousMode = false;
  private isPausedMode = false;
  private isManualMuted = false;
  private isDestroyed = false;

  private onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
  private onMessageCreated?: (role: "user" | "assistant", content: string) => void;

  private unsubVADStart: (() => void) | null = null;
  private unsubVADEnd: (() => void) | null = null;
  private unsubSTTTranscript: (() => void) | null = null;
  private unsubSTTError: (() => void) | null = null;
  private unsubTTSEnd: (() => void) | null = null;
  private unsubTTSError: (() => void) | null = null;

  constructor(options: VoiceControllerOptions = {}) {
    let defaultLang = DEFAULT_VOICE_CONFIG.lang;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem("elmo_voice_language");
        if (saved) defaultLang = saved;
      } catch {}
    }
    this.config = { ...DEFAULT_VOICE_CONFIG, lang: defaultLang, ...options.config };
    if (options.organizationId) this.organizationId = options.organizationId;
    if (options.userId) this.userId = options.userId;
    if (options.conversationId) this.conversationId = options.conversationId;
    this.onTranscriptUpdate = options.onTranscriptUpdate;
    this.onMessageCreated = options.onMessageCreated;

    this.audioManager = AudioManager.getInstance();
    this.stateManager = VoiceStateManager.getInstance();
    this.vad = new VoiceActivityDetector(this.config.vadConfig, this.audioManager);
    this.stt = new SpeechToTextService();
    this.tts = new TextToSpeechService();
    this.chatService = ChatService.getInstance();
    this.geminiService = GeminiService.getInstance();
    this.elmoIntelligence = ELMOIntelligenceService.getInstance();
    this.languageContextService = LanguageContextService.getInstance();
    this.sessionManager = VoiceSessionManager.getInstance({
      onTimeout: () => this.stopVoiceMode(),
    });

    this.bindInternalEvents();
  }

  /**
   * Dynamically switches speech recognition and output language
   * (e.g. 'ms', 'zh', 'ja', 'es', 'en', or BCP-47 tags like 'ms-MY', 'zh-CN')
   */
  public setLanguage(langCodeOrTag: string): void {
    const bcp47 = LanguageContextService.getBcp47Tag(langCodeOrTag);
    const resolvedCode =
      LanguageContextService.resolveLanguageStringToCode(langCodeOrTag) ||
      langCodeOrTag.split("-")[0];

    this.config.lang = bcp47;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("elmo_voice_language", bcp47);
      } catch {}
    }
    this.stt.setLanguage(bcp47);
    this.languageContextService.updateContext("", resolvedCode);
    this.sessionManager.updateLanguage(resolvedCode);
  }

  public getLanguage(): string {
    return this.config.lang;
  }

  public updateCallbacks(options: VoiceControllerOptions): void {
    if (options.onTranscriptUpdate !== undefined) {
      this.onTranscriptUpdate = options.onTranscriptUpdate;
    }
    if (options.onMessageCreated !== undefined) {
      this.onMessageCreated = options.onMessageCreated;
    }
    if (options.organizationId) {
      this.organizationId = options.organizationId;
    }
    if (options.userId) {
      this.userId = options.userId;
    }
    if (options.conversationId !== undefined) {
      this.conversationId = options.conversationId;
    }
    if (options.config) {
      this.config = { ...this.config, ...options.config };
    }
  }

  public static getInstance(options?: VoiceControllerOptions): VoiceController {
    if (!VoiceController.instance) {
      VoiceController.instance = new VoiceController(options);
    } else if (options) {
      VoiceController.instance.updateCallbacks(options);
    }
    return VoiceController.instance;
  }

  public static resetInstance(): void {
    if (VoiceController.instance) {
      VoiceController.instance.destroy();
      VoiceController.instance = null;
    }
  }

  public updateContext(orgId?: string, userId?: string, convId?: string): void {
    if (orgId) this.organizationId = orgId;
    if (userId) this.userId = userId;
    if (convId) this.conversationId = convId;
  }

  public getConversationId(): string | null {
    return this.conversationId;
  }

  public getState(): VoiceState {
    return this.stateManager.getState();
  }

  public getStateManager(): VoiceStateManager {
    return this.stateManager;
  }

  public getAudioManager(): AudioManager {
    return this.audioManager;
  }

  public getVAD(): VoiceActivityDetector {
    return this.vad;
  }

  public getSTT(): SpeechToTextService {
    return this.stt;
  }

  public getTTS(): TextToSpeechService {
    return this.tts;
  }

  public getLanguageContextService(): LanguageContextService {
    return this.languageContextService;
  }

  public getSessionManager(): VoiceSessionManager {
    return this.sessionManager;
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================

  private bindInternalEvents(): void {
    // 1. VAD Speech Start -> Handles barge-in interruption & user speaking state
    this.unsubVADStart = this.vad.onSpeechStart(() => {
      this.clearInactivityTimer();
      const currentState = this.stateManager.getState();

      if (currentState === "ELMO_SPEAKING") {
        // STEP 10: Barge-in interruption
        this.tts.stop();
        this.stateManager.transition("INTERRUPTED");
        setTimeout(() => {
          if (!this.isDestroyed) {
            this.stateManager.transition("USER_SPEAKING");
          }
        }, 50);
      } else if (currentState === "LISTENING") {
        this.stateManager.transition("USER_SPEAKING");
      }
    });

    // 2. VAD Speech End -> User finished speaking
    this.unsubVADEnd = this.vad.onSpeechEnd(async () => {
      const currentState = this.stateManager.getState();
      if (currentState === "USER_SPEAKING" || currentState === "LISTENING") {
        await this.handleUserUtteranceComplete();
      }
    });

    // 3. STT Transcript updates (Dual speech trigger alongside VAD)
    this.unsubSTTTranscript = this.stt.onTranscript((text, isFinal) => {
      this.currentTranscript = text;
      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(text, isFinal);
      }

      if (text.trim().length > 0) {
        this.clearInactivityTimer();
        const currentState = this.stateManager.getState();
        if (currentState === "LISTENING") {
          this.stateManager.transition("USER_SPEAKING");
        } else if (currentState === "ELMO_SPEAKING") {
          this.interrupt();
        }
      }

      if (isFinal && text.trim().length > 0) {
        this.scheduleUtteranceCompletion(text.trim());
      }
    });

    // 4. STT Errors
    this.unsubSTTError = this.stt.onError((error) => {
      this.handleVoiceError(error);
    });

    // 5. TTS Playback Complete -> Continuous loop back to LISTENING
    this.unsubTTSEnd = this.tts.onEnd(() => {
      if (this.stateManager.getState() === "ELMO_SPEAKING") {
        if (this.isContinuousMode) {
          // STEP 9: Return automatically to LISTENING for hands-free loop
          this.stateManager.transition("LISTENING");
          this.currentTranscript = "";
          // Resume STT with active conversational language
          const activeLang = this.languageContextService.getContext().responseLanguage;
          const activeTag = LanguageContextService.getBcp47Tag(activeLang);
          this.stt.start(activeTag).catch(() => {});
        } else {
          this.stateManager.transition("STANDBY");
        }
      }
    });

    // 6. TTS Errors
    this.unsubTTSError = this.tts.onError((error) => {
      this.handleVoiceError(error);
    });
  }

  private scheduleUtteranceCompletion(text: string): void {
    if (this.utteranceDebounceTimer) {
      clearTimeout(this.utteranceDebounceTimer);
    }
    this.utteranceDebounceTimer = setTimeout(async () => {
      this.utteranceDebounceTimer = null;
      const currentState = this.stateManager.getState();
      if (currentState === "USER_SPEAKING" || currentState === "LISTENING") {
        await this.handleUserUtteranceComplete(text);
      }
    }, 600);
  }

  // ==========================================
  // CONVERSATION LIFECYCLE & CONTINUOUS LOOP
  // ==========================================

  /**
   * Start Voice CEO conversation mode
   */
  public async startVoiceMode(): Promise<boolean> {
    this.isContinuousMode = true;

    // STEP 4: Explicit microphone permission check
    const permission = await this.audioManager.requestPermission();
    if (!permission.granted) {
      this.stateManager.transition("ERROR", permission.error || {
        code: "mic_permission_denied",
        message: "Microphone permission is required to converse with ELMO.",
      });
      return false;
    }

    // Initialize audio pipeline
    const audioReady = await this.audioManager.startAudioPipeline();
    if (!audioReady) {
      this.stateManager.transition("ERROR", {
        code: "mic_unavailable",
        message: "Unable to start audio input stream.",
      });
      return false;
    }

    // Start VAD & STT
    await this.vad.start();
    await this.stt.start(this.config.lang);

    this.sessionManager.startSession(this.organizationId, this.userId, this.config.lang || "auto");
    this.stateManager.transition("LISTENING");
    this.startInactivityTimer();
    return true;
  }

  public isPaused(): boolean {
    return this.isPausedMode;
  }

  public isContinuous(): boolean {
    return this.isContinuousMode;
  }

  public isManualMute(): boolean {
    return this.isManualMuted;
  }

  /**
   * Pause Voice Mode temporarily without destroying the session
   */
  public pauseVoiceMode(): void {
    if (!this.isContinuousMode) return;
    this.isPausedMode = true;
    this.clearInactivityTimer();
    this.audioManager.cancelPlayback();
    this.tts.stop();
    this.stt.stop();
    this.vad.stop();
    this.stateManager.transition("STANDBY");
  }

  /**
   * Immediately interrupts ELMO speaking (Instant Barge-in)
   */
  public interrupt(): void {
    this.sessionManager.recordInterruption();
    this.audioManager.cancelPlayback();
    this.tts.stop();
    this.stateManager.transition("INTERRUPTED");
    setTimeout(() => {
      if (!this.isDestroyed && this.isContinuousMode && !this.isPausedMode) {
        this.stateManager.transition("LISTENING");
        this.stt.start(this.config.lang).catch(() => {});
        this.startInactivityTimer();
      }
    }, 200);
  }

  /**
   * Resume Voice Mode after pause
   */
  public async resumeVoiceMode(): Promise<boolean> {
    if (!this.isContinuousMode) {
      return this.startVoiceMode();
    }
    this.isPausedMode = false;
    this.isManualMuted = false;
    await this.vad.start();
    await this.stt.start(this.config.lang);
    this.stateManager.transition("LISTENING");
    this.startInactivityTimer();
    return true;
  }

  /**
   * Fallback manual microphone toggle for accessibility and browser constraints
   */
  public async toggleManualMicrophone(): Promise<boolean> {
    const currentState = this.stateManager.getState();
    if (currentState === "LISTENING" || currentState === "USER_SPEAKING") {
      this.isManualMuted = true;
      this.stt.stop();
      this.stateManager.transition("STANDBY");
      return false;
    } else {
      this.isManualMuted = false;
      if (!this.isContinuousMode) {
        return this.startVoiceMode();
      }
      return this.resumeVoiceMode();
    }
  }

  /**
   * Stop Voice conversation mode and release hardware
   */
  public stopVoiceMode(): void {
    this.isContinuousMode = false;
    this.isPausedMode = false;
    this.isManualMuted = false;
    this.clearInactivityTimer();
    if (this.utteranceDebounceTimer) {
      clearTimeout(this.utteranceDebounceTimer);
      this.utteranceDebounceTimer = null;
    }
    this.audioManager.cancelPlayback();
    this.tts.stop();
    this.stt.stop();
    this.vad.stop();
    this.audioManager.stopAudioPipeline();
    this.sessionManager.endSession("completed");
    this.stateManager.transition("STANDBY");
  }

  /**
   * Process completed user speech and invoke ELMO intelligence
   */
  public async handleUserUtteranceComplete(explicitText?: string): Promise<void> {
    if (this.utteranceDebounceTimer) {
      clearTimeout(this.utteranceDebounceTimer);
      this.utteranceDebounceTimer = null;
    }

    const currentState = this.stateManager.getState();
    if (currentState === "PROCESSING" || currentState === "ELMO_SPEAKING") {
      return;
    }

    let spokenText = (explicitText || this.stt.getTranscript() || this.currentTranscript).trim();

    // If text isn't immediately finalized but user was speaking, yield briefly for STT engine
    if (!spokenText && (currentState === "USER_SPEAKING" || explicitText === undefined)) {
      await new Promise((resolve) => setTimeout(resolve, 550));
      spokenText = (explicitText || this.stt.getTranscript() || this.currentTranscript).trim();
    }

    if (!spokenText) {
      // Empty utterance: return to listening
      this.stateManager.transition("LISTENING");
      this.startInactivityTimer();
      return;
    }

    // Prevent immediate duplicate execution if debounced event fires twice
    if (
      spokenText.toLowerCase() === this.lastProcessedUtterance.toLowerCase() &&
      Date.now() - this.lastProcessedTime < 2500
    ) {
      return;
    }
    this.lastProcessedUtterance = spokenText;
    this.lastProcessedTime = Date.now();

    // Reset STT buffers for next turn
    this.currentTranscript = "";
    this.stt.clearTranscript();

    this.clearInactivityTimer();
    this.stateManager.transition("PROCESSING");

    // Track user turn
    this.sessionManager.recordUserTurn();

    const activeConvId = this.conversationId || undefined;

    try {
      // Step 6 & 7: Unified ELMO Intelligence Pipeline (Single Brain for Voice & Text)
      const elmoResponse = await this.elmoIntelligence.processMessage({
        userId: this.userId,
        organizationId: this.organizationId,
        conversationId: activeConvId,
        message: spokenText,
        inputMode: "voice",
      });

      this.conversationId = elmoResponse.conversationId;
      const assistantText = elmoResponse.text;
      const responseLang = elmoResponse.responseLanguage || elmoResponse.languageCode;

      // Section 24: Development Logging & Transcript Verification
      console.log("[ELMO Voice Debug]", {
        transcript: spokenText,
        detectedLanguage: elmoResponse.detectedLanguageCode || elmoResponse.languageCode,
        confidence: elmoResponse.confidence,
        conversationId: elmoResponse.conversationId,
        timestamp: new Date().toISOString(),
        intent: elmoResponse.intent,
        response: assistantText,
      });

      // Adapt speech recognition language model to match detected language for subsequent turns
      const detectedBcp47 = LanguageContextService.getBcp47Tag(responseLang);
      if (detectedBcp47 && detectedBcp47 !== this.config.lang) {
        this.config.lang = detectedBcp47;
        this.stt.setLanguage(detectedBcp47);
      }
      this.sessionManager.updateLanguage(responseLang);

      if (this.onMessageCreated) {
        this.onMessageCreated("user", spokenText);
        this.onMessageCreated("assistant", assistantText);
      }

      // STEP 8: Automatic Multilingual Text-To-Speech
      const targetBcp47 = LanguageContextService.getBcp47Tag(responseLang);
      const ttsConfig = { ...this.config, lang: targetBcp47 };

      this.stateManager.transition("ELMO_SPEAKING");
      this.sessionManager.recordAssistantTurn();
      await this.tts.speak(assistantText, ttsConfig);
    } catch (err: any) {
      this.handleVoiceError({
        code: "gemini_error",
        message: "ELMO cognitive service failed to generate an executive response.",
        details: err.message,
        recoverable: true,
      });
    }
  }

  // ==========================================
  // INACTIVITY TIMEOUT (STEP 11)
  // ==========================================

  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(() => {
      if (this.stateManager.getState() === "LISTENING") {
        // Automatic transition to STANDBY
        this.stopVoiceMode();
      }
    }, this.config.inactivityTimeoutMs);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  // ==========================================
  // ERROR RECOVERY & FALLBACK (STEP 12)
  // ==========================================

  public handleVoiceError(error: VoiceError): void {
    console.error("[VoiceController] Voice system alert:", error);
    this.clearInactivityTimer();
    this.tts.stop();
    this.stt.stop();
    this.vad.stop();
    this.audioManager.stopAudioPipeline();

    this.stateManager.transition("ERROR", error);
  }

  public retry(): void {
    this.startVoiceMode();
  }

  public fallbackToText(): void {
    this.stopVoiceMode();
    this.stateManager.transition("STANDBY");
  }

  // ==========================================
  // CLEANUP & TEARDOWN
  // ==========================================

  public destroy(): void {
    this.isDestroyed = true;
    this.stopVoiceMode();

    if (this.unsubVADStart) this.unsubVADStart();
    if (this.unsubVADEnd) this.unsubVADEnd();
    if (this.unsubSTTTranscript) this.unsubSTTTranscript();
    if (this.unsubSTTError) this.unsubSTTError();
    if (this.unsubTTSEnd) this.unsubTTSEnd();
    if (this.unsubTTSError) this.unsubTTSError();

    this.audioManager.release();
    this.stateManager.reset();
  }
}
