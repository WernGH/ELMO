/**
 * ELMO Phase 3 — Web Application Builder Mode Test Suite
 */

import { describe, it, expect, beforeEach } from "vitest";
import { WebApplicationEngine } from "@/services/agentic/web-coding/web-application-engine.service";
import { WebPreviewService } from "@/services/agentic/web-coding/web-preview.service";
import { DesignIntelligenceEngine } from "@/services/agentic/web-coding/design-intelligence.service";
import { ProjectContext } from "@/services/agentic/types/agentic.types";

describe("Phase 3: WebApplicationEngine & Application Builder Mode", () => {
  let appEngine: WebApplicationEngine;
  let previewService: WebPreviewService;
  let designEngine: DesignIntelligenceEngine;

  const orgId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    appEngine = WebApplicationEngine.getInstance();
    previewService = WebPreviewService.getInstance();
    designEngine = DesignIntelligenceEngine.getInstance();
  });

  it("should generate a complete 10-step software specification for a CRM application", () => {
    const context: ProjectContext = {
      projectType: "CRM Interface",
      industry: "SaaS",
      businessType: "Software",
      businessName: "Nexus CRM",
      targetAudience: "Sales Teams & Account Executives",
      requiredFeatures: ["Lead Pipeline", "Contact Management", "Activity History"],
      brandStyle: "Technical",
      technicalRequirements: [],
      assumptions: [],
    };

    const spec = appEngine.generateSpecification(context);

    // 1. Requirements
    expect(spec.requirements.length).toBeGreaterThanOrEqual(3);
    // 2. User Roles
    expect(spec.userRoles.length).toBeGreaterThanOrEqual(3);
    expect(spec.userRoles.map((r) => r.role)).toContain("Organization Owner / Admin");
    // 3. User Flows
    expect(spec.userFlows.length).toBeGreaterThanOrEqual(2);
    // 4. Data Model Requirements
    expect(spec.dataModelRequirements.length).toBeGreaterThanOrEqual(2);
    expect(spec.dataModelRequirements[0].fields.some((f) => f.name === "organization_id")).toBe(true);
    // 5. Pages & Screens
    expect(spec.screens.length).toBeGreaterThanOrEqual(4);
    // 6. Components
    expect(spec.components.length).toBeGreaterThanOrEqual(4);
    // 7. API Requirements
    expect(spec.apiRequirements.length).toBeGreaterThanOrEqual(4);
    // 8. Permissions
    expect(spec.permissions.length).toBeGreaterThanOrEqual(2);
    // 9. Validation Rules
    expect(spec.validationRules.length).toBeGreaterThanOrEqual(3);
    // 10. Testing Plan
    expect(spec.testingPlan.length).toBeGreaterThanOrEqual(3);
  });

  it("should compile an interactive application preview with KPI cards, searchable data grid, and sidebar nav", () => {
    const context: ProjectContext = {
      projectType: "Dashboard",
      industry: "Finance",
      businessType: "Financial Services",
      businessName: "Alpha Capital Analytics",
      targetAudience: "Portfolio Managers",
      requiredFeatures: ["KPIs", "Data Table"],
      brandStyle: "Corporate",
      technicalRequirements: [],
      assumptions: [],
    };

    const styles = designEngine.generateDesignSystem("Corporate", "Finance").styles;
    const project = appEngine.buildApplicationProject("app-test-1", orgId, context, styles);

    expect(project.pages.length).toBe(1);
    const page = project.pages[0];
    expect(page.sections.length).toBe(1);

    const preview = previewService.generatePreview(page, styles);
    expect(preview.renderedHtml).toContain("Alpha Capital Analytics");
    expect(preview.renderedHtml).toContain("Total Records");
    expect(preview.renderedHtml).toContain("Active Pipeline");
    expect(preview.renderedHtml).toContain("Search by name, email, or record ID");
    expect(preview.renderedHtml).toContain("Multi-Tenant Protected");
    expect(preview.viewportOptions).toContain("desktop");
    expect(preview.viewportOptions).toContain("mobile");
  });
});
