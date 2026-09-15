/**
 * ELMO Phase 3 — Voice Session Manager
 * Coordinates session lifecycle, turn counts, interruption metrics,
 * language history, and inactivity timeouts.
 * ZERO raw audio is persisted at any time.
 */

import { VoiceSessionData } from "./voice.types";

export interface VoiceSessionManagerOptions {
  inactivityTimeoutMs?: number;
  onTimeout?: () => void;
  onSessionEnded?: (session: VoiceSessionData) => void;
}

export class VoiceSessionManager {
  private static instance: VoiceSessionManager | null = null;

  private currentSession: VoiceSessionData | null = null;
  private inactivityTimeoutMs: number;
  private inactivityTimer: any = null;
  private onTimeoutCallback?: () => void;
  private onSessionEndedCallback?: (session: VoiceSessionData) => void;

  private constructor(options?: VoiceSessionManagerOptions) {
    this.inactivityTimeoutMs = options?.inactivityTimeoutMs ?? 300000; // 5 minutes default
    this.onTimeoutCallback = options?.onTimeout;
    this.onSessionEndedCallback = options?.onSessionEnded;
  }

  public static getInstance(options?: VoiceSessionManagerOptions): VoiceSessionManager {
    if (!VoiceSessionManager.instance) {
      VoiceSessionManager.instance = new VoiceSessionManager(options);
    }
    return VoiceSessionManager.instance;
  }

  public static resetInstance(): void {
    if (VoiceSessionManager.instance) {
      VoiceSessionManager.instance.clearInactivityTimer();
      VoiceSessionManager.instance.currentSession = null;
      VoiceSessionManager.instance = null;
    }
  }

  public getActiveSession(): VoiceSessionData | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  public startSession(organizationId: string, userId: string, initialLanguage = "auto"): VoiceSessionData {
    // If an active session exists, cleanly terminate it first
    if (this.currentSession && this.currentSession.status === "active") {
      this.endSession("completed");
    }

    const sessionId = `vses_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    this.currentSession = {
      id: sessionId,
      organizationId: organizationId || "org_default",
      userId: userId || "user_default",
      startedAt: now,
      durationSeconds: 0,
      detectedLanguage: initialLanguage,
      userTurnsCount: 0,
      assistantTurnsCount: 0,
      interruptionCount: 0,
      status: "active",
      metadata: {},
    };

    this.resetInactivityTimer();
    return { ...this.currentSession };
  }

  public recordUserTurn(): void {
    if (!this.currentSession) return;
    this.currentSession.userTurnsCount++;
    this.resetInactivityTimer();
  }

  public recordAssistantTurn(): void {
    if (!this.currentSession) return;
    this.currentSession.assistantTurnsCount++;
    this.resetInactivityTimer();
  }

  public recordInterruption(): void {
    if (!this.currentSession) return;
    this.currentSession.interruptionCount++;
    this.resetInactivityTimer();
  }

  public updateLanguage(language: string): void {
    if (!this.currentSession) return;
    this.currentSession.detectedLanguage = language;
  }

  public resetInactivityTimer(): void {
    this.clearInactivityTimer();

    if (this.currentSession && this.currentSession.status === "active") {
      this.inactivityTimer = setTimeout(() => {
        this.handleInactivityTimeout();
      }, this.inactivityTimeoutMs);
    }
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private handleInactivityTimeout(): void {
    console.info("[VoiceSessionManager] Voice session timed out due to inactivity.");
    if (this.currentSession) {
      this.endSession("completed");
    }
    if (this.onTimeoutCallback) {
      this.onTimeoutCallback();
    }
  }

  public async endSession(
    finalStatus: "completed" | "interrupted" | "failed" = "completed"
  ): Promise<VoiceSessionData | null> {
    this.clearInactivityTimer();

    if (!this.currentSession) return null;

    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.round((new Date(endedAt).getTime() - new Date(this.currentSession.startedAt).getTime()) / 1000)
    );

    this.currentSession.endedAt = endedAt;
    this.currentSession.durationSeconds = durationSeconds;
    this.currentSession.status = finalStatus;

    const completedSession = { ...this.currentSession };

    // Sync session metadata to server (asynchronous background flush)
    this.syncSessionToServer(completedSession).catch((err) => {
      console.warn("[VoiceSessionManager] Could not sync session metadata to server:", err);
    });

    if (this.onSessionEndedCallback) {
      try {
        this.onSessionEndedCallback(completedSession);
      } catch {}
    }

    this.currentSession = null;
    return completedSession;
  }

  private async syncSessionToServer(session: VoiceSessionData): Promise<void> {
    if (typeof window === "undefined" || !navigator.onLine) return;

    try {
      await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
    } catch {}
  }
}
