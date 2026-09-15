/**
 * ELMO Phase 2 — LLM Provider Abstraction
 * Defines the clean provider boundary allowing Gemini (and future providers like OpenAI, Claude)
 * to be plugged in seamlessly without rebuilding ELMO's core intelligence architecture.
 */

import {
  GeminiResponse,
  LLMGenerateOptions,
  LLMProvider,
  StreamChunk,
} from "@/types/chat.types";
import { GeminiService } from "./gemini.service";

export type { LLMProvider, LLMGenerateOptions } from "@/types/chat.types";
export type LLMProviderType = "gemini" | "openai" | "claude" | "mock";

/**
 * Gemini Provider — Authoritative primary text intelligence provider for ELMO.
 */
export class GeminiProvider implements LLMProvider {
  public readonly name = "gemini";
  private geminiService: GeminiService;

  constructor(geminiService?: GeminiService) {
    this.geminiService = geminiService || GeminiService.getInstance();
  }

  public async generateResponse(options: LLMGenerateOptions): Promise<GeminiResponse> {
    return this.geminiService.generateResponse(options);
  }

  public async *generateStream(
    options: LLMGenerateOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    yield* this.geminiService.generateStream(options);
  }
}

/**
 * Factory for creating/retrieving LLM providers
 */
export class LLMProviderFactory {
  private static providers: Map<string, LLMProvider> = new Map();

  public static getProvider(type: LLMProviderType = "gemini"): LLMProvider {
    if (!this.providers.has(type)) {
      switch (type) {
        case "gemini":
        default:
          this.providers.set(type, new GeminiProvider());
          break;
      }
    }
    return this.providers.get(type)!;
  }

  public static registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
  }

  public static reset(): void {
    this.providers.clear();
  }
}
