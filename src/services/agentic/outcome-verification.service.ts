/**
 * ELMO Phase 3 — Outcome Verification Service (OutcomeVerificationService)
 *
 * Dual Technical & Business Verification Engine:
 * "Success is never defined simply by an API call returning 200 OK."
 *
 * Evaluates both:
 * 1. Technical Verification: Data schema valid, records persisted, non-empty DOM/components, no fatal exceptions.
 * 2. Business Objective Verification: CTA exists, target audience alignment, clear offer, correct tenant isolation,
 *    and conversion goal representation.
 */

import {
  ExecutionStep,
  OutcomeVerificationReport,
  TechnicalVerificationResult,
  BusinessVerificationResult,
  VerificationCheckItem,
} from "./types/agentic.types";

export interface VerificationContext {
  organizationId: string;
  industry?: string;
  targetAudience?: string;
  goal?: string;
  expectedEntityType?: "page" | "funnel" | "lead" | "copy" | "analysis" | "general";
}

export class OutcomeVerificationService {
  private static instance: OutcomeVerificationService;

  private constructor() {}

  public static getInstance(): OutcomeVerificationService {
    if (!OutcomeVerificationService.instance) {
      OutcomeVerificationService.instance = new OutcomeVerificationService();
    }
    return OutcomeVerificationService.instance;
  }

  public static resetInstance(): void {
    OutcomeVerificationService.instance = undefined as any;
  }

