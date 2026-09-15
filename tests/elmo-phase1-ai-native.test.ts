/**
 * ELMO Phase 1 — AI-Native Core + Voice + Multilingual Acceptance Test Suite
 *
 * Validates the 7 Core Acceptance Criteria from Section 40:
 * 1. Natural conversation: "Hey ELMO, how are you?" -> direct response, no tools.
 * 2. Business question: "What are three ways I can improve my landing page?" -> direct response, no agent execution.
 * 3. Context continuity: 3-turn sequence maintaining topic, audience, and style.
 * 4. Multilingual: "ELMO, buat landing page untuk property agent" -> Malay detection and intent comprehension.
 * 5. Code switching: "Make the headline lebih premium and fokus on property agents" -> Mixed language handling and entity extraction.
 * 6. Voice: "ELMO, what should I improve on my funnel?" (voice mode) -> Direct conversational response with voice telemetry.
 * 7. Future workflow routing: "Build me a landing page for my AI business targeting property agents" -> Workflow categorization and canonical ElmoRequest formulation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { ElmoIntentService } from "@/services/elmo-intent.service";
import { ContextService } from "@/services/context.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { WebCodingAgentService } from "@/services/agentic/web-coding/web-coding-agent.service";

describe("ELMO Phase 1 Upgrade: AI-Native Core + Voice + Multilingual", () => {
  let intelligenceService: ELMOIntelligenceService;
  let intentService: ElmoIntentService;
  let contextService: ContextService;
  const store = MockDataStore.getInstance();

  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    store.reset();
    ELMOIntelligenceService.resetInstance();
    ElmoOrchestratorService.resetInstance();
    WebCodingAgentService.getInstance().reset();

    intelligenceService = ELMOIntelligenceService.getInstance();
    intentService = ElmoIntentService.getInstance();
    contextService = ContextService.getInstance();
  });

  // ==========================================================================
  // Test 1: Natural Conversation
  // "Hey ELMO, how are you?"
  // ==========================================================================
  it("Test 1: should respond conversationally to natural greetings without invoking tools or agents", async () => {
    const res = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "Hey ELMO, how are you?",
      inputMode: "text",
    });

    expect(res).toBeDefined();
    expect(res.text).toBeDefined();
    expect(res.text.length).toBeGreaterThan(0);
    // Should NOT route to orchestrator multi-agent workflow
    expect(res.provider).not.toBe("elmo-orchestrator");
    expect(res.toolsExecuted).toBeUndefined();

    // Canonical ElmoRequest validation
    expect(res.elmoRequest).toBeDefined();
    expect(res.elmoRequest?.executionCategory).toBe("direct_response");
    expect(res.elmoRequest?.requiresAction).toBe(false);
  });

  // ==========================================================================
  // Test 2: Business Question
  // "What are three ways I can improve my landing page?"
  // ==========================================================================
  it("Test 2: should directly answer business/advisory questions without launching agent workflows", async () => {
    const res = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "What are three ways I can improve my landing page?",
      inputMode: "text",
    });

    expect(res).toBeDefined();
    expect(res.text).toBeDefined();
    // Must NOT invoke the orchestrator or web-coding agent for advisory questions
    expect(res.provider).not.toBe("elmo-orchestrator");
    expect(res.previewPayload).toBeUndefined();
    expect(res.executionPlan).toBeUndefined();

    // Canonical ElmoRequest validation
    expect(res.elmoRequest).toBeDefined();
    expect(res.elmoRequest?.executionCategory).toBe("direct_response");
    expect(res.elmoRequest?.requiresAction).toBe(false);
  });

  // ==========================================================================
  // Test 3: Context Continuity Across Turns
  // Turn 1: "I want a landing page for my AI business"
  // Turn 2: "Target property agents"
  // Turn 3: "Make it more premium"
  // ==========================================================================
  it("Test 3: should maintain context continuity (topic, audience, style) across multi-turn dialogs", async () => {
    // Turn 1
    const turn1 = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "I want a landing page for my AI business",
      inputMode: "text",
    });
    const conversationId = turn1.conversationId;
    expect(conversationId).toBeDefined();

    // Turn 2 in the same conversation
    const turn2 = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      conversationId,
      message: "Target property agents",
      inputMode: "text",
    });
    expect(turn2.conversationId).toBe(conversationId);

    // Turn 3 in the same conversation
    const turn3 = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      conversationId,
      message: "Make it more premium",
      inputMode: "text",
    });
    expect(turn3.conversationId).toBe(conversationId);

    // Validate continuity resolution directly via ContextService
    const continuity = await contextService.getConversationContinuity(
      userId,
      orgId,
      conversationId
    );

    expect(continuity).toBeDefined();
    expect(continuity.activeTopic?.toLowerCase()).toMatch(/(landing page|ai business)/i);
    expect(continuity.targetAudience?.toLowerCase()).toContain("property agent");
    expect(continuity.style?.toLowerCase()).toContain("premium");
  });

  // ==========================================================================
  // Test 4: Multilingual
  // "ELMO, buat landing page untuk property agent"
  // ==========================================================================
  it("Test 4: should detect Malay language and understand intent and target audience", async () => {
    const query = "ELMO, buat landing page untuk property agent";
    const intentAnalysis = intentService.analyzeIntent(query);

    expect(intentAnalysis).toBeDefined();
    expect(intentAnalysis.entities.targetAudience?.toLowerCase()).toContain("property agent");

    const res = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: query,
      inputMode: "text",
    });

    expect(res).toBeDefined();
    // Language detection verifies Malay/ms
    expect(["ms", "malay"]).toContain(res.detectedLanguageCode.toLowerCase());
    expect(res.elmoRequest).toBeDefined();
    expect(res.elmoRequest?.entities.targetAudience?.toLowerCase()).toContain("property agent");
  });

  // ==========================================================================
  // Test 5: Code Switching (Mixed Malay & English)
  // "Make the headline lebih premium and fokus on property agents"
  // ==========================================================================
  it("Test 5: should parse code-switched inputs and extract entities seamlessly", async () => {
    const mixedQuery = "Make the headline lebih premium and fokus on property agents";
    const intentAnalysis = intentService.analyzeIntent(mixedQuery);

    expect(intentAnalysis).toBeDefined();
    expect(intentAnalysis.entities.style?.toLowerCase()).toContain("premium");
    expect(intentAnalysis.entities.targetAudience?.toLowerCase()).toContain("property agents");

    const res = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: mixedQuery,
      inputMode: "text",
    });

    expect(res).toBeDefined();
    expect(res.elmoRequest).toBeDefined();
    expect(res.elmoRequest?.isCodeSwitched).toBe(true);
    expect(res.elmoRequest?.entities.style?.toLowerCase()).toContain("premium");
    expect(res.elmoRequest?.entities.targetAudience?.toLowerCase()).toContain("property agents");
  });

  // ==========================================================================
  // Test 6: Voice Input Mode
  // "ELMO, what should I improve on my funnel?"
  // ==========================================================================
  it("Test 6: should handle voice input mode directly without executing destructive or heavy workflows", async () => {
    const res = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "ELMO, what should I improve on my funnel?",
      inputMode: "voice",
    });

    expect(res).toBeDefined();
    expect(res.inputMode).toBe("voice");
    expect(res.assistantMessage.metadata.input_mode).toBe("voice");
    expect(res.assistantMessage.metadata.voiced).toBe(true);

    // Should be classified as direct response (advice/improvement inquiry)
    expect(res.elmoRequest).toBeDefined();
    expect(res.elmoRequest?.executionCategory).toBe("direct_response");
    expect(res.elmoRequest?.source).toBe("voice");
  });

  // ==========================================================================
  // Test 7: Future Workflow Routing
  // "Build me a landing page for my AI business targeting property agents"
  // ==========================================================================
  it("Test 7: should categorize multi-step requests as workflow and formulate canonical ElmoRequest", async () => {
    const message = "Build me a landing page for my AI business targeting property agents";
    const intentAnalysis = intentService.analyzeIntent(message);

    // Verification of intent classification & execution category
    expect(intentAnalysis.executionCategory).toBe("workflow");
    expect(intentAnalysis.requiresAction).toBe(true);
    expect(intentAnalysis.requiresPlanning).toBe(true);
    expect(intentAnalysis.requestedOutcome).toBeDefined();
    expect(intentAnalysis.entities.targetAudience?.toLowerCase()).toContain("property agents");

    // Verification through ELMO Central Intelligence
    const res = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message,
      inputMode: "text",
    });

    expect(res).toBeDefined();
    expect(res.elmoRequest).toBeDefined();
    expect(res.elmoRequest?.executionCategory).toBe("workflow");
    expect(res.elmoRequest?.requiresAction).toBe(true);
    expect(res.elmoRequest?.requiresPlanning).toBe(true);
    expect(res.elmoRequest?.requestedOutcome).toBeDefined();
  });
});
