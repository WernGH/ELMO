/**
 * ELMO Phase 3 — Web Application Builder Engine (WebApplicationEngine)
 *
 * Dedicated builder for web applications: CRMs, Dashboards, Admin Panels,
 * Customer Portals, Internal Business Tools, and SaaS Management Interfaces.
 *
 * Enforces the 10-Step Software Specification workflow:
 * 1. Requirements & Core Objectives
 * 2. User Roles & Permissions
 * 3. User Flows
 * 4. Data Model Requirements
 * 5. Pages & Screens
 * 6. Components
 * 7. API Requirements
 * 8. Permissions & Access Control
 * 9. Validation Rules
 * 10. Testing Plan
 *
 * Then compiles rich, interactive application previews with live search, filters,
 * KPI metric stats, data tables, and action modals.
 */

import {
  ProjectContext,
  WebsiteProject,
  WebsitePageModel,
  WebsiteSectionModel,
  WebsiteStyleConfig,
  ApplicationSpecification,
} from "../types/agentic.types";

export class WebApplicationEngine {
  private static instance: WebApplicationEngine;

  private constructor() {}

  public static getInstance(): WebApplicationEngine {
    if (!WebApplicationEngine.instance) {
      WebApplicationEngine.instance = new WebApplicationEngine();
    }
    return WebApplicationEngine.instance;
  }

  /**
   * Generates the rigorous 10-Step Application Specification.
   */
  public generateSpecification(context: ProjectContext, projectId = `app-${Date.now()}`): ApplicationSpecification {
    const isCRM = context.projectType.includes("CRM") || context.projectType.includes("Lead");
    const isPortal = context.projectType.includes("Portal");
    const isDashboard = context.projectType.includes("Dashboard");

    let appType: ApplicationSpecification["type"] = "Dashboard";
    if (isCRM) appType = "CRM";
    else if (isPortal) appType = "Customer Portal";
    else if (context.projectType.includes("Admin")) appType = "Admin Portal";
    else if (context.projectType.includes("Internal")) appType = "Internal Tool";

    // 1. Requirements
    const requirements = [
      `Automate operational ingestion, status tracking, and dispatch for ${context.targetAudience}.`,
      "Real-time visibility across pipeline metrics, conversion rates, and pending actions.",
      "Strict multi-tenant data isolation per organization.",
      "Instant keyword search and multi-status facet filtering.",
      "Exportable CSV/JSON audit reports with timestamped attribution.",
    ];

    // 2. User Roles
    const userRoles = [
      {
        role: "Organization Owner / Admin",
        description: "Unrestricted workspace control, member management, and billing.",
        permissions: ["workspace:admin", "data:read_all", "data:write_all", "settings:manage"],
      },
      {
        role: "Team Manager",
        description: "Manages operational queues, approves workflows, and assigns items.",
        permissions: ["data:read_all", "data:write_assigned", "workflow:approve"],
      },
      {
        role: "Team Member / Specialist",
        description: "Executes day-to-day triage, adds notes, and updates record status.",
        permissions: ["data:read_assigned", "data:write_assigned"],
      },
      {
        role: "Client / Viewer (Read-Only)",
        description: "Inspects status milestones and downloads permitted deliverables.",
        permissions: ["data:read_public_view"],
      },
    ];

    // 3. User Flows
    const userFlows = [
      {
        flowName: "Lead Ingestion & Triage Flow",
        steps: [
          "Record arrives via webhook or direct entry.",
          "System auto-enriches metadata and evaluates priority score.",
          "Manager reviews queue and assigns to appropriate team member.",
          "Status updates trigger automated notification sequence.",
        ],
      },
      {
        flowName: "Status Modification & Audit Trail",
        steps: [
          "User opens record detail modal.",
          "Updates fields and enters operational notes.",
          "Client-side validation verifies required inputs.",
          "Backend stores mutation and records event history with actor ID.",
        ],
      },
    ];

    // 4. Data Model Requirements
    const dataModelRequirements = [
      {
        entityName: isCRM ? "leads_contacts" : "workspace_items",
        fields: [
          { name: "id", type: "uuid (PK)", required: true },
          { name: "organization_id", type: "uuid (FK)", required: true },
          { name: "name", type: "varchar(255)", required: true },
          { name: "email", type: "varchar(255)", required: isCRM },
          { name: "status", type: "enum(pending, active, review, completed)", required: true },
          { name: "priority", type: "enum(low, medium, high, urgent)", required: true },
          { name: "value_amount", type: "numeric(12,2)", required: false },
          { name: "created_at", type: "timestamptz", required: true },
          { name: "updated_at", type: "timestamptz", required: true },
        ],
      },
      {
        entityName: "activity_logs",
        fields: [
          { name: "id", type: "uuid (PK)", required: true },
          { name: "organization_id", type: "uuid (FK)", required: true },
          { name: "actor_id", type: "uuid (FK)", required: true },
          { name: "action", type: "varchar(100)", required: true },
          { name: "details", type: "jsonb", required: false },
          { name: "created_at", type: "timestamptz", required: true },
        ],
      },
    ];

    // 5. Pages & Screens
    const screens = [
      { id: "scr-overview", name: "Main Dashboard", route: "/app/overview", description: "KPI summary cards, recent activity, and pipeline distribution." },
      { id: "scr-table", name: "Records Directory", route: "/app/records", description: "Searchable, sortable data table with filter chips and batch actions." },
      { id: "scr-detail", name: "Record Detail & Timeline", route: "/app/records/:id", description: "Deep dive view with notes, attachments, and stage progress." },
      { id: "scr-settings", name: "Workspace Settings", route: "/app/settings", description: "Role management, webhooks, and team permissions." },
    ];

    // 6. Components
    const components = [
      { name: "KpiSummaryCard", type: "Metric Display", purpose: "Shows totals, deltas, and trend indicators." },
      { name: "InteractiveDataGrid", type: "Table", purpose: "Client-side search, multi-column sorting, and pagination." },
      { name: "FilterChipsBar", type: "Facet Control", purpose: "Instant status and tag filtering." },
      { name: "ActionDrawerModal", type: "Dialog", purpose: "Create or update records with input validation." },
      { name: "SidebarNav", type: "Navigation", purpose: "App-wide module navigation with tenant profile badge." },
    ];

    // 7. API Requirements
    const apiRequirements = [
      { method: "GET", path: "/api/app/records", description: "Fetch paginated records filtered by organization_id." },
      { method: "POST", path: "/api/app/records", description: "Create record with schema validation and sanitization." },
      { method: "PATCH", path: "/api/app/records/:id", description: "Update record fields and trigger audit logging." },
      { method: "DELETE", path: "/api/app/records/:id", description: "Soft-delete record if permitted by user role." },
    ];

    // 8. Permissions
    const permissions = [
      "Strict Row Level Security: auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = records.organization_id)",
      "Role-based action guards on write/delete routes",
      "Sanitized inputs preventing SQL injection and XSS",
    ];

    // 9. Validation Rules
    const validationRules = [
      "Email addresses must comply with RFC 5322 format.",
      "Names must be non-empty and between 2 and 100 characters.",
      "Amounts must be positive numeric values.",
      "Status must match predefined enum choices.",
    ];

    // 10. Testing Plan
    const testingPlan = [
      "Unit Tests: Data validation schemas and status transitions.",
      "Integration Tests: CRUD endpoints with mock Supabase client.",
      "Tenant Isolation Tests: Verify User A cannot access Org B records under any parameter manipulation.",
      "UI Verification: Test search debouncing, tab filtering, and modal open/close states.",
    ];

    return {
      projectId,
      name: `${context.businessName} ${appType}`,
      type: appType,
      requirements,
      userRoles,
      userFlows,
      dataModelRequirements,
      screens,
      components,
      apiRequirements,
      permissions,
      validationRules,
      testingPlan,
    };
  }

