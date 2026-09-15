/**
 * ELMO Phase 3 — Voice State Manager
 * Coordinates the 7 canonical voice states, transition rules, error boundaries,
 * and state change subscriptions.
 */

import { VoiceError, VoiceState } from "./voice.types";

export type VoiceStateListener = (state: VoiceState, error: VoiceError | null) => void;

export class VoiceStateManager {
  private static instance: VoiceStateManager | null = null;

  private currentState: VoiceState = "STANDBY";
  private currentError: VoiceError | null = null;
  private listeners: Set<VoiceStateListener> = new Set();
  private history: { state: VoiceState; timestamp: number }[] = [];

  private constructor() {}

  public static getInstance(): VoiceStateManager {
    if (!VoiceStateManager.instance) {
      VoiceStateManager.instance = new VoiceStateManager();
    }
    return VoiceStateManager.instance;
  }

  public static resetInstance(): void {
    if (VoiceStateManager.instance) {
      VoiceStateManager.instance.listeners.clear();
      VoiceStateManager.instance.currentState = "STANDBY";
      VoiceStateManager.instance.currentError = null;
      VoiceStateManager.instance.history = [];
      VoiceStateManager.instance = null;
    }
  }

  public getState(): VoiceState {
    return this.currentState;
  }

  public getError(): VoiceError | null {
    return this.currentError;
  }

  public getHistory(): { state: VoiceState; timestamp: number }[] {
    return [...this.history];
  }

  /**
   * Transition to a new voice state with validation
   */
  public transition(targetState: VoiceState, error: VoiceError | null = null): boolean {
    if (this.currentState === targetState && error === null) {
      return false;
    }

    // Capture error if entering ERROR state
    if (targetState === "ERROR") {
      this.currentError = error || {
        code: "unknown",
        message: "An unexpected voice engine error occurred.",
      };
    } else {
      // Clear error on non-error state transition
      this.currentError = null;
    }

    this.currentState = targetState;
    this.history.push({ state: targetState, timestamp: Date.now() });
    if (this.history.length > 50) this.history.shift();

    this.notifyListeners();
    return true;
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState, this.currentError);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState, this.currentError);
      } catch (err) {
        console.error("[VoiceStateManager] Error in state listener", err);
      }
    });
  }

  public reset(): void {
    this.transition("STANDBY");
  }
}
