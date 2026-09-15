/**
 * ELMO Phase 3 — Web Preview & Versioning Service (WebPreviewService)
 *
 * Compiles structured WebsitePageModels and SectionModels into responsive, interactive
 * preview markup supporting Desktop, Tablet, and Mobile viewports.
 * Manages website snapshots, version history, and rollbacks.
 */

import {
  WebsitePageModel,
  WebsiteSectionModel,
  WebsiteStyleConfig,
  WebsiteVersion,
  PreviewPayload,
  WebsiteProject,
} from "../types/agentic.types";

export class WebPreviewService {
  private static instance: WebPreviewService;
  // Project versions store: projectId -> WebsiteVersion[]
  private versions: Map<string, WebsiteVersion[]> = new Map();

  private defaultStyles: WebsiteStyleConfig = {
    primaryColor: "#f59e0b", // Amber 500
    secondaryColor: "#3b82f6", // Blue 500
    accentColor: "#10b981", // Emerald 500
    backgroundColor: "#020617", // Slate 950
    textColor: "#f8fafc", // Slate 50
    fontHeading: "Inter, sans-serif",
    fontBody: "Inter, sans-serif",
    borderRadius: "lg",
    themeMode: "dark",
  };

  private constructor() {}

  public static getInstance(): WebPreviewService {
    if (!WebPreviewService.instance) {
      WebPreviewService.instance = new WebPreviewService();
    }
    return WebPreviewService.instance;
  }

  public reset(): void {
    this.versions.clear();
  }

  /**
   * Generates interactive HTML preview markup for a given page model.
   */
  public generatePreview(
    page: WebsitePageModel,
    styles: WebsiteStyleConfig = this.defaultStyles
  ): PreviewPayload {
    const renderedSections = page.sections
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((section) => this.renderSection(section, styles))
      .join("\n\n");

    const fullHtml = `
<!DOCTYPE html>
<html lang="en" class="${styles.themeMode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title || page.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: ${styles.fontBody}; background-color: ${styles.backgroundColor}; color: ${styles.textColor}; }
    h1, h2, h3, h4, h5, h6 { font-family: ${styles.fontHeading}; }
  </style>
</head>
<body class="min-h-screen antialiased selection:bg-amber-500/20 selection:text-amber-400">
  <main class="w-full">
    ${renderedSections}
  </main>
</body>
</html>`.trim();

    return {
      projectId: page.projectId,
      pageId: page.id,
      pageTitle: page.title || page.name,
      slug: page.slug,
      renderedHtml: fullHtml,
      sectionsCount: page.sections.length,
      styles,
      sections: page.sections,
      viewportOptions: ["desktop", "tablet", "mobile"],
      generatedAt: Date.now(),
    };
  }