  /**
   * Builds an interactive web application project preview.
   */
  public buildApplicationProject(
    projectId: string,
    organizationId: string,
    context: ProjectContext,
    styles: WebsiteStyleConfig
  ): WebsiteProject {
    const spec = this.generateSpecification(context, projectId);
    const pageId = `page-app-${Date.now()}`;

    // App screen section
    const appSection: WebsiteSectionModel = {
      id: `sec-app-main-${Date.now()}`,
      pageId,
      sectionType: "custom",
      orderIndex: 0,
      name: `${spec.type} Operational Workspace`,
      content: {
        headline: `${context.businessName} ${spec.type}`,
        subheadline: `Mission Control & Management Suite for ${context.targetAudience}`,
        badge: "LIVE APPLICATION WORKSPACE",
        appSpecification: spec,
      },
      layout: { containerWidth: "full", alignment: "left" },
      styles: {
        backgroundColor: styles.backgroundColor,
      },
      responsive: { stackOnMobile: true },
    };

    const page: WebsitePageModel = {
      id: pageId,
      projectId,
      organizationId,
      name: `${spec.type} Screen`,
      slug: "app-workspace",
      pageType: "custom",
      status: "published",
      title: `${context.businessName} — ${spec.type}`,
      metaDescription: `Interactive ${spec.type} application workspace built for ${context.targetAudience}`,
      sections: [appSection],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      id: projectId,
      organizationId,
      name: `${context.businessName} ${spec.type}`,
      slug: "app-workspace",
      description: `Complete interactive web application with 10-step specification`,
      projectType: context.projectType,
      projectContext: context,
      styles,
      pages: [page],
      activeVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
