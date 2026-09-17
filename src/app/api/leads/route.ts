import { NextRequest, NextResponse } from "next/server";
import { PageService } from "@/services/page.service";
import { ContactService } from "@/services/contact.service";
import { ActivityService } from "@/services/activity.service";
import { AutomationService } from "@/services/automation.service";
import { WebCodingAgentService } from "@/services/agentic/web-coding/web-coding-agent.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, firstName: rawFirstName, lastName: rawLastName, email, phone, landingPageSlug, pageId, campaign, source, customFields, consent } = body;

    // 1. Validation & Sanitization
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "A valid email address is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    let firstName = rawFirstName;
    let lastName = rawLastName;

    if (!firstName && name && typeof name === "string") {
      const parts = name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || undefined;
    }

    // 2. Server-Side Tenant Resolution (Security: Never trust client-supplied organizationId)
    let organizationId: string | null = null;
    let resolvedPageTitle = "Landing Page";
    let resolvedPageId = pageId;

    const pageService = PageService.getInstance();

    if (landingPageSlug) {
      const { page: foundPage, organizationId: pageOrgId } = await pageService.getPublicPageBySlug(landingPageSlug);
      if (foundPage && pageOrgId) {
        organizationId = pageOrgId;
        resolvedPageTitle = foundPage.name || foundPage.title || resolvedPageTitle;
        resolvedPageId = foundPage.id;
      }
    }

    // Fallback: Check WebCodingAgent projects store if not in pages table
    if (!organizationId) {
      const webAgent = WebCodingAgentService.getInstance();
      const allProjects = [
        webAgent.getLatestProject("11111111-1111-1111-1111-111111111111"),
        webAgent.getLatestProject("org-test-dev-001"),
      ].filter(Boolean);

      for (const prj of allProjects) {
        const foundPage = prj?.pages.find((p) => p.slug === landingPageSlug || p.id === pageId);
        if (foundPage && prj?.organizationId) {
          organizationId = prj.organizationId;
          resolvedPageTitle = foundPage.name;
          resolvedPageId = foundPage.id;
          break;
        }
      }
    }

    // If still unresolved, default to standard development organization for testing
    if (!organizationId) {
      organizationId = "11111111-1111-1111-1111-111111111111";
    }

    // 3. Create or update Contact in Supabase / MockDataStore
    const contactService = ContactService.getInstance();
    const contactRes = await contactService.findOrCreateContact({
      userId: "system-lead-capture",
      organizationId,
      email: cleanEmail,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: phone || undefined,
      source: source || "landing_page",
      tags: ["lead-captured", resolvedPageTitle],
      customFields: {
        ...(customFields || {}),
        campaign: campaign || "organic",
        consent: consent !== false,
        landingPageSlug: landingPageSlug || null,
        capturedAt: new Date().toISOString(),
      },
    });

    if (!contactRes.data) {
      return NextResponse.json({ success: false, error: contactRes.error || "Failed to create contact." }, { status: 500 });
    }

    const contact = contactRes.data;

    // 4. Record Contact Journey Event
    try {
      await contactService.recordEvent({
        userId: "system-lead-capture",
        organizationId,
        contactId: contact.id,
        eventType: "lead_form_submitted",
        pageId: resolvedPageId,
        metadata: {
          landingPageSlug,
          campaign,
          source: source || "landing_page",
        },
      });
    } catch {
      // Non-blocking
    }

    // 5. Trigger Configured Automation Sequence (if any)
    try {
      const automationService = AutomationService.getInstance();
      const automations = await automationService.getAutomations("system-lead-capture", organizationId);
      const matching = automations.data?.find((a) => a.status === "active");
      if (matching) {
        // Record automation triggered activity
        const activityService = ActivityService.getInstance();
        await activityService.recordActivity({
          organizationId,
          type: "automation_triggered",
          actorName: "System Automation",
          actorType: "SYSTEM",
          description: `Automation "${matching.name}" triggered for lead ${cleanEmail}`,
          metadata: {
            automationId: matching.id,
            contactId: contact.id,
            email: cleanEmail,
            pageId: resolvedPageId,
          },
        });
      }
    } catch {
      // Non-blocking
    }

    // 6. Record Organization Activity Timeline
    try {
      const activityService = ActivityService.getInstance();
      await activityService.recordActivity({
        organizationId,
        type: "lead_captured",
        actorName: firstName ? `${firstName} ${lastName || ""}`.trim() : cleanEmail,
        actorType: "VISITOR",
        description: `New lead captured from page "${resolvedPageTitle}": ${cleanEmail}`,
        metadata: {
          contactId: contact.id,
          pageId: resolvedPageId,
          email: cleanEmail,
          source: source || "landing_page",
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      contactId: contact.id,
      organizationId,
      message: "Lead captured successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