  /**
   * Renders an individual section model to accessible, modern Tailwind HTML.
   */
  private renderSection(section: WebsiteSectionModel, styles: WebsiteStyleConfig): string {
    const { content, sectionType, layout } = section;
    const alignClass = layout.alignment === "center" ? "text-center mx-auto" : "text-left";
    const containerMax =
      layout.containerWidth === "narrow"
        ? "max-w-4xl"
        : layout.containerWidth === "wide"
        ? "max-w-7xl"
        : layout.containerWidth === "full"
        ? "w-full"
        : "max-w-6xl";

    switch (sectionType) {
      case "hero":
        return `
<!-- HERO SECTION -->
<section id="hero" class="relative overflow-hidden py-20 px-6 sm:py-32 bg-gradient-to-b from-slate-900/80 to-slate-950 border-b border-slate-800/60">
  <div class="${containerMax} mx-auto ${alignClass}">
    ${
      content.badge
        ? `<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-6 tracking-wide uppercase shadow-sm">
            <span>✨</span> ${content.badge}
          </div>`
        : ""
    }
    <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl ${layout.alignment === "center" ? "mx-auto" : ""} leading-[1.15]">
      ${content.headline || "Transform Your Business with AI Intelligence"}
    </h1>
    <p class="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl ${layout.alignment === "center" ? "mx-auto" : ""} leading-relaxed">
      ${content.subheadline || "Automate lead qualification, client follow-ups, and daily workflows on complete autopilot."}
    </p>
    <div class="mt-10 flex flex-wrap items-center gap-4 ${layout.alignment === "center" ? "justify-center" : "justify-start"}">
      ${
        content.primaryCta
          ? `<a href="${content.primaryCta.url || "#contact"}" class="px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5">
              ${content.primaryCta.label}
            </a>`
          : ""
      }
      ${
        content.secondaryCta
          ? `<a href="${content.secondaryCta.url || "#features"}" class="px-7 py-4 rounded-xl text-base font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all">
              ${content.secondaryCta.label}
            </a>`
          : ""
      }
    </div>
  </div>
</section>`;

      case "benefits":
      case "features":
        return `
<!-- ${sectionType.toUpperCase()} SECTION -->
<section id="${sectionType}" class="py-20 px-6 bg-slate-950 border-b border-slate-800/60">
  <div class="${containerMax} mx-auto">
    <div class="${alignClass} mb-14">
      <h2 class="text-3xl sm:text-4xl font-bold tracking-tight text-white">
        ${content.headline || "Why Choose Our Solution"}
      </h2>
      <p class="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl ${layout.alignment === "center" ? "mx-auto" : ""}">
        ${content.subheadline || "Engineered for speed, predictability, and effortless scale."}
      </p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      ${(content.items || [])
        .map(
          (item) => `
        <div class="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/30 transition-all shadow-sm">
          <div class="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl font-bold mb-6 border border-amber-500/20">
            ${item.icon || "⚡"}
          </div>
          <h3 class="text-xl font-bold text-white mb-3">${item.title}</h3>
          <p class="text-slate-400 leading-relaxed text-sm">${item.description}</p>
        </div>`
        )
        .join("")}
    </div>
  </div>
</section>`;

      case "social proof":
      case "testimonials":
        return `
<!-- TESTIMONIALS SECTION -->
<section id="testimonials" class="py-20 px-6 bg-slate-900/40 border-b border-slate-800/60">
  <div class="${containerMax} mx-auto ${alignClass}">
    <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">
      ${content.headline || "Trusted by Industry Leaders"}
    </h2>
    <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
      ${(content.items || [])
        .map(
          (t) => `
        <div class="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-left">
          <p class="text-slate-300 italic text-base leading-relaxed mb-6">"${t.description || t.quote}"</p>
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm border border-amber-500/30">
              ${(t.author || "Client")[0]}
            </div>
            <div>
              <div class="text-white font-semibold text-sm">${t.author || t.title}</div>
              <div class="text-slate-400 text-xs">${t.role || "Verified Partner"}</div>
            </div>
          </div>
        </div>`
        )
        .join("")}
    </div>
  </div>
</section>`;

      case "pricing":
        return `
<!-- PRICING SECTION -->
<section id="pricing" class="py-20 px-6 bg-slate-950 border-b border-slate-800/60">
  <div class="${containerMax} mx-auto ${alignClass}">
    <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">${content.headline || "Transparent Investment Plans"}</h2>
    <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
      ${(content.items || [])
        .map(
          (plan) => `
        <div class="p-8 rounded-2xl bg-slate-900/70 border ${plan.isPopular ? "border-amber-500 shadow-lg shadow-amber-500/10" : "border-slate-800"} flex flex-col justify-between">
          <div>
            ${plan.isPopular ? `<span class="px-3 py-1 text-xs font-bold rounded-full bg-amber-500 text-black uppercase tracking-wider mb-4 inline-block">Most Popular</span>` : ""}
            <h3 class="text-xl font-bold text-white mb-2">${plan.title}</h3>
            <div class="text-4xl font-extrabold text-white my-4">${plan.price || "$99"} <span class="text-sm font-normal text-slate-400">/ ${plan.period || "mo"}</span></div>
            <p class="text-slate-400 text-sm mb-6">${plan.description}</p>
          </div>
          <button class="w-full py-3.5 rounded-xl font-bold ${plan.isPopular ? "bg-amber-500 hover:bg-amber-400 text-black shadow-md" : "bg-slate-800 hover:bg-slate-700 text-white"} transition-all">
            Get Started
          </button>
        </div>`
        )
        .join("")}
    </div>
  </div>
</section>`;

      case "form":
      case "CTA":
        return `
<!-- LEAD CAPTURE & CTA -->
<section id="contact" class="py-20 px-6 bg-gradient-to-t from-slate-900 to-slate-950 border-b border-slate-800/60">
  <div class="max-w-xl mx-auto p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center">
    <h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">${content.headline || "Ready to Accelerate Growth?"}</h2>
    <p class="text-slate-400 text-sm mb-8">${content.subheadline || "Leave your details below to activate your account in under 2 minutes."}</p>
    <form class="space-y-4 text-left" onsubmit="event.preventDefault(); alert('Lead captured successfully!');">
      ${(content.formFields || [
        { name: "name", label: "Full Name", type: "text", placeholder: "Alex Morgan", required: true },
        { name: "email", label: "Work Email", type: "email", placeholder: "alex@company.com", required: true },
      ])
        .map(
          (field) => `
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">${field.label}</label>
          <input type="${field.type}" placeholder="${field.placeholder || ""}" ${field.required ? "required" : ""} class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-sm" />
        </div>`
        )
        .join("")}
      <button type="submit" class="w-full py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 transition-all mt-4">
        ${content.primaryCta?.label || "Submit Application"}
      </button>
    </form>
  </div>
</section>`;

      case "footer":
        return `
<!-- FOOTER SECTION -->
<footer class="py-12 px-6 bg-slate-950 text-slate-500 text-sm border-t border-slate-900">
  <div class="${containerMax} mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
    <p>© ${new Date().getFullYear()} ${content.headline || "ELMO Operating System"}. All rights reserved.</p>
    <div class="flex items-center gap-6 text-xs text-slate-400">
      <a href="#privacy" class="hover:text-amber-400 transition-colors">Privacy Policy</a>
      <a href="#terms" class="hover:text-amber-400 transition-colors">Terms of Service</a>
      <a href="#contact" class="hover:text-amber-400 transition-colors">Support</a>
    </div>
  </div>
</footer>`;

      default:
        return `
<!-- CUSTOM SECTION (${sectionType}) -->
<section class="py-16 px-6 bg-slate-950 border-b border-slate-800">
  <div class="${containerMax} mx-auto ${alignClass}">
    <h3 class="text-2xl font-bold text-white mb-2">${content.headline || section.name}</h3>
    <p class="text-slate-400 text-sm">${content.subheadline || content.bodyText || ""}</p>
  </div>
</section>`;
    }
  }

  // ==========================================================================
  // Versioning & Snapshot Rollback Support
  // ==========================================================================

  public saveVersion(
    project: WebsiteProject,
    description: string,
    createdBy = "web-coding-agent"
  ): WebsiteVersion {
    const list = this.versions.get(project.id) || [];
    const newVersionNumber = list.length + 1;

    const version: WebsiteVersion = {
      id: `ver-${project.id}-${newVersionNumber}`,
      projectId: project.id,
      versionNumber: newVersionNumber,
      description,
      snapshot: JSON.parse(JSON.stringify(project)),
      createdAt: new Date().toISOString(),
      createdBy,
    };

    list.push(version);
    this.versions.set(project.id, list);
    project.activeVersion = newVersionNumber;
    return version;
  }

  public listVersions(projectId: string): WebsiteVersion[] {
    return this.versions.get(projectId) || [];
  }

  public rollbackVersion(projectId: string, targetVersionNumber: number): WebsiteProject | null {
    const list = this.versions.get(projectId) || [];
    const found = list.find((v) => v.versionNumber === targetVersionNumber);
    if (!found) return null;
    return JSON.parse(JSON.stringify(found.snapshot));
  }
}