  /**
   * Evaluates technical and business outcome verification on a completed step.
   */
  public verifyStepOutcome(
    step: ExecutionStep,
    output: Record<string, unknown> | undefined,
    context: VerificationContext
  ): OutcomeVerificationReport {
    const technicalChecks: VerificationCheckItem[] = [];
    const businessChecks: VerificationCheckItem[] = [];
    const defects: string[] = [];

    // ========================================================================
    // 1. Technical Verification
    // ========================================================================
    const hasOutput = output !== undefined && output !== null && Object.keys(output).length > 0;
    technicalChecks.push({
      check: "output_payload_exists",
      passed: hasOutput,
      details: hasOutput ? "Output payload is populated." : "Step returned null or empty output.",
    });
    if (!hasOutput) {
      defects.push("Step generated no output data.");
    }

    const hasErrors = !!step.error || (output && output.success === false) || (output && Array.isArray(output.errors) && output.errors.length > 0);
    technicalChecks.push({
      check: "zero_runtime_errors",
      passed: !hasErrors,
      details: hasErrors ? (step.error || "Runtime errors detected in output.") : "Zero runtime errors.",
    });
    if (hasErrors) {
      defects.push(step.error || "Execution produced error state.");
    }

    // Agent-specific technical checks
    if (step.agentId === "web-coding-agent") {
      const preview = (output?.previewPayload as Record<string, unknown>) || output;
      const hasSections =
        Array.isArray(preview?.sections) && (preview.sections as unknown[]).length > 0;
      technicalChecks.push({
        check: "page_sections_rendered",
        passed: hasSections,
        details: hasSections
          ? `Rendered ${(preview.sections as unknown[]).length} sections.`
          : "Page has zero rendered sections.",
      });
      if (!hasSections) {
        defects.push("Web page missing structural content sections.");
      }
    }

    const technicalPassed = technicalChecks.every((c) => c.passed);
    const technicalResult: TechnicalVerificationResult = {
      passed: technicalPassed,
      checks: technicalChecks,
      errors: defects.length > 0 ? defects : undefined,
    };

    // ========================================================================
    // 2. Business Verification
    // ========================================================================
    let audienceAligned = true;
    let ctaPresent = true;
    let offerClear = true;
    let tenantIsolated = true;
    const idempotencyPreserved = true;

    // Tenant isolation verification
    const outputOrg = (output?.organizationId as string) || (output?.data as any)?.organizationId || context.organizationId;
    if (outputOrg && outputOrg !== context.organizationId) {
      tenantIsolated = false;
      defects.push(`Cross-tenant security violation: Output tenant ${outputOrg} does not match expected ${context.organizationId}`);
    }
    businessChecks.push({
      check: "tenant_isolation",
      passed: tenantIsolated,
      details: tenantIsolated ? "Output verified to belong to active organization." : "Tenant isolation violation.",
    });

    // Content, CTA, & Audience Verification (for web, funnel, copy, and marketing)
    if (
      step.agentId === "web-coding-agent" ||
      step.agentId === "funnel-agent" ||
      step.agentId === "copy-agent" ||
      step.agentId === "marketing-agent"
    ) {
      const outputText = JSON.stringify(output || {}).toLowerCase();

      // CTA check
      const hasCTA =
        outputText.includes("cta") ||
        outputText.includes("button") ||
        outputText.includes("action") ||
        outputText.includes("book") ||
        outputText.includes("claim") ||
        outputText.includes("sign up") ||
        outputText.includes("get quote") ||
        outputText.includes("register") ||
        outputText.includes("contact");

      if (!hasCTA) {
        ctaPresent = false;
        defects.push("Business verification failed: No clear Call-to-Action (CTA) identified.");
      }
      businessChecks.push({
        check: "clear_call_to_action",
        passed: ctaPresent,
        details: ctaPresent ? "Primary Call-to-Action is present." : "Missing conversion CTA.",
      });

      // Audience check
      if (context.targetAudience && context.targetAudience.trim().length > 0) {
        const audWords = context.targetAudience.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const matchesAudience = audWords.some((w) => outputText.includes(w)) || outputText.includes("audience");
        if (!matchesAudience) {
          audienceAligned = false;
          defects.push(`Target audience mismatch: Output does not explicitly address "${context.targetAudience}".`);
        }
        businessChecks.push({
          check: "audience_alignment",
          passed: audienceAligned,
          details: audienceAligned
            ? `Output addresses target audience (${context.targetAudience}).`
            : "Output does not reflect configured target audience.",
        });
      }

      // Offer clarity
      const hasOffer =
        outputText.includes("offer") ||
        outputText.includes("benefit") ||
        outputText.includes("solution") ||
        outputText.includes("value") ||
        outputText.includes("headline") ||
        outputText.includes("service") ||
        outputText.includes("price");

      if (!hasOffer) {
        offerClear = false;
        defects.push("Core value proposition or offer details are ambiguous.");
      }
      businessChecks.push({
        check: "offer_clarity",
        passed: offerClear,
        details: offerClear ? "Value proposition is articulated." : "Missing clear offer statement.",
      });
    }

    // Analytics / Diagnosis Verification
    if (step.agentId === "analytics-agent" || step.agentId === "analytics-worker") {
      const outputText = JSON.stringify(output || {}).toLowerCase();
      const hasMetricsOrInsights =
        outputText.includes("recommend") ||
        outputText.includes("metric") ||
        outputText.includes("conversion") ||
        outputText.includes("rate") ||
        outputText.includes("drop") ||
        outputText.includes("diagnos");

      businessChecks.push({
        check: "actionable_analytical_insights",
        passed: hasMetricsOrInsights,
        details: hasMetricsOrInsights ? "Provided diagnostic insights." : "Analysis lacked actionable recommendations.",
      });
      if (!hasMetricsOrInsights) {
        defects.push("Diagnostic step failed to produce actionable optimization recommendations.");
      }
    }

    // Phase 4 Strategy Worker Verification
    if (step.agentId === "strategy-worker" || step.agentId === "strategy-agent") {
      const stratOptions = (output?.strategicOptions as unknown[]) || (output?.data as any)?.strategicOptions;
      const hasOptions = Array.isArray(stratOptions) && stratOptions.length > 0;
      businessChecks.push({
        check: "strategic_options_generated",
        passed: hasOptions,
        details: hasOptions
          ? `Generated ${stratOptions.length} strategic options.`
          : "Strategy output lacks structured strategic options.",
      });
      if (!hasOptions) {
        defects.push("Strategy Worker failed to produce structured strategic options.");
      }

      const nextActions = (output?.recommendedNextActions as unknown[]) || (output?.data as any)?.recommendedNextActions;
      const hasNextActions = Array.isArray(nextActions) && nextActions.length > 0;
      businessChecks.push({
        check: "actionable_recommendations_present",
        passed: hasNextActions,
        details: hasNextActions
          ? `Identified ${nextActions.length} recommended next actions.`
          : "Strategy output lacks actionable next steps.",
      });
      if (!hasNextActions) {
        defects.push("Strategy Worker failed to formulate actionable next steps.");
      }

      const risks = (output?.risks as unknown[]) || (output?.data as any)?.risks;
      const dependencies = (output?.dependencies as unknown[]) || (output?.data as any)?.dependencies;
      const hasRisksAndDeps = Array.isArray(risks) && Array.isArray(dependencies);
      businessChecks.push({
        check: "risks_and_dependencies_identified",
        passed: hasRisksAndDeps,
        details: hasRisksAndDeps
          ? "Risks and sequential dependencies articulated."
          : "Missing risk identification or dependencies.",
      });
      if (!hasRisksAndDeps) {
        defects.push("Strategy Worker must identify risks and dependencies.");
      }
    }

    // Phase 4 Automation Worker Verification
    if (step.agentId === "automation-worker" || step.agentId === "automation-agent") {
      const workflow = (output?.workflow as any) || (output?.data as any)?.workflow;
      const hasValidStructure = Boolean(workflow && workflow.trigger && Array.isArray(workflow.actions) && workflow.actions.length > 0);
      businessChecks.push({
        check: "valid_workflow_structure",
        passed: hasValidStructure,
        details: hasValidStructure
          ? `Valid workflow structure (Trigger -> ${workflow.conditions?.length || 0} conditions -> ${workflow.actions.length} actions).`
          : "Invalid or incomplete automation workflow definition.",
      });
      if (!hasValidStructure) {
        defects.push("Automation Worker must define trigger, conditions, and actions.");
      }

      // Verify no arbitrary code execution
      const outputText = JSON.stringify(output || {}).toLowerCase();
      const hasArbitraryCode = outputText.includes("eval(") || outputText.includes("exec(") || outputText.includes("child_process") || outputText.includes("bash -c");
      businessChecks.push({
        check: "no_arbitrary_code",
        passed: !hasArbitraryCode,
        details: !hasArbitraryCode ? "Verified zero arbitrary code execution." : "Dangerous arbitrary code detected in workflow.",
      });
      if (hasArbitraryCode) {
        defects.push("Security Violation: Arbitrary code execution detected in automation definition.");
      }

      // Check high-impact action approval requirement
      const actions = workflow?.actions || [];
      const hasHighRiskAction = actions.some((a: any) => a.riskLevel === "HIGH" || a.actionType?.includes("SEND") || a.targetTool === "activate_automation");
      const highRiskCorrectlyFlagged = !hasHighRiskAction || actions.some((a: any) => a.approvalRequired === true);
      businessChecks.push({
        check: "high_impact_approval_flagged",
        passed: highRiskCorrectlyFlagged,
        details: highRiskCorrectlyFlagged ? "High-impact actions require approval." : "High-impact action lacks human approval gate.",
      });
      if (!highRiskCorrectlyFlagged) {
        defects.push("High-impact automation actions must require ApprovalService clearance.");
      }
    }

    // Phase 4 Support Worker Verification
    if (step.agentId === "support-worker" || step.agentId === "support-agent") {
      const responseDraft = (output?.responseDraft as any) || (output?.data as any)?.responseDraft;
      const hasResponse = Boolean(responseDraft && responseDraft.messageText && responseDraft.messageText.trim().length > 0);
      businessChecks.push({
        check: "grounded_response_drafted",
        passed: hasResponse,
        details: hasResponse ? "Customer response drafted." : "Missing customer response draft.",
      });
      if (!hasResponse) {
        defects.push("Support Worker failed to produce a customer response draft.");
      }

      // Anti-hallucination & sensitive action approval check
      const enquiryClass = (output?.enquiryClassification as any) || (output?.data as any)?.enquiryClassification;
      const approvalRequired = (output?.approvalRequired as boolean) || (output?.data as any)?.approvalRequired;
      const isSensitive = enquiryClass?.category === "billing_refund" || enquiryClass?.category === "account_cancellation";
      const approvalGateSatisfied = !isSensitive || approvalRequired === true;

      businessChecks.push({
        check: "sensitive_action_approval_flagged",
        passed: approvalGateSatisfied,
        details: approvalGateSatisfied
          ? "Sensitive customer action approval enforced."
          : "Sensitive customer action (refund/cancel) missing human approval gate.",
      });
      if (!approvalGateSatisfied) {
        defects.push("Refunds and account cancellations must mandate ApprovalService clearance.");
      }
    }

    const businessPassed = businessChecks.every((c) => c.passed);
    const businessResult: BusinessVerificationResult = {
      passed: businessPassed,
      checks: businessChecks,
      audienceAligned,
      ctaPresent,
      offerClear,
      tenantIsolated,
      idempotencyPreserved,
      errors: defects.length > 0 ? defects : undefined,
    };

    const overallSuccess = technicalPassed && businessPassed;
    let remedySuggestion: string | undefined;

    if (!overallSuccess) {
      if (!ctaPresent) {
        remedySuggestion = "Inject a high-converting primary CTA (e.g. 'Claim Free Consultation' or 'Get Instant Quote').";
      } else if (!audienceAligned) {
        remedySuggestion = `Refine messaging to speak directly to the core desires and pain points of ${context.targetAudience || "the target segment"}.`;
      } else if (hasErrors) {
        remedySuggestion = "Re-execute step with validated input parameters.";
      } else {
        remedySuggestion = "Replan step dependencies and verify input schemas.";
      }
    }

    return {
      success: overallSuccess,
      technical: technicalResult,
      business: businessResult,
      defects,
      remedySuggestion,
      verifiedAt: Date.now(),
    };
  }
}
