import { describe, it, expect, beforeEach } from "vitest";
import { GeminiService } from "@/services/gemini.service";

describe("GeminiService - AI CEO Brain", () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    geminiService = GeminiService.getInstance();
  });

  it("should generate a response for an executive inquiry", async () => {
    const response = await geminiService.generateResponse({
      prompt: "ELMO, what can you help me with?",
    });

    expect(response).toBeDefined();
    expect(response.text).toContain("AI CEO");
    expect(response.text).toContain("workforce");
    expect(response.model).toBeDefined();
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    expect(response.tokensUsed).toBeDefined();
  });

  it("should explain transparently that specialist employees are future capabilities", async () => {
    const response = await geminiService.generateResponse({
      prompt: "ELMO, what can you help me with?",
    });

    expect(response.text).toContain("Specialist AI Workforce");
    expect(response.text.toLowerCase()).toContain("not yet connected");
  });

  it("should generate streaming chunks with smooth token delivery", async () => {
    const streamGen = geminiService.generateStream({
      prompt: "Provide an operational status briefing.",
    });

    const chunks: string[] = [];
    let completed = false;

    for await (const chunk of streamGen) {
      if (chunk.type === "token" && chunk.text) {
        chunks.push(chunk.text);
      }
      if (chunk.type === "done") {
        completed = true;
      }
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join("")).toContain("Executive Operational Briefing");
    expect(completed).toBe(true);
  });

  it("should respect abort signal to stop generation immediately", async () => {
    const controller = new AbortController();
    const streamGen = geminiService.generateStream({
      prompt: "Generate a detailed multi-page corporate expansion plan.",
      abortSignal: controller.signal,
    });

    let receivedChunks = 0;
    for await (const chunk of streamGen) {
      if (chunk.type === "token") {
        receivedChunks++;
        if (receivedChunks >= 2) {
          // Trigger client abort (simulating Stop Generation button)
          controller.abort();
        }
      }
    }

    expect(controller.signal.aborted).toBe(true);
  });

  it("should generate structured output adhering to schema", async () => {
    interface DirectiveAnalysis {
      domain: string;
      riskLevel: "low" | "medium" | "high";
      estimatedPhases: number;
    }

    const result = await geminiService.generateStructuredOutput<DirectiveAnalysis>({
      prompt: '{"domain": "Engineering", "riskLevel": "medium", "estimatedPhases": 3}',
    });

    expect(result).toBeDefined();
    expect(result.domain).toBe("Engineering");
    expect(result.riskLevel).toBe("medium");
    expect(result.estimatedPhases).toBe(3);
  });

  it("should accept custom model configuration", async () => {
    const response = await geminiService.generateResponse({
      prompt: "Status check",
      config: {
        modelName: "gemini-1.5-pro",
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });

    expect(response.model).toContain("gemini-1.5-pro");
  });
});
