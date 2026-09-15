/**
 * ELMO Phase 3 — Realtime Voice Provider Factory
 * Creates and configures the active realtime voice provider based on environment settings.
 */

import { RealtimeVoiceProvider } from "../voice.types";
import { GeminiLiveProvider, GeminiLiveProviderOptions } from "./gemini-live.provider";
import { BrowserRealtimeVoiceProvider } from "./browser-providers";

export type RealtimeVoiceProviderType = "gemini-live" | "browser" | "custom";

export function createRealtimeVoiceProvider(
  providerType: RealtimeVoiceProviderType = "gemini-live",
  options?: GeminiLiveProviderOptions
): RealtimeVoiceProvider {
  switch (providerType) {
    case "gemini-live":
      return new GeminiLiveProvider(options);
    case "browser":
    default:
      return new BrowserRealtimeVoiceProvider();
  }
}

export * from "./gemini-live.provider";
export * from "./browser-providers";
