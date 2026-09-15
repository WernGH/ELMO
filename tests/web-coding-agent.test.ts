/**
 * ELMO Phase 3 — Web/Coding Agent & Preview Test Suite
 */

import { describe, it, expect, beforeEach } from "vitest";
import { WebCodingAgentService } from "@/services/agentic/web-coding/web-coding-agent.service";
import { WebPreviewService } from "@/services/agentic/web-coding/web-preview.service";
import { AgentMessage, PreviewPayload } from "@/services/agentic/types/agentic.types";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("Phase 3: WebCodingAgentService & WebPreviewService", () => {
  let agent: WebCodingAgentService;
  let previewService: WebPreviewService;
  const orgId = "org-test-dev-001";

  beforeEach(() => {
    MockDataStore.getInstance().reset();
    agent = WebCodingAgentService.getInstance();
    previewService = WebPreviewService.getInstance();
    agent.reset();
  });

  it("should generate a complete landing page with 5 structured components from scratch", async () => {
    const msg: AgentMessage = {
      messageId: "msg-1",
      executionId: "exec-1",
      sender: "elmo-orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build landing page for property agents",
      context: { organizationId: orgId },
      input: { targetAudience: "Property Agents", topic: "AI Assistant" },
      timestamp: Date.now(),
    };

    const result = await agent.execute(msg);
    expect(result.success).toBe(true);
    expect(result.data.preview).toBeDefined();

    const preview = result.data.preview as PreviewPayload;
    expect(preview.sectionsCount).toBe(5);
    expect(preview.sections.map((s) => s.sectionType)).toEqual([
      "hero",
      "benefits",
      "testimonials",
      "form",
      "footer",
    ]);

    // Check responsive viewport support
    expect(preview.viewportOptions).toContain("desktop");
    expect(preview.viewportOptions).toContain("tablet");
    expect(preview.viewportOptions).toContain("mobile");
    expect(preview.renderedHtml).toContain("tailwindcss.com");
    expect(preview.renderedHtml).toContain("Property Agents");
  });

  it("should execute natural language modifications to hero section ('more premium')", async () => {
    // 1. Generate base page
    await agent.execute({
      messageId: "msg-1",
      executionId: "exec-1",
      sender: "elmo-orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build landing page",
      context: { organizationId: orgId },
      input: {},
      timestamp: Date.now(),
    });

    // 2. Command: Make the hero section more premium
    const editRes = await agent.execute({
      messageId: "msg-2",
      executionId: "exec-2",
      sender: "elmo-orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Make the hero section more premium",
      context: { organizationId: orgId },
      input: {},
      timestamp: Date.now(),
    });

    expect(editRes.success).toBe(true);
    expect(editRes.summary).toContain("Upgraded hero section to premium typography");

    const project = agent.getLatestProject(orgId);
    const hero = project?.pages[0].sections.find((s) => s.sectionType === "hero");
    expect(hero?.content.badge).toContain("Exclusive Enterprise");
    expect(hero?.content.headline).toContain("Visionary Leaders");
  });

  it("should execute CTA update command ('Change the CTA to Book a Consultation')", async () => {
    // Generate base
    await agent.execute({
      messageId: "msg-1",
      executionId: "exec-1",
      sender: "elmo-orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Create page",
      context: { organizationId: orgId },
      input: {},
      timestamp: Date.now(),
    });

    // Edit CTA
    const editRes = await agent.execute({
      messageId: "msg-2",
      executionId: "exec-2",
      sender: "elmo-orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Change the CTA to Book a Consultation",
      context: { organizationId: orgId },
      input: {},
      timestamp: Date.now(),
    });

    expect(editRes.success).toBe(true);
    const project = agent.getLatestProject(orgId);
    const hero = project?.pages[0].sections.find((s) => s.sectionType === "hero");
    expect(hero?.content.primaryCta?.label).toBe("Book a Consultation");
  });

  it("should manage version history and support project rollbacks", async () => {
    // Turn 1: Create
    await agent.execute({
      messageId: "msg-1",
      executionId: "exec-1",
      sender: "elmo-orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Create landing page",
      context: { organizationId: orgId },
      input: {},
      timestamp: Date.now(),
    });

    // Turn 2: Edit
    await agent.execute({
      messageId: "msg-2",
      executionId: "exec-2",
      sender: "elmo-orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Make the hero section more premium",
      context: { organizationId: orgId },
      input: {},
      timestamp: Date.now(),
    });

    const project = agent.getLatestProject(orgId)!;
    const versions = previewService.listVersions(project.id);
    expect(versions.length).toBe(2);
    expect(versions[0].versionNumber).toBe(1);
    expect(versions[1].versionNumber).toBe(2);

    // Rollback to version 1
    const rolledBack = previewService.rollbackVersion(project.id, 1);
    expect(rolledBack).toBeDefined();
    const v1Hero = rolledBack?.pages[0].sections.find((s) => s.sectionType === "hero");
    expect(v1Hero?.content.badge).not.toContain("Exclusive Enterprise");
  });
});
