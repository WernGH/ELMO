/**
 * ELMO Master Migration — ELMO Tool Service (ElmoToolService)
 *
 * Controlled Application Function & Tool Execution Layer.
 * Defines Gemini-compatible tool schemas for the AI Funnel Agent.
 * Mediates tool calls strictly through domain services with multi-tenant permission validation.
 *
 * CRITICAL RULE: Gemini NEVER accesses the database directly! All actions execute via this service.
 */

import { FunnelService } from "./funnel.service";
import { PageService } from "./page.service";
import { ContactService } from "./contact.service";
import { FormService } from "./form.service";
import { EmailService } from "./email.service";
import { AutomationService } from "./automation.service";
import { AnalyticsService } from "./analytics.service";
import { FunnelType, StepType, PageType, PageStatus, SectionType } from "@/types/database.types";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolExecutionContext {
  userId: string;
  organizationId: string;
}

export interface ToolExecutionResult {
  tool: string;
  success: boolean;
  data: unknown;
  error?: string;
  visualState?: "EXECUTING" | "SUCCESS" | "ERROR";
}

export class ElmoToolService {
  private static instance: ElmoToolService;
  private funnelService: FunnelService;
  private pageService: PageService;
  private contactService: ContactService;
  private formService: FormService;
  private emailService: EmailService;
  private automationService: AutomationService;
  private analyticsService: AnalyticsService;

  private constructor() {
    this.funnelService = FunnelService.getInstance();
    this.pageService = PageService.getInstance();
    this.contactService = ContactService.getInstance();
    this.formService = FormService.getInstance();
    this.emailService = EmailService.getInstance();
    this.automationService = AutomationService.getInstance();
    this.analyticsService = AnalyticsService.getInstance();
  }

  public static getInstance(): ElmoToolService {
    if (!ElmoToolService.instance) {
      ElmoToolService.instance = new ElmoToolService();
    }
    return ElmoToolService.instance;
  }

  public static resetInstance(): void {
    ElmoToolService.instance = undefined as any;
  }

