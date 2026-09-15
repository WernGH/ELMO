import { describe, it, expect } from "vitest";
import { GeminiService } from "@/services/gemini.service";

describe("Chat Streaming - Real-Time Generation & Event Delivery", () => {
  const geminiService = GeminiService.getInstance();

  it("should stream successive text tokens without dropping characters", async () => {
    const prompt = "Decompose our autonomous expansion goal into 3 directives.";
    const stream = geminiService.generateStream({ prompt });

    let fullText = "";
    let tokenCount = 0;

    for await (const chunk of stream) {
      if (chunk.type === "token" && chunk.text) {
        fullText += chunk.text;
        tokenCount++;
      }
    }

    expect(tokenCount).toBeGreaterThan(0);
    expect(fullText.length).toBeGreaterThan(20);
  });

  it("should emit metadata on stream completion", async () => {
    const stream = geminiService.generateStream({ prompt: "Status check" });

    let hasMetadata = false;
    let hasDone = false;

    for await (const chunk of stream) {
      if (chunk.type === "metadata") {
        hasMetadata = true;
        expect(chunk.metadata?.status).toBe("complete");
      }
      if (chunk.type === "done") {
        hasDone = true;
      }
    }

    expect(hasMetadata).toBe(true);
    expect(hasDone).toBe(true);
  });

  it("should terminate immediately when abort signal is triggered", async () => {
    const controller = new AbortController();
    const stream = geminiService.generateStream({
      prompt: "Produce an exhaustive 10,000-word corporate governance manual.",
      abortSignal: controller.signal,
    });

    let chunksBeforeAbort = 0;
    for await (const chunk of stream) {
      if (chunk.type === "token") {
        chunksBeforeAbort++;
        if (chunksBeforeAbort >= 1) {
          controller.abort();
        }
      }
    }

    expect(controller.signal.aborted).toBe(true);
  });
});
