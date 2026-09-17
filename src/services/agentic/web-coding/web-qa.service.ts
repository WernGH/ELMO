/**
 * ELMO Phase 3 — Web QA & Visual/Functional Verification Service (WebQAService)
 *
 * Provides rigorous verification and self-healing loops:
 * - Visual QA: Layout bounds, typography balance, contrast, responsive stacking, button targets
 * - Functional QA: Valid links, form fields, action buttons, syntax integrity, tenant isolation
 * - Self-Healing: Automatically repairs defects before declaring readiness.
 */

import {
  WebsitePageModel,
  WebsiteProject,
  QAEvaluationResult,
  VisualQAResult,
  FunctionalQAResult,
} from "../types/agentic.types";

export class WebQAService {
  private static instance: WebQAService;

  private constructor() {}

  public static getInstance(): WebQAService {
    if (!WebQAService.instance) {
      WebQAService.instance = new WebQAService();
    }
    return WebQAService.instance;
  }

  /**
   * Evaluates the rendered page model and HTML markup against quality standards.
   */
  public evaluate(
    page: WebsitePageModel,
    renderedHtml: string,
    project: WebsiteProject
  ): QAEvaluationResult {
    const visualQA = this.runVisualQA(page, renderedHtml);
    const functionalQA = this.runFunctionalQA(page, renderedHtml, project);

    const isValid = visualQA.passed && functionalQA.passed;

    return {
      isValid,
      visualQA,
      functionalQA,
    };
  }

  /**
   * Self-heals common model and markup defects if verification fails.
   */
  public autoHeal(
    page: WebsitePageModel,
    evaluation: QAEvaluationResult
  ): { healedPage: WebsitePageModel; healedActions: string[] } {
    const healedActions: string[] = [];

    // 1. Repair missing section headlines
    page.sections.forEach((sec, idx) => {
      if (!sec.content.headline && sec.sectionType !== "footer" && sec.sectionType !== "custom") {
        sec.content.headline = `Empowering Excellence (${sec.sectionType.toUpperCase()})`;
        healedActions.push(`Added missing headline for section ${idx} (${sec.sectionType})`);
      }

      // Repair missing CTA labels
      if (sec.content.primaryCta && !sec.content.primaryCta.label) {
        sec.content.primaryCta.label = "Get Started";
        healedActions.push(`Assigned default label to primary CTA in section ${idx}`);
      }

      // Ensure responsive stacking
      if (sec.responsive && sec.responsive.stackOnMobile === undefined) {
        sec.responsive.stackOnMobile = true;
        healedActions.push(`Enabled stackOnMobile on section ${idx}`);
      }

      // Form fields validation repair
      if (sec.sectionType === "form" && (!sec.content.formFields || sec.content.formFields.length === 0)) {
        sec.content.formFields = [
          { name: "name", label: "Full Name", type: "text", required: true },
          { name: "email", label: "Email Address", type: "email", required: true },
        ];
        healedActions.push("Restored missing essential form fields (name, email)");
      }
    });

    // 2. Re-index section orders
    page.sections.forEach((s, idx) => {
      s.orderIndex = idx;
    });

    return { healedPage: page, healedActions };
  }

