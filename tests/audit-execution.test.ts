/**
 * ELMO AI-NATIVE EXECUTION AUDIT RUNNER
 *
 * Runs the exact 10 business objectives + 1 hard test against the live ELMO runtime
 * without providing hints or telling ELMO which agent, tool, or workflow to use.
 * Captures full runtime execution objects, traces, and metrics.
 */

import { describe, it, expect } from "vitest";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { KnowledgeIngestionService } from "@/services/knowledge/knowledge-ingestion.service";
import { KnowledgeStoreService } from "@/services/knowledge/knowledge-store.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("ELMO AI-Native Execution Audit Runtime Tests", () => {
  const orchestrator = ElmoOrchestratorService.getInstance();
  const ingestion = KnowledgeIngestionService.getInstance();
  const store = KnowledgeStoreService.getInstance();
  const memoryService = ElmoMemoryService.getInstance();
  const mockStore = MockDataStore.getInstance();

  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  it("AUDIT TEST 1: Restaurant — Sales drop investigation & revenue recovery", async () => {
    store.clearAll();
    await ingestion.ingestDocument({
      organizationId: orgId,
      title: "Bistro Menu Pricing & Dining SOP",
      sourceType: "sop",
      content: "Weekend dinner average check dropped by 18% due to slow table turnover and lack of seasonal set menu bundles.",
    });

    const prompt = "My restaurant sales have dropped this month. Find out what may be causing it and help me improve revenue.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== AUDIT TEST 1 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
      skills: s.skills,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("Selected Tools:", result.canonicalExecution?.selectedTools);
    console.log("Selected Skills:", result.canonicalExecution?.plan.selectedSkills);
    console.log("RAG Context:", result.plan?.knowledgeContext ? `Retrieved ${result.plan.knowledgeContext.retrievedCount} chunks` : "RAG NOT REQUIRED");
    console.log("Verification State:", result.canonicalExecution?.verificationState);
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("AUDIT TEST 2: Insurance — Policy renewal rate improvement", async () => {
    store.clearAll();
    await ingestion.ingestDocument({
      organizationId: orgId,
      title: "Policy Underwriting & Retention Manual",
      sourceType: "policy",
      content: "Policy renewal rates drop when follow-up quotation requests exceed 48 hours without automated reminder dispatch.",
    });

    const prompt = "I want to improve policy renewals. Analyze the business situation and determine what we should do.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== AUDIT TEST 2 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("RAG Context:", result.plan?.knowledgeContext ? `Retrieved ${result.plan.knowledgeContext.retrievedCount} chunks` : "RAG NOT REQUIRED");
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("AUDIT TEST 3: Property — Qualified viewing appointments", async () => {
    store.clearAll();
    await ingestion.ingestDocument({
      organizationId: orgId,
      title: "Prime Property Buyer Handbook",
      sourceType: "product_doc",
      content: "High-intent buyer viewings require upfront mortgage pre-qualification and 3D virtual tour walk-throughs.",
    });

    const prompt = "I need more qualified property viewing appointments. Find the biggest opportunity and take the appropriate actions.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== AUDIT TEST 3 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("RAG Context:", result.plan?.knowledgeContext ? `Retrieved ${result.plan.knowledgeContext.retrievedCount} chunks` : "RAG NOT REQUIRED");
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("AUDIT TEST 4: SaaS — Free trial user conversion improvement", async () => {
    const prompt = "Our free trial users are not converting well. Find out where the problem is and improve the situation.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== AUDIT TEST 4 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("AUDIT TEST 5: E-Commerce — Reduce abandoned carts", async () => {
    const prompt = "Too many customers are abandoning their purchases. Help me reduce abandoned carts.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== AUDIT TEST 5 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("AUDIT TEST 6: Coaching / Consulting — Client retention improvement", async () => {
    const prompt = "My clients are not staying with us long enough. Find out why and help improve retention.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== AUDIT TEST 6 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("AUDIT TEST 7: Marketing Agency — Overdue client work backlog", async () => {
    const prompt = "We have too much overdue client work. Help me get the business back under control.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== AUDIT TEST 7 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("AUDIT TEST 8: Service Business — Outstanding jobs completion", async () => {
    const prompt = "We have too many outstanding jobs. Analyze the situation and help us complete them faster.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== AUDIT TEST 8 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("AUDIT TEST 9: Custom Business — Biggest operational problem (Logistics/Freight)", async () => {
    const prompt = "Identify the biggest operational problem affecting this business and determine what we should do about it.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
      companyBrainContext: {
        organization: { name: "Apex Cargo Freight Logistics", industry: "Logistics & Supply Chain" },
        memories: [
          { content: "Fleet vehicle fuel efficiency and customs clearance delays are our biggest bottlenecks." },
        ],
      },
    });

    console.log("=== AUDIT TEST 9 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("AUDIT TEST 10: General Executive Objective — Complete autonomous evaluation", async () => {
    const prompt = "Look at everything you know about my business, identify the most important opportunity right now, create a plan, and take whatever actions you are authorized to take. Ask me for approval only when required.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
      companyBrainContext: {
        organization: { name: "Apex Enterprises", industry: "Commercial Operations" },
        memories: [
          { content: "Quarterly focus: Increase gross margins by automating repetitive manual workflows." },
        ],
      },
    });

    console.log("=== AUDIT TEST 10 TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("Approval Required:", result.pendingApproval ? "YES" : "NO");
    console.log("Response Summary:", result.response.slice(0, 300));
  });

  it("HARD AI-NATIVE TEST — Ambiguous business problem", async () => {
    const prompt = "I have a business problem. I don't know exactly what needs to be done. Analyze the situation, decide what information you need, determine the best workflow, and execute everything you are authorized to do. Ask me only when you genuinely need information or approval.";
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: prompt,
    });

    console.log("=== HARD TEST TRACE ===");
    console.log("Visual State:", result.visualState);
    console.log("Plan Steps:", result.plan?.steps.map((s) => ({
      step: s.stepNumber,
      agent: s.agentId,
      task: s.task,
      tools: s.tools,
    })));
    console.log("Selected Agents:", result.canonicalExecution?.selectedAgents);
    console.log("Response Summary:", result.response.slice(0, 300));
  });
});
