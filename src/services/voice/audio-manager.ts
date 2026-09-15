/**
 * ELMO Phase 3 — Audio Manager
 * Manages Web Audio API context, microphone streams, real-time frequency analysis,
 * and hardware permission states.
 * Guarantees zero raw audio persistence and leak-free resource release.
 */

import { MicPermissionState, VoiceError } from "./voice.types";

export type AudioLevelListener = (level: number) => void;
export type PermissionListener = (state: MicPermissionState) => void;
export type PlaybackListener = (isPlaying: boolean) => void;

export class AudioManager {
  private static instance: AudioManager | null = null;

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private permissionState: MicPermissionState = "unrequested";

  // Playback & Interruption Queue
  private currentPlaybackSource: AudioBufferSourceNode | null = null;
  private playbackQueue: ArrayBuffer[] = [];
  private isCurrentlyPlaying = false;
  private playbackListeners: Set<PlaybackListener> = new Set();

  private levelListeners: Set<AudioLevelListener> = new Set();
  private permissionListeners: Set<PermissionListener> = new Set();
  private animationFrameId: number | null = null;
  private isAnalyzing = false;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public static resetInstance(): void {
    if (AudioManager.instance) {
      AudioManager.instance.release();
      AudioManager.instance = null;
    }
  }

  // ==========================================
  // PERMISSIONS & HARDWARE CHECK
  // ==========================================

  public getPermissionState(): MicPermissionState {
    return this.permissionState;
  }

  public subscribePermission(listener: PermissionListener): () => void {
    this.permissionListeners.add(listener);
    listener(this.permissionState);
    return () => this.permissionListeners.delete(listener);
  }