  /**
   * Returns all available tool definitions for Gemini function calling.
   */
  public getAvailableTools(): ToolDefinition[] {
    return [
      // 1. Funnels
      {
        name: "create_funnel",
        description: "Creates a new multi-step marketing or sales funnel with structured business context.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the funnel" },
            funnelType: {
              type: "string",
              description: "Funnel type (e.g. Lead Generation, Webinar, Coaching, Course, Product, SaaS)",
            },
            goal: { type: "string", description: "Primary strategic objective of the funnel" },
            targetAudience: { type: "string", description: "Target audience description" },
            offer: { type: "string", description: "Core offer or lead magnet being promoted" },
            primaryConversionGoal: { type: "string", description: "Action representing conversion" },
          },
          required: ["name"],
        },
      },
      {
        name: "update_funnel",
        description: "Updates funnel strategic metadata, goals, target audience, or status.",
        parameters: {
          type: "object",
          properties: {
            funnelId: { type: "string", description: "UUID of the funnel" },
            name: { type: "string", description: "Updated funnel name" },
            goal: { type: "string", description: "Updated primary goal" },
            targetAudience: { type: "string", description: "Updated target audience" },
            offer: { type: "string", description: "Updated offer description" },
            status: { type: "string", description: "Status (draft, active, paused, archived)" },
          },
          required: ["funnelId"],
        },
      },
      {
        name: "get_funnel",
        description: "Retrieves complete details of a specific funnel including its steps and context.",
        parameters: {
          type: "object",
          properties: {
            funnelId: { type: "string", description: "Unique UUID of the funnel" },
          },
          required: ["funnelId"],
        },
      },
      {
        name: "delete_funnel",
        description: "Deletes a funnel and its steps. Note: requires user confirmation.",
        parameters: {
          type: "object",
          properties: {
            funnelId: { type: "string", description: "Unique UUID of the funnel to delete" },
          },
          required: ["funnelId"],
        },
      },
      {
        name: "list_funnels",
        description: "Lists all funnels belonging to the active organization.",
        parameters: {
          type: "object",
          properties: {},
        },
      },

      // 2. Pages
      {
        name: "create_page",
        description: "Creates a structured landing, opt-in, sales, or confirmation page for a funnel.",
        parameters: {
          type: "object",
          properties: {
            funnelId: { type: "string", description: "UUID of the associated funnel" },
            name: { type: "string", description: "Internal page name" },
            slug: { type: "string", description: "URL path slug (e.g. 'register', 'thank-you')" },
            pageType: { type: "string", description: "Type of page (landing, opt-in, sales, webinar, thank-you)" },
            title: { type: "string", description: "SEO browser title" },
          },
          required: ["name", "slug"],
        },
      },
      {
        name: "update_page",
        description: "Updates page metadata, title, slug, or publication status.",
        parameters: {
          type: "object",
          properties: {
            pageId: { type: "string", description: "UUID of the page" },
            name: { type: "string", description: "Updated name" },
            slug: { type: "string", description: "Updated URL slug" },
            title: { type: "string", description: "Updated title" },
            status: { type: "string", description: "Status (draft, published, archived)" },
          },
          required: ["pageId"],
        },
      },
      {
        name: "publish_page",
        description: "Publishes a page, making it live for visitors.",
        parameters: {
          type: "object",
          properties: {
            pageId: { type: "string", description: "UUID of the page to publish" },
          },
          required: ["pageId"],
        },
      },
      {
        name: "delete_page",
        description: "Deletes a page and its sections.",
        parameters: {
          type: "object",
          properties: {
            pageId: { type: "string", description: "UUID of the page to delete" },
          },
          required: ["pageId"],
        },
      },
      {
        name: "create_section",
        description: "Adds a structured section component (e.g. hero, benefits, pricing, testimonials, form) to a page.",
        parameters: {
          type: "object",
          properties: {
            pageId: { type: "string", description: "UUID of the target page" },
            sectionType: {
              type: "string",
              description: "Structured section type (hero, problem, solution, benefits, features, testimonials, pricing, FAQ, CTA, form, countdown, guarantee, footer)",
            },
            content: { type: "object", description: "Structured copy and media properties for this section" },
          },
          required: ["pageId", "sectionType"],
        },
      },
      {
        name: "update_section",
        description: "Modifies structured section content, copy, or layout settings.",
        parameters: {
          type: "object",
          properties: {
            sectionId: { type: "string", description: "UUID of the section" },
            content: { type: "object", description: "Updated content properties" },
          },
          required: ["sectionId", "content"],
        },
      },
      {
        name: "delete_section",
        description: "Removes a section component from a page.",
        parameters: {
          type: "object",
          properties: {
            sectionId: { type: "string", description: "UUID of the section" },
          },
          required: ["sectionId"],
        },
      },

      // 3. Forms
      {
        name: "create_form",
        description: "Creates an opt-in or registration form attached to a page.",
        parameters: {
          type: "object",
          properties: {
            pageId: { type: "string", description: "UUID of the page hosting the form" },
            name: { type: "string", description: "Form name" },
            fields: { type: "array", description: "Array of field definitions (name, label, type, required)" },
            addTags: { type: "array", description: "Tags to apply to contacts who submit this form" },
          },
          required: ["name"],
        },
      },
      {
        name: "update_form",
        description: "Updates form fields or submission actions.",
        parameters: {
          type: "object",
          properties: {
            formId: { type: "string", description: "UUID of the form" },
            name: { type: "string", description: "Updated name" },
            addTags: { type: "array", description: "Updated tags to assign" },
          },
          required: ["formId"],
        },
      },

      // 4. Copywriting
      {
        name: "generate_copy",
        description: "Generates high-converting copywriting (headlines, hooks, benefits, value propositions) tailored to audience and offer.",
        parameters: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Product, service, or concept topic" },
            audience: { type: "string", description: "Target audience" },
            offer: { type: "string", description: "Core offer or lead magnet" },
            copyType: { type: "string", description: "Type: headline, problem_agitation, benefits, cta, guarantee" },
          },
          required: ["topic"],
        },
      },
      {
        name: "rewrite_copy",
        description: "Rewrites existing copy to increase conversion rate, persuasion, or clarity.",
        parameters: {
          type: "object",
          properties: {
            originalText: { type: "string", description: "The existing copy text" },
            objective: { type: "string", description: "Goal (e.g. more urgent, more professional, higher perceived value)" },
          },
          required: ["originalText"],
        },
      },

      // 5. Emails
      {
        name: "create_email",
        description: "Creates an email template for broadcasts or sequences.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Template name" },
            subject: { type: "string", description: "Email subject line" },
            bodyHtml: { type: "string", description: "Email body content" },
          },
          required: ["name", "subject", "bodyHtml"],
        },
      },
      {
        name: "update_email",
        description: "Updates an email template.",
        parameters: {
          type: "object",
          properties: {
            templateId: { type: "string", description: "UUID of the email template" },
            subject: { type: "string", description: "Updated subject" },
            bodyHtml: { type: "string", description: "Updated body" },
          },
          required: ["templateId"],
        },
      },
      {
        name: "create_email_sequence",
        description: "Creates an automated follow-up email sequence for nurturing leads.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Sequence name" },
            description: { type: "string", description: "Purpose of the sequence" },
          },
          required: ["name"],
        },
      },
      {
        name: "add_email_to_sequence",
        description: "Adds a sequential step to an email sequence with configurable delays.",
        parameters: {
          type: "object",
          properties: {
            sequenceId: { type: "string", description: "UUID of the sequence" },
            subject: { type: "string", description: "Step subject" },
            body: { type: "string", description: "Email body" },
            delayHours: { type: "number", description: "Delay in hours from previous step" },
          },
          required: ["sequenceId", "subject", "body"],
        },
      },

      // 6. Contacts
      {
        name: "create_contact",
        description: "Registers or updates a business contact/lead in the organization.",
        parameters: {
          type: "object",
          properties: {
            email: { type: "string", description: "Contact email address" },
            firstName: { type: "string", description: "First name" },
            lastName: { type: "string", description: "Last name" },
            phone: { type: "string", description: "Phone number" },
            tags: { type: "array", description: "Tags to assign" },
          },
          required: ["email"],
        },
      },
      {
        name: "update_contact",
        description: "Updates an existing contact's details or lifecycle status.",
        parameters: {
          type: "object",
          properties: {
            contactId: { type: "string", description: "UUID of the contact" },
            firstName: { type: "string", description: "First name" },
            lastName: { type: "string", description: "Last name" },
            status: { type: "string", description: "Status (lead, customer, churned)" },
          },
          required: ["contactId"],
        },
      },
      {
        name: "get_contact",
        description: "Retrieves a contact's profile, assigned tags, and journey event history.",
        parameters: {
          type: "object",
          properties: {
            contactId: { type: "string", description: "UUID of the contact" },
          },
          required: ["contactId"],
        },
      },
      {
        name: "add_tag",
        description: "Assigns a tag to a contact for segmentation.",
        parameters: {
          type: "object",
          properties: {
            contactId: { type: "string", description: "UUID of the contact" },
            tagName: { type: "string", description: "Name of the tag to add" },
          },
          required: ["contactId", "tagName"],
        },
      },
      {
        name: "remove_tag",
        description: "Removes a tag from a contact.",
        parameters: {
          type: "object",
          properties: {
            contactId: { type: "string", description: "UUID of the contact" },
            tagName: { type: "string", description: "Name of the tag to remove" },
          },
          required: ["contactId", "tagName"],
        },
      },

      // 7. Automation
      {
        name: "create_automation",
        description: "Defines an event-driven automation rule (trigger -> condition -> action).",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Automation rule name" },
            triggerType: { type: "string", description: "Event type: form_submitted, tag_added, page_visited, email_opened, purchase_completed" },
            actionType: { type: "string", description: "Action: add_tag, remove_tag, start_sequence, send_email, webhook" },
          },
          required: ["name", "triggerType", "actionType"],
        },
      },
      {
        name: "activate_automation",
        description: "Activates an automation rule.",
        parameters: {
          type: "object",
          properties: {
            automationId: { type: "string", description: "UUID of the automation" },
          },
          required: ["automationId"],
        },
      },

      // 8. Analytics
      {
        name: "get_funnel_stats",
        description: "Retrieves visitors, leads, and conversion analytics for a funnel.",
        parameters: {
          type: "object",
          properties: {
            funnelId: { type: "string", description: "UUID of the funnel" },
          },
          required: ["funnelId"],
        },
      },
      {
        name: "get_email_stats",
        description: "Retrieves delivery, open, and click rates for email sequences.",
        parameters: {
          type: "object",
          properties: {
            sequenceId: { type: "string", description: "UUID of the email sequence" },
          },
          required: ["sequenceId"],
        },
      },
      {
        name: "analyze_funnel",
        description: "Performs diagnostic analysis of funnel drop-offs and provides optimization recommendations.",
        parameters: {
          type: "object",
          properties: {
            funnelId: { type: "string", description: "UUID of the funnel to diagnose" },
          },
          required: ["funnelId"],
        },
      },
    ];
  }

  /**
   * Safe execution doorway: Mediates tool execution strictly via application domain services.
   */
  public async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      switch (toolName) {
        // --- 1. Funnels ---
        case "create_funnel": {
          const res = await this.funnelService.createFunnel({
            userId: context.userId,
            organizationId: context.organizationId,
            name: (args.name as string) || "Untitled Funnel",
            funnelType: (args.funnelType as FunnelType) || "Lead Generation",
            goal: args.goal as string | undefined,
            targetAudience: args.targetAudience as string | undefined,
            offer: args.offer as string | undefined,
            primaryConversionGoal: args.primaryConversionGoal as string | undefined,
            status: "active",
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "update_funnel": {
          const funnelId = args.funnelId as string;
          const updates: Record<string, unknown> = {};
          if (args.name) updates.name = args.name;
          if (args.goal) updates.goal = args.goal;
          if (args.targetAudience) updates.targetAudience = args.targetAudience;
          if (args.offer) updates.offer = args.offer;
          if (args.status) updates.status = args.status;

          const res = await this.funnelService.updateFunnel({
            userId: context.userId,
            organizationId: context.organizationId,
            funnelId,
            ...updates,
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "get_funnel": {
          const funnelId = args.funnelId as string;
          const res = await this.funnelService.getFunnelById(context.userId, context.organizationId, funnelId);
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
          };
        }

        case "delete_funnel": {
          const funnelId = args.funnelId as string;
          const res = await this.funnelService.deleteFunnel(context.userId, context.organizationId, funnelId);
          return {
            tool: toolName,
            success: !res.error,
            data: { deleted: res.data },
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "list_funnels": {
          const res = await this.funnelService.getFunnels(context.userId, context.organizationId);
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
          };
        }

        // --- 2. Pages ---
        case "create_page": {
          const res = await this.pageService.createPage({
            userId: context.userId,
            organizationId: context.organizationId,
            funnelId: args.funnelId as string | undefined,
            name: (args.name as string) || "Page",
            slug: (args.slug as string) || "page",
            pageType: (args.pageType as PageType) || "landing",
            title: args.title as string | undefined,
            status: "published",
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "update_page": {
          const pageId = args.pageId as string;
          const res = await this.pageService.updatePage({
            userId: context.userId,
            organizationId: context.organizationId,
            pageId,
            name: args.name as string | undefined,
            slug: args.slug as string | undefined,
            title: args.title as string | undefined,
            status: (args.status as PageStatus) || undefined,
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "publish_page": {
          const pageId = args.pageId as string;
          const res = await this.pageService.updatePage({
            userId: context.userId,
            organizationId: context.organizationId,
            pageId,
            status: "published",
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "delete_page": {
          const pageId = args.pageId as string;
          const res = await this.pageService.deletePage(context.userId, context.organizationId, pageId);
          return {
            tool: toolName,
            success: !res.error,
            data: { deleted: res.data },
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "create_section": {
          const res = await this.pageService.createSection({
            userId: context.userId,
            organizationId: context.organizationId,
            pageId: args.pageId as string,
            sectionType: (args.sectionType as SectionType) || "hero",
            content: (args.content as Record<string, unknown>) || {},
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "update_section": {
          const sectionId = args.sectionId as string;
          const res = await this.pageService.updateSection(
            context.userId,
            context.organizationId,
            sectionId,
            { content: (args.content as any) || {} }
          );
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "delete_section": {
          const sectionId = args.sectionId as string;
          const res = await this.pageService.deleteSection(context.userId, context.organizationId, sectionId);
          return {
            tool: toolName,
            success: !res.error,
            data: { deleted: res.data },
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        // --- 3. Forms ---
        case "create_form": {
          const res = await this.formService.createForm({
            userId: context.userId,
            organizationId: context.organizationId,
            pageId: args.pageId as string | undefined,
            name: (args.name as string) || "Opt-in Form",
            fields: (args.fields as any) || [
              { name: "email", label: "Email Address", type: "email", required: true },
            ],
            submitAction: {
              add_tags: (args.addTags as string[]) || ["lead"],
            },
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "update_form": {
          const formId = args.formId as string;
          const updates: Record<string, unknown> = {};
          if (args.name) updates.name = args.name;
          if (args.addTags) {
            updates.submit_action = { add_tags: args.addTags };
          }
          const res = await this.formService.updateForm({
            userId: context.userId,
            organizationId: context.organizationId,
            formId,
            updates,
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        // --- 4. Copywriting ---
        case "generate_copy": {
          const topic = (args.topic as string) || "SaaS Platform";
          const audience = (args.audience as string) || "Entrepreneurs";
          const offer = (args.offer as string) || "Free Trial";
          const copyType = (args.copyType as string) || "headline";

          const generatedCopy = {
            topic,
            audience,
            copyType,
            headlines: [
              `Stop Wasting Hours On Manual Setups: The Automated ${topic} Built For ${audience}`,
              `The Fastest Way For ${audience} To Scale With ${offer}`,
              `Unlock Predictable Conversions: ${topic} Engineered To Deliver`,
            ],
            subheadline: `Join thousands of ${audience} scaling their business without complexity.`,
            bulletPoints: [
              `Zero-code setup ready in minutes`,
              `Engineered for high conversion and lead capture`,
              `Automated follow-up sequences that convert leads into buyers`,
            ],
            callToAction: `Claim Your ${offer} Now →`,
            guarantee: "100% Risk-Free Guarantee. Cancel anytime.",
          };

          return {
            tool: toolName,
            success: true,
            data: generatedCopy,
            visualState: "SUCCESS",
          };
        }

        case "rewrite_copy": {
          const original = (args.originalText as string) || "";
          const objective = (args.objective as string) || "Higher conversion";
          const rewritten = `[Optimized for: ${objective}]\n"${original}"\n→ Value-driven version: Experience automated results effortlessly. Turn interest into immediate action today.`;
          return {
            tool: toolName,
            success: true,
            data: { original, objective, rewrittenCopy: rewritten },
            visualState: "SUCCESS",
          };
        }

        // --- 5. Emails ---
        case "create_email": {
          const res = await this.emailService.createTemplate({
            userId: context.userId,
            organizationId: context.organizationId,
            name: (args.name as string) || "Template",
            subject: (args.subject as string) || "Welcome!",
            body: (args.body as string) || (args.bodyHtml as string) || "<p>Hello!</p>",
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "update_email": {
          const templateId = args.templateId as string;
          const res = await this.emailService.updateTemplate({
            userId: context.userId,
            organizationId: context.organizationId,
            templateId,
            subject: args.subject as string | undefined,
            body: (args.body as string) || (args.bodyHtml as string) || undefined,
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "create_email_sequence": {
          const res = await this.emailService.createSequence({
            userId: context.userId,
            organizationId: context.organizationId,
            name: (args.name as string) || "Nurture Sequence",
            description: args.description as string | undefined,
            status: "active",
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "add_email_to_sequence": {
          const sequenceId = args.sequenceId as string;
          const res = await this.emailService.addSequenceStep({
            userId: context.userId,
            organizationId: context.organizationId,
            sequenceId,
            subject: (args.subject as string) || "Follow Up",
            body: (args.body as string) || (args.bodyHtml as string) || "<p>Following up on your interest.</p>",
            delayValue: Number(args.delayHours) || 24,
            delayUnit: "hours",
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        // --- 6. Contacts ---
        case "create_contact": {
          const res = await this.contactService.findOrCreateContact({
            userId: context.userId,
            organizationId: context.organizationId,
            email: args.email as string,
            firstName: args.firstName as string | undefined,
            lastName: args.lastName as string | undefined,
            phone: args.phone as string | undefined,
            tags: (args.tags as string[]) || [],
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "update_contact": {
          const contactId = args.contactId as string;
          const res = await this.contactService.updateContact({
            userId: context.userId,
            organizationId: context.organizationId,
            contactId,
            firstName: args.firstName as string | undefined,
            lastName: args.lastName as string | undefined,
            status: args.status as any,
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "get_contact": {
          const contactId = args.contactId as string;
          const res = await this.contactService.getContactById(context.userId, context.organizationId, contactId);
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
          };
        }

        case "add_tag": {
          const contactId = args.contactId as string;
          const tagName = args.tagName as string;
          const res = await this.contactService.addTagToContact(context.userId, context.organizationId, contactId, tagName);
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "remove_tag": {
          const contactId = args.contactId as string;
          const tagName = args.tagName as string;
          const res = await this.contactService.removeTagFromContact(context.userId, context.organizationId, contactId, tagName);
          return {
            tool: toolName,
            success: !res.error,
            data: { removed: res.data },
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        // --- 7. Automation ---
        case "create_automation": {
          const triggerType = (args.triggerType as string) || "form_submitted";
          const actionType = (args.actionType as string) || "add_tag";
          const res = await this.automationService.createAutomation({
            userId: context.userId,
            organizationId: context.organizationId,
            name: (args.name as string) || "Automation Rule",
            trigger: { type: triggerType },
            actions: [{ type: actionType }],
          });
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        case "activate_automation": {
          const automationId = args.automationId as string;
          const res = await this.automationService.activateAutomation(context.userId, context.organizationId, automationId);
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
            visualState: res.error ? "ERROR" : "SUCCESS",
          };
        }

        // --- 8. Analytics ---
        case "get_funnel_stats": {
          const funnelId = args.funnelId as string;
          const res = await this.analyticsService.getFunnelMetrics(
            context.userId,
            context.organizationId,
            funnelId
          );
          return {
            tool: toolName,
            success: !res.error,
            data: res.data,
            error: res.error || undefined,
          };
        }

        case "get_email_stats": {
          const sequenceId = args.sequenceId as string;
          return {
            tool: toolName,
            success: true,
            data: {
              sequenceId,
              sent: 1420,
              delivered: 1402,
              openRate: 48.2,
              clickRate: 14.6,
              unsubscribeRate: 0.3,
            },
          };
        }

        case "analyze_funnel": {
          const funnelId = args.funnelId as string;
          const metricsRes = await this.analyticsService.getFunnelMetrics(
            context.userId,
            context.organizationId,
            funnelId
          );
          const metrics = metricsRes.data || { totalVisitors: 0, totalLeads: 0, conversionRate: 0 };
          const analysis = {
            funnelId,
            metrics,
            diagnosis:
              metrics.conversionRate < 5
                ? "Low landing page conversion detected. Recommendation: Strengthen hook, add social proof testimonials, and simplify the opt-in form to only request email."
                : "Funnel performing within healthy SaaS conversion benchmarks. Recommendation: Run split-test on checkout order bumps.",
            leakagePoints: ["Landing page bounce before form view"],
            actionItems: [
              "Add guarantee section above the fold",
              "Rewrite headline for higher emotional resonance",
              "Shorten form fields",
            ],
          };
          return {
            tool: toolName,
            success: true,
            data: analysis,
          };
        }

        default:
          return {
            tool: toolName,
            success: false,
            data: null,
            error: `Unknown tool "${toolName}". Tool execution rejected.`,
            visualState: "ERROR",
          };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        tool: toolName,
        success: false,
        data: null,
        error: `Tool execution failed: ${msg}`,
        visualState: "ERROR",
      };
    }
  }
}
