/**
 * ELMO Phase 3 — Web Coding Tools Security & Multi-Tenancy Test Suite
 */

import { describe, it, expect, beforeEach } from "vitest";
import { WebCodingToolsService } from "@/services/agentic/web-coding/web-coding-tools.service";

describe("Phase 3: WebCodingToolsService Security & Tenant Isolation", () => {
  let tools: WebCodingToolsService;
  const orgA = "org-corp-alpha-111";
  const orgB = "org-corp-beta-222";

  beforeEach(() => {
    tools = WebCodingToolsService.getInstance();
    tools.reset();
  });

  it("should create, read, and list virtual project files within an organization", async () => {
    const createRes = await tools.fileCreate(
      orgA,
      "components/Hero.tsx",
      "export const Hero = () => <h1>Welcome</h1>;"
    );
    expect(createRes.success).toBe(true);
    expect(createRes.data?.path).toBe("components/Hero.tsx");

    const readRes = await tools.fileRead(orgA, "components/Hero.tsx");
    expect(readRes.success).toBe(true);
    expect(readRes.data?.content).toContain("export const Hero");

    const listRes = await tools.directoryList(orgA);
    expect(listRes.data).toContain("components/Hero.tsx");
  });

  it("should strictly enforce tenant isolation (Org B cannot access Org A files)", async () => {
    // Org A creates a file
    await tools.fileCreate(orgA, "secrets/strategy.md", "Secret strategy Alpha");

    // Org B attempts to read Org A's file
    const crossTenantRead = await tools.fileRead(orgB, "secrets/strategy.md");
    expect(crossTenantRead.success).toBe(false);
    expect(crossTenantRead.error).toContain("File not found");

    // Org B's directory list must not expose Org A's files
    const orgBList = await tools.directoryList(orgB);
    expect(orgBList.data?.includes("secrets/strategy.md")).toBe(false);
  });

  it("should reject path traversal attempts (../, absolute paths, .env)", async () => {
    const traversalAttempts = [
      "../outside.txt",
      "../../etc/passwd",
      "C:\\Windows\\System32\\cmd.exe",
      "/root/.ssh/id_rsa",
      ".env",
      "subfolder/../../../secrets.json",
      "node_modules/package.json",
    ];

    for (const badPath of traversalAttempts) {
      const res = await tools.fileCreate(orgA, badPath, "malicious content");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Security Violation");
    }
  });

  it("should validate code and reject dangerous scripting or unconstrained eval", () => {
    const safeCode = `
      <section className="py-12 bg-slate-900 text-white">
        <h2>Clean Component</h2>
      </section>
    `;
    const safeValidation = tools.validateCode(safeCode);
    expect(safeValidation.isValid).toBe(true);
    expect(safeValidation.errors.length).toBe(0);

    const dangerousCode = `
      <section>
        <script>eval("alert('xss')");</script>
      </section>
    `;
    const dangerousValidation = tools.validateCode(dangerousCode);
    expect(dangerousValidation.isValid).toBe(false);
    expect(dangerousValidation.errors[0]).toContain("Security Check Failed");
  });
});