  private setPermissionState(state: MicPermissionState): void {
    if (this.permissionState === state) return;
    this.permissionState = state;
    this.permissionListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error("[AudioManager] Error in permission listener", err);
      }
    });
  }

  public isSupported(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    return Boolean(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      (window.AudioContext || (window as any).webkitAudioContext)
    );
  }

  /**
   * Request microphone permission explicitly
   */
  public async requestPermission(): Promise<{ granted: boolean; error?: VoiceError }> {
    if (!this.isSupported()) {
      this.setPermissionState("unavailable");
      return {
        granted: false,
        error: {
          code: "mic_unavailable",
          message: "Microphone hardware or Web Audio API is not available in this environment.",
        },
      };
    }

    this.setPermissionState("prompting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Retain the stream so startAudioPipeline can attach without re-requesting
      this.mediaStream = stream;
      this.setPermissionState("granted");
      return { granted: true };
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        this.setPermissionState("denied");
        return {
          granted: false,
          error: {
            code: "mic_permission_denied",
            message: "Microphone access was denied. Please allow microphone permissions in browser settings.",
            details: err.message,
          },
        };
      }

      this.setPermissionState("unavailable");
      return {
        granted: false,
        error: {
          code: "mic_unavailable",
          message: "Microphone hardware was unavailable or failed to respond.",
          details: err.message,
        },
      };
    }
  }

  // ==========================================
  // AUDIO PIPELINE LIFECYCLE
  // ==========================================

  /**
   * Initialize microphone media stream and audio analyzer
   */
  public async startAudioPipeline(): Promise<boolean> {
    if (!this.isSupported()) {
      this.setPermissionState("unavailable");
      return false;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === "closed") {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Reuse stream if already acquired from requestPermission or previous call
      if (!this.mediaStream || !this.mediaStream.active) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.4;
      }

      if (!this.sourceNode) {
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.sourceNode.connect(this.analyser);
      }

      this.setPermissionState("granted");
      this.startLevelMonitoring();
      return true;
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        this.setPermissionState("denied");
      } else {
        this.setPermissionState("unavailable");
      }
      this.release();
      return false;
    }
  }

  /**
   * Stop active microphone capture and suspend pipeline
   */
  public stopAudioPipeline(): void {
    this.stopLevelMonitoring();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
  }

  /**
   * Full teardown of AudioContext and all listeners
   */
  public release(): void {
    this.cancelPlayback();
    this.stopAudioPipeline();

    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.analyser = null;
    this.outputAnalyser = null;
    this.levelListeners.clear();
    this.permissionListeners.clear();
    this.playbackListeners.clear();
    this.permissionState = "unrequested";
  }

  // ==========================================
  // REAL-TIME AUDIO PLAYBACK & CANCELLATION
  // ==========================================

  public isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  public subscribePlayback(listener: PlaybackListener): () => void {
    this.playbackListeners.add(listener);
    listener(this.isCurrentlyPlaying);
    return () => this.playbackListeners.delete(listener);
  }

  private notifyPlayback(isPlaying: boolean): void {
    this.playbackListeners.forEach((listener) => {
      try {
        listener(isPlaying);
      } catch (err) {
        console.error("[AudioManager] Error in playback listener", err);
      }
    });
  }

  private async ensureAudioContext(): Promise<AudioContext | null> {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new AudioCtx();
    }

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch {}
    }

    if (!this.outputAnalyser && this.audioContext) {
      this.outputAnalyser = this.audioContext.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.3;
      this.outputAnalyser.connect(this.audioContext.destination);
    }

    return this.audioContext;
  }

  /**
   * Enqueues an audio chunk for streaming playback
   */
  public async enqueueAudioChunk(data: ArrayBuffer | Uint8Array | Float32Array): Promise<void> {
    let buffer: ArrayBuffer;
    if (data instanceof Uint8Array || data instanceof Float32Array) {
      buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    } else {
      buffer = data as ArrayBuffer;
    }
    this.playbackQueue.push(buffer);

    if (!this.isCurrentlyPlaying) {
      await this.processPlaybackQueue();
    }
  }

  /**
   * Processes subsequent audio chunks from queue
   */
  private async processPlaybackQueue(): Promise<void> {
    if (this.playbackQueue.length === 0) {
      if (this.isCurrentlyPlaying) {
        this.isCurrentlyPlaying = false;
        this.notifyPlayback(false);
      }
      return;
    }

    const audioContext = await this.ensureAudioContext();
    if (!audioContext) {
      this.playbackQueue = [];
      return;
    }

    const rawChunk = this.playbackQueue.shift();
    if (!rawChunk) {
      this.isCurrentlyPlaying = false;
      this.notifyPlayback(false);
      return;
    }

    try {
      // Decode audio data (use slice to prevent buffer detachment issues)
      const decoded = await audioContext.decodeAudioData(rawChunk.slice(0) as ArrayBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = decoded;

      if (this.outputAnalyser) {
        source.connect(this.outputAnalyser);
      } else {
        source.connect(audioContext.destination);
      }

      this.currentPlaybackSource = source;
      this.isCurrentlyPlaying = true;
      this.notifyPlayback(true);

      source.onended = () => {
        if (this.currentPlaybackSource === source) {
          this.currentPlaybackSource = null;
          this.processPlaybackQueue();
        }
      };

      source.start(0);
    } catch (err) {
      console.warn("[AudioManager] Error decoding audio chunk, skipping chunk", err);
      this.processPlaybackQueue();
    }
  }

  /**
   * Instant audio playback cancellation (Critical for Barge-in Interruption)
   */
  public cancelPlayback(): void {
    this.playbackQueue = [];

    if (this.currentPlaybackSource) {
      try {
        this.currentPlaybackSource.stop();
        this.currentPlaybackSource.disconnect();
      } catch {}
      this.currentPlaybackSource = null;
    }

    if (this.isCurrentlyPlaying) {
      this.isCurrentlyPlaying = false;
      this.notifyPlayback(false);
    }
  }

  // ==========================================
  // REAL-TIME AUDIO ENERGY & FREQUENCY ANALYSIS
  // ==========================================

  public subscribeAudioLevel(listener: AudioLevelListener): () => void {
    this.levelListeners.add(listener);
    return () => this.levelListeners.delete(listener);
  }

  /**
   * Computes normalized Root Mean Square (RMS) energy: 0.0 to 1.0.
   * Seamlessly checks microphone input or assistant output energy.
   */
  public getRMS(): number {
    const activeAnalyser = this.isCurrentlyPlaying ? (this.outputAnalyser || this.analyser) : this.analyser;
    if (!activeAnalyser) return 0;
    const buffer = new Float32Array(activeAnalyser.fftSize);
    activeAnalyser.getFloatTimeDomainData(buffer);

    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    // Smooth and clamp between 0 and 1
    return Math.min(1.0, Math.max(0, rms * 2.5));
  }

  /**
   * Returns frequency data array for visualizers
   */
  public getFrequencyData(outputArray: Uint8Array): void {
    const activeAnalyser = this.isCurrentlyPlaying ? (this.outputAnalyser || this.analyser) : this.analyser;
    if (!activeAnalyser) {
      outputArray.fill(0);
      return;
    }
    activeAnalyser.getByteFrequencyData(outputArray as any);
  }

  private startLevelMonitoring(): void {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    const monitor = () => {
      if (!this.isAnalyzing) return;
      const level = this.getRMS();
      this.levelListeners.forEach((listener) => {
        try {
          listener(level);
        } catch {}
      });

      if (typeof window !== "undefined" && window.requestAnimationFrame) {
        this.animationFrameId = window.requestAnimationFrame(monitor);
      }
    };

    monitor();
  }

  private stopLevelMonitoring(): void {
    this.isAnalyzing = false;
    if (this.animationFrameId !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    // Notify 0 energy upon stop
    this.levelListeners.forEach((listener) => {
      try {
        listener(0);
      } catch {}
    });
  }
}
