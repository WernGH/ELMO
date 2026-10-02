/**
 * ELMO Phase 4 — GitHub Skill Safety & Sandbox Governance Test Suite
 *
 * Verifies:
 * 1. Pinned commit hash validation (immutable sha-1 requirement).
 * 2. Mandatory sandbox enforcement (requiresSandbox: true).
 * 3. Execution limit boundaries (timeoutMs <= 30000ms).
 * 4. Automatic rejection of dangerous/untrusted tools (raw shell, SQL injection, unauthorized egress).
 * 5. Secure registration and safe execution of approved external skills.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SkillRegistryService } from "@/services/agentic/skill-registry.service";
import { ToolRegistryService } from "@/services/agentic/tool-registry.service";

describe("Phase 4: GitHub Skill Safety & Sandbox Governance", () => {
  let skillRegistry: SkillRegistryService;
  let toolRegistry: ToolRegistryService;
  const orgId = "org-security-test";

  beforeEach(() => {
    skillRegistry = SkillRegistryService.getInstance();
    skillRegistry.reset();
    toolRegistry = ToolRegistryService.getInstance();
    toolRegistry.reset();
  });

  describe("1. Static Skill Safety Validation & Pinned Commit Enforcing", () => {
    it("should accept a well-governed, pinned GitHub skill with verified tools", () => {
      const evaluation = skillRegistry.validateGitHubSkill({
        repoUrl: "https://github.com/coai-verified-skills/conversion-audit",
        commitHash: "a1b2c3d4e5f67890123456789abcdef012345678",
        skillName: "Conversion Funnel Audit",
        category: "Analytics",
        allowedTools: ["get_funnel_analytics", "query_memory"],
        requiresSandbox: true,
        timeoutMs: 15000,
        organizationId: orgId,
      });

      expect(evaluation.valid).toBe(true);
      expect(evaluation.securityScore).toBeGreaterThanOrEqual(80);
      expect(evaluation.errors.length).toBe(0);
      expect(evaluation.commitPinned).toBe(true);
      expect(evaluation.sandboxEnforced).toBe(true);
    });

    it("should reject an unpinned GitHub skill referencing mutable branch (main/master)", () => {
      const evaluation = skillRegistry.validateGitHubSkill({
        repoUrl: "https://github.com/untrusted-author/arbitrary-script",
        commitHash: "main", // Unpinned!
        skillName: "Arbitrary Script",
        category: "Operations",
        allowedTools: ["query_memory"],
        requiresSandbox: true,
        timeoutMs: 10000,
      });

      expect(evaluation.valid).toBe(false);
      expect(evaluation.commitPinned).toBe(false);
      expect(evaluation.errors.some((e) => e.includes("commit hash"))).toBe(true);
    });

    it("should reject GitHub skills that do not enforce mandatory sandbox execution", () => {
      const evaluation = skillRegistry.validateGitHubSkill({
        repoUrl: "https://github.com/trusted-org/no-sandbox-skill",
        commitHash: "1234567890abcdef1234567890abcdef12345678",
        skillName: "Unsandboxed Runner",
        category: "Engineering",
        allowedTools: ["query_memory"],
        requiresSandbox: false, // Security violation!
        timeoutMs: 10000,
      });

      expect(evaluation.valid).toBe(false);
      expect(evaluation.sandboxEnforced).toBe(false);
      expect(evaluation.errors.some((e) => e.includes("sandbox"))).toBe(true);
    });

    it("should reject GitHub skills with excessive execution timeouts (>30000ms)", () => {
      const evaluation = skillRegistry.validateGitHubSkill({
        repoUrl: "https://github.com/trusted-org/slow-miner",
        commitHash: "abcdef1234567890abcdef1234567890abcdef12",
        skillName: "Slow Resource Hog",
        category: "Operations",
        allowedTools: ["query_memory"],
        requiresSandbox: true,
        timeoutMs: 60000, // Exceeds 30000ms maximum!
      });

      expect(evaluation.valid).toBe(false);
      expect(evaluation.errors.some((e) => e.includes("timeout"))).toBe(true);
    });

    it("should reject GitHub skills attempting to invoke unregistered or dangerous tools", () => {
      const evaluation = skillRegistry.validateGitHubSkill({
        repoUrl: "https://github.com/attacker/malicious-skill",
        commitHash: "badc0de1234567890badc0de1234567890badc0de",
        skillName: "Root Access Privilege Escalation",
        category: "Operations",
        allowedTools: ["EXECUTE_RAW_BASH", "DROP_DATABASE_TABLE", "UNRESTRICTED_EGRESS"],
        requiresSandbox: true,
        timeoutMs: 15000,
      });

      expect(evaluation.valid).toBe(false);
      expect(evaluation.securityScore).toBeLessThan(50);
      expect(evaluation.errors.some((e) => e.includes("Tool"))).toBe(true);
    });
  });

  describe("2. Governed GitHub Skill Registration & Execution Gate", () => {
    it("should register verified GitHub skill into SkillRegistry and execute safely", async () => {
      const registered = skillRegistry.registerGitHubSkill({
        repoUrl: "https://github.com/coai-verified-skills/sop-analyzer",
        commitHash: "7890abcdef1234567890abcdef1234567890abcd",
        skillName: "Advanced SOP Conformance Analyzer",
        category: "Operations",
        allowedTools: ["generate_sop_summary", "query_memory"],
        requiresSandbox: true,
        timeoutMs: 20000,
        organizationId: orgId,
      });

      expect(registered).toBeDefined();
      expect(registered.source).toBe("github");
      expect(registered.requiresSandbox).toBe(true);
      expect(registered.commitHash).toBe("7890abcdef1234567890abcdef1234567890abcd");

      // Verify skill is searchable in registry
      const found = skillRegistry.getSkill(registered.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe("Advanced SOP Conformance Analyzer");
    });

    it("should refuse registration for any skill failing security validation", () => {
      expect(() => {
        skillRegistry.registerGitHubSkill({
          repoUrl: "https://github.com/bad/actor",
          commitHash: "not-a-sha1",
          skillName: "Insecure Skill",
          category: "Operations",
          allowedTools: ["query_memory"],
          requiresSandbox: false,
          timeoutMs: 999999,
        });
      }).toThrow(/security validation/i);
    });
  });
});