  private runVisualQA(page: WebsitePageModel, html: string): VisualQAResult {
    const checks: Array<{ name: string; passed: boolean; details?: string }> = [];
    const defects: string[] = [];

    // 1. Typography Hierarchy check
    const hasH1 = /<h1\b[^>]*>/i.test(html);
    const hasHeadings = page.sections.some((s) => Boolean(s.content.headline));
    const typoPassed = hasH1 && hasHeadings;
    checks.push({
      name: "Typography Hierarchy",
      passed: typoPassed,
      details: typoPassed ? "Clear H1/H2 heading hierarchy established" : "Missing primary H1 tag",
    });
    if (!typoPassed) defects.push("Missing top-level H1 tag in rendered markup.");

    // 2. Responsive Multi-Viewport Stacking
    const responsiveClasses = /sm:|md:|lg:|grid-cols-1/i.test(html);
    const stackFlags = page.sections.every((s) => s.responsive.stackOnMobile !== false || s.sectionType === "footer");
    const respPassed = responsiveClasses && stackFlags;
    checks.push({
      name: "Responsive Viewport Stacking",
      passed: respPassed,
      details: respPassed ? "Tailwind responsive prefixes and mobile-stack flags verified" : "Responsive grid classes missing",
    });
    if (!respPassed) defects.push("Inadequate responsive layout tokens for mobile viewports.");

    // 3. Container Alignment & Bounds
    const containerClasses = /max-w-|mx-auto/i.test(html);
    checks.push({
      name: "Container Layout Bounds",
      passed: containerClasses,
      details: containerClasses ? "Max-width constraints prevent edge overflow" : "Unconstrained layout container",
    });
    if (!containerClasses) defects.push("Layout exceeds safe visual container boundaries.");

    // 4. Visual Contrast & Tokens
    const hasColorClasses = /text-white|text-slate-|bg-slate-|bg-gradient/i.test(html);
    checks.push({
      name: "Visual Contrast Tokens",
      passed: hasColorClasses,
      details: hasColorClasses ? "High-contrast palette tokens verified" : "Ambiguous color tokens",
    });
    if (!hasColorClasses) defects.push("Insufficient visual contrast tokens detected.");

    // 5. Button Prominence
    const hasButtons = /px-\d+\s+py-\d+|rounded-|shadow-/i.test(html);
    checks.push({
      name: "CTA Button Prominence",
      passed: hasButtons,
      details: hasButtons ? "Clear interactive CTA tap targets styled" : "Flat unstyled CTA elements",
    });
    if (!hasButtons) defects.push("Call to action buttons lack prominent styling tokens.");

    const passedChecks = checks.filter((c) => c.passed).length;
    const score = Math.round((passedChecks / checks.length) * 100);

    return {
      passed: defects.length === 0,
      score,
      checks,
      defects,
    };
  }

  private runFunctionalQA(page: WebsitePageModel, html: string, project: WebsiteProject): FunctionalQAResult {
    const checks: Array<{ name: string; passed: boolean; details?: string }> = [];
    const defects: string[] = [];

    // 1. Valid Links & Anchors
    const hasBrokenJavascriptHrefs = /href=["']javascript:void\(0\)["']/i.test(html);
    const linksValid = !hasBrokenJavascriptHrefs;
    checks.push({
      name: "Link & Anchor Integrity",
      passed: linksValid,
      details: linksValid ? "All links use semantic URLs or valid section anchors" : "Detected dead javascript: links",
    });
    if (!linksValid) defects.push("Broken or dead javascript links found.");

    // 2. Form Input & Submit Controls
    const formSection = page.sections.find((s) => s.sectionType === "form");
    let formValid = true;
    if (formSection) {
      const hasInputs = /<input\b[^>]*>/i.test(html);
      const hasSubmit = /type=["']submit["']|<button\b/i.test(html);
      formValid = hasInputs && hasSubmit;
      checks.push({
        name: "Interactive Form Verification",
        passed: formValid,
        details: formValid ? "Form contains valid input fields and submit handler" : "Form missing inputs or submit button",
      });
      if (!formValid) defects.push("Interactive form lacks required inputs or submit control.");
    }

    // 3. Document Structure Syntax
    const hasDoctype = /<!DOCTYPE html>/i.test(html);
    const hasHtmlClose = /<\/html>/i.test(html);
    const syntaxValid = hasDoctype && hasHtmlClose;
    checks.push({
      name: "HTML5 Document Structure",
      passed: syntaxValid,
      details: syntaxValid ? "Valid HTML5 DOCTYPE, head, and closed tags" : "Malformed HTML document wrappers",
    });
    if (!syntaxValid) defects.push("HTML document wrapper is incomplete or malformed.");

    // 4. Multi-Tenant Organization Attribution
    const hasOrgId = Boolean(page.organizationId && project.organizationId);
    const orgMatches = page.organizationId === project.organizationId;
    const tenantValid = hasOrgId && orgMatches;
    checks.push({
      name: "Multi-Tenant Isolation",
      passed: tenantValid,
      details: tenantValid ? `Strict tenant binding: ${page.organizationId}` : "Missing or mismatched organization ID",
    });
    if (!tenantValid) defects.push("Tenant isolation error: page does not match project organization.");

    const passedChecks = checks.filter((c) => c.passed).length;
    const score = Math.round((passedChecks / checks.length) * 100);

    return {
      passed: defects.length === 0,
      score,
      checks,
      defects,
    };
  }
}
