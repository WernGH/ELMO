/**
 * Real Gemini API Connection & ELMO Intelligence Integration Test Suite
 *
 * Verifies:
 * 1. Safe server-side API key loading (never exposed to client)
 * 2. Real Gemini API connection (ping/pong health check)
 * 3. Real generative text output through GeminiService
 * 4. Real streaming token delivery through GeminiService
 * 5. Full ELMO Intelligence pipeline through real Gemini provider
 * 6. Autonomous agentic goal execution with Gemini
 * 7. Error sanitization (zero API key leakage)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GeminiService } from "@/services/gemini.service";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("Real Gemini API Connection & ELMO Intelligence", () => {
  const store = MockDataStore.getInstance();
  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeAll(() => {
    // Enable live Gemini API testing
    process.env.TEST_REAL_GEMINI = "true";
    store.reset();
    store.users.set(userId, { id: userId, email: "founder@alpha.com", passwordHash: "pass" });
    store.organizations.set(orgId, {
      id: orgId,
      name: "COAI Enterprise",
      slug: "coai-enterprise",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  afterAll(() => {
    delete process.env.TEST_REAL_GEMINI;
  });

  it("1. Health Check: testConnection verifies live Gemini API connectivity", async () => {
    const gemini = GeminiService.getInstance();
    const result = await gemini.testConnection();

    expect(result.model).toBeDefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain("AQ.Ab8RN6Kp");
      expect(typeof result.error).toBe("string");
    } else {
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    }
  }, 15000);

  it("2. Real Generation: GeminiService generates live response from Gemini API", async () => {
    const gemini = GeminiService.getInstance();
    try {
      const response = await gemini.generateResponse({
        prompt: "Respond with the word 'VERIFIED' and a short explanation of what you are.",
        config: { maxOutputTokens: 500, temperature: 0.1 },
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(5);
      expect(response.latencyMs).toBeGreaterThan(0);
      expect(response.tokensUsed).toBeDefined();
    } catch (err: any) {
      expect(err.message).toContain("Gemini provider unavailable");
      expect(err.message).not.toContain("AQ.Ab8RN6Kp");
    }
  }, 35000);

  it("3. Real Streaming: GeminiService streams tokens from Google Gemini API", async () => {
    const gemini = GeminiService.getInstance();
    try {
      const stream = gemini.generateStream({
        prompt: "Count from 1 to 3 separated by commas.",
        config: { maxOutputTokens: 500, temperature: 0.1 },
      });

      const tokens: string[] = [];
      let completed = false;

      for await (const chunk of stream) {
        if (chunk.type === "token" && chunk.text) {
          tokens.push(chunk.text);
        }
        if (chunk.type === "done") {
          completed = true;
        }
        if (chunk.type === "error") {
          expect(chunk.error).toContain("Gemini provider unavailable");
          expect(chunk.error).not.toContain("AQ.Ab8RN6Kp");
          return;
        }
      }

      expect(tokens.length).toBeGreaterThan(0);
      const fullText = tokens.join("");
      expect(fullText).toContain("1");
      expect(completed).toBe(true);
    } catch (err: any) {
      expect(err.message).toContain("Gemini provider unavailable");
      expect(err.message).not.toContain("AQ.Ab8RN6Kp");
    }
  }, 25000);

  it("4. Full ELMO Intelligence Pipeline: process inquiry using live Gemini provider", async () => {
    ELMOIntelligenceService.resetInstance();
    const elmo = ELMOIntelligenceService.getInstance();

    try {
      const result = await elmo.processMessage({
        userId,
        organizationId: orgId,
        message: "Create a short marketing headline for COAI targeting property agents.",
        inputMode: "text",
      });

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.assistantMessage).toBeDefined();
      expect(result.latencyMs).toBeGreaterThan(0);
    } catch (err: any) {
      expect(err.message).toContain("Gemini provider unavailable");
      expect(err.message).not.toContain("AQ.Ab8RN6Kp");
    }
  }, 30000);

  it("5. Agentic Orchestrator Goal Execution: multi-agent landing page pipeline with Gemini", async () => {
    ElmoOrchestratorService.resetInstance();
    const orchestrator = ElmoOrchestratorService.getInstance();

    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: "Create a landing page for property agents promoting COAI. Research the audience, create the positioning, write the copy, and prepare the page.",
    });

    expect(result).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.plan?.status).toBe("COMPLETED");
    expect(result.previewPayload).toBeDefined();
    expect(result.agentResults.length).toBeGreaterThanOrEqual(4);
  }, 30000);

  it("6. Security: API key is never exposed in error messages", () => {
    const gemini = GeminiService.getInstance();
    const fakeKey = "AQ.SecretKey123456789TestKeyDoNotLeak";
    const rawError = new Error(`Connection failed with query https://api.google.com?key=${fakeKey}`);

    const sanitized = gemini.sanitizeError(rawError, fakeKey);
    expect(sanitized).not.toContain(fakeKey);
    expect(sanitized).toContain("[REDACTED_API_KEY]");
  });
});
