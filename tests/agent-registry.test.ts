/**
 * ELMO Phase 3 — Agent Registry Test Suite
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { AgentDefinition } from "@/services/agentic/types/agentic.types";

describe("Phase 3: AgentRegistryService", () => {
  let registry: AgentRegistryService;

  beforeEach(() => {
    registry = AgentRegistryService.getInstance();
    registry.reset();
  });

  it("should initialize the 6 canonical Phase 3 foundational agents", () => {
    const agents = registry.listAgents();
    expect(agents.length).toBeGreaterThanOrEqual(6);

    const ids = agents.map((a) => a.id);
    expect(ids).toContain("research-agent");
    expect(ids).toContain("marketing-agent");
    expect(ids).toContain("copy-agent");
    expect(ids).toContain("funnel-agent");
    expect(ids).toContain("web-coding-agent");
    expect(ids).toContain("analytics-agent");
  });

  it("should retrieve specific agent by ID with complete capabilities", () => {
    const webAgent = registry.getAgent("web-coding-agent");
    expect(webAgent).toBeDefined();
    expect(webAgent?.role).toBe("WEB_CODING");
    expect(webAgent?.enabled).toBe(true);
    expect(webAgent?.capabilities).toContain("landing_page_generation");
    expect(webAgent?.capabilities).toContain("responsive_design");
    expect(webAgent?.capabilities).toContain("preview_generation");
  });

  it("should allow dynamic registration of custom worker agents", () => {
    const customAgent: AgentDefinition = {
      id: "seo-specialist",
      name: "SEO Specialist Agent",
      description: "Optimizes meta tags, schema markup, and keyword density.",
      role: "MARKETING",
      capabilities: ["keyword_audit", "meta_generation"],
      allowedTools: ["analyze_seo", "update_meta"],
      permissions: ["read:page", "write:page"],
      systemInstructions: "You are the SEO Specialist.",
      enabled: true,
      version: "1.0.0",
      priority: 70,
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 10000,
        maxRetries: 1,
      },
    };

    registry.registerAgent(customAgent);
    const retrieved = registry.getAgent("seo-specialist");
    expect(retrieved?.name).toBe("SEO Specialist Agent");
  });

  it("should toggle enabled/disabled status and enforce tool permission checks", () => {
    expect(registry.isToolAllowed("web-coding-agent", "CREATE_PAGE")).toBe(true);
    expect(registry.isToolAllowed("web-coding-agent", "UNAUTHORIZED_ROOT_EXEC")).toBe(false);

    // Disable agent
    registry.setAgentEnabled("web-coding-agent", false);
    const disabledAgent = registry.getAgent("web-coding-agent");
    expect(disabledAgent?.enabled).toBe(false);

    // Once disabled, tool calls must be rejected
    expect(registry.isToolAllowed("web-coding-agent", "CREATE_PAGE")).toBe(false);
  });

  it("should filter agents by role and enabled status", () => {
    const marketingAgents = registry.listAgents({ role: "MARKETING" });
    expect(marketingAgents.length).toBeGreaterThanOrEqual(1);
    expect(marketingAgents[0].id).toBe("marketing-agent");

    registry.setAgentEnabled("research-agent", false);
    const enabledAgents = registry.listAgents({ enabledOnly: true });
    expect(enabledAgents.some((a) => a.id === "research-agent")).toBe(false);
  });
});
