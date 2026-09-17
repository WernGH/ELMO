/**
 * ELMO Phase 3 — Web Preview & Versioning Service (WebPreviewService)
 *
 * Compiles structured WebsitePageModels and SectionModels into responsive, interactive
 * preview markup supporting Desktop, Tablet, and Mobile viewports.
 * Supports the entire 28 Section Library and Web Application layouts.
 * Manages website snapshots, version history, and rollbacks.
 */

import {
  WebsitePageModel,
  WebsiteSectionModel,
  WebsiteStyleConfig,
  WebsiteVersion,
  PreviewPayload,
  WebsiteProject,
  ApplicationSpecification,
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
  <meta name="description" content="${page.metaDescription || "High-converting web experience built with ELMO."}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;700;800&family=Playfair+Display:ital,wght@0,600;1,400&family=Outfit:wght@500;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
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
  public renderSection(section: WebsiteSectionModel, styles: WebsiteStyleConfig): string {
    const { content, sectionType, layout } = section;
    const alignClass = layout.alignment === "center" ? "text-center mx-auto" : layout.alignment === "right" ? "text-right" : "text-left";
    const containerMax =
      layout.containerWidth === "narrow"
        ? "max-w-4xl"
        : layout.containerWidth === "wide"
        ? "max-w-7xl"
        : layout.containerWidth === "full"
        ? "w-full"
        : "max-w-6xl";

    // Check if this is an application screen
    if (content.appSpecification) {
      return this.renderApplicationScreen(content.appSpecification as ApplicationSpecification, styles);
    }

    // Check if this is an announcement bar
    if (content.badge === "announcement_bar" || sectionType === "countdown") {
      return `
<!-- ANNOUNCEMENT BAR -->
<div class="py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-center text-xs font-bold tracking-wide uppercase shadow-sm">
  <span>⚡ ${content.headline || "Limited Priority Access Currently Open"}</span>
  ${content.primaryCta ? `<a href="${content.primaryCta.url || "#contact"}" class="ml-2 underline hover:opacity-80">${content.primaryCta.label} &rarr;</a>` : ""}
</div>`;
    }

    // Check if this is a navigation bar
    if (content.badge === "nav_bar" || (sectionType === "text" && content.items && content.items.length > 0)) {
      return `
<!-- NAVIGATION HEADER -->
<header class="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
  <div class="${containerMax} mx-auto flex items-center justify-between gap-6">
    <a href="#" class="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
      <span class="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-black font-black text-sm">E</span>
      ${content.headline || "ELMO Suite"}
    </a>
    <nav class="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
      ${(content.items || [])
        .map((item) => `<a href="${item.description || "#"}" class="hover:text-amber-400 transition-colors">${item.title}</a>`)
        .join("")}
    </nav>
    <div class="flex items-center gap-3">
      ${content.primaryCta ? `
      <a href="${content.primaryCta.url || "#contact"}" class="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md transition-all">
        ${content.primaryCta.label}
      </a>` : ""}
    </div>
  </div>
</header>`;
    }

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
      ${content.headline || "Transform Your Business with Precision"}
    </h1>
    <p class="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl ${layout.alignment === "center" ? "mx-auto" : ""} leading-relaxed">
      ${content.subheadline || "Engineered for speed, predictability, and effortless scale."}
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
        <div class="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/30 transition-all shadow-sm flex flex-col justify-between">
          <div>
            <div class="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl font-bold mb-6 border border-amber-500/20">
              ${item.icon || "⚡"}
            </div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xl font-bold text-white">${item.title}</h3>
              ${item.price ? `<span class="text-amber-400 font-bold">${item.price}</span>` : ""}
            </div>
            <p class="text-slate-400 leading-relaxed text-sm">${item.description}</p>
          </div>
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
    <p class="text-slate-400 text-sm max-w-2xl mx-auto mb-12">${content.subheadline || "Choose the tier calibrated to your ambition."}</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
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

      case "FAQ":
        return `
<!-- FAQ SECTION -->
<section id="faq" class="py-20 px-6 bg-slate-900/30 border-b border-slate-800/60">
  <div class="${containerMax} mx-auto">
    <div class="${alignClass} mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-white mb-3">${content.headline || "Frequently Asked Questions"}</h2>
      <p class="text-slate-400 text-sm">${content.subheadline || "Clear answers to essential questions."}</p>
    </div>
    <div class="max-w-3xl mx-auto space-y-4">
      ${(content.items || [])
        .map(
          (item) => `
        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 class="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span class="text-amber-400">?</span> ${item.title}
          </h3>
          <p class="text-slate-400 text-sm leading-relaxed">${item.description}</p>
        </div>`
        )
        .join("")}
    </div>
  </div>
</section>`;

      case "comparison":
        return `
<!-- COMPARISON SECTION -->
<section id="comparison" class="py-20 px-6 bg-slate-950 border-b border-slate-800/60">
  <div class="${containerMax} mx-auto ${alignClass}">
    <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">${content.headline || "Why We Stand Apart"}</h2>
    <div class="mt-12 overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-slate-800 text-xs uppercase text-slate-400 tracking-wider">
            <th class="py-4 px-6">Capability / Standard</th>
            <th class="py-4 px-6 text-amber-400 font-bold">Our Solution</th>
            <th class="py-4 px-6 text-slate-500">Traditional Alternatives</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800 text-sm">
          <tr>
            <td class="py-4 px-6 text-white font-medium">Response Speed</td>
            <td class="py-4 px-6 text-amber-400 font-bold">Under 10 seconds (24/7)</td>
            <td class="py-4 px-6 text-slate-400">4 to 24 hours</td>
          </tr>
          <tr>
            <td class="py-4 px-6 text-white font-medium">Custom Tailored Workflows</td>
            <td class="py-4 px-6 text-amber-400 font-bold">100% Industry Calibrated</td>
            <td class="py-4 px-6 text-slate-400">Generic Cookie-Cutter Templates</td>
          </tr>
          <tr>
            <td class="py-4 px-6 text-white font-medium">SLA & Data Isolation</td>
            <td class="py-4 px-6 text-amber-400 font-bold">Strict Tenant RLS & SOC2 Ready</td>
            <td class="py-4 px-6 text-slate-400">Shared Unverified Pools</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>`;

      case "form":
      case "CTA":
        return `
<!-- LEAD CAPTURE & CONVERSION CTA -->
<section id="contact" class="py-20 px-6 bg-gradient-to-t from-slate-900 to-slate-950 border-b border-slate-800/60">
  <div class="max-w-xl mx-auto p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center">
    <h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">${content.headline || "Ready to Accelerate Growth?"}</h2>
    <p class="text-slate-400 text-sm mb-8">${content.subheadline || "Leave your details below to activate your account in under 2 minutes."}</p>
    <form class="space-y-4 text-left" onsubmit="event.preventDefault(); alert('Lead captured successfully!');">
      ${(content.formFields || [
        { name: "name", label: "Full Name", type: "text", placeholder: "Alex Morgan", required: true },
        { name: "email", label: "Work Email", type: "email", placeholder: "alex@company.com", required: true },
        { name: "phone", label: "Phone", type: "tel", placeholder: "+60 12-345-6789", required: true },
      ])
        .map(
          (field) => `
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">${field.label}</label>
          <input type="${field.type}" name="${field.name}" placeholder="${field.placeholder || ""}" ${field.required ? "required" : ""} class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-sm" />
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

  /**
   * Renders interactive Web Application workspace (CRM, Dashboard, Portal).
   */
  private renderApplicationScreen(spec: ApplicationSpecification, styles: WebsiteStyleConfig): string {
    return `
<!-- WEB APPLICATION WORKSPACE: ${spec.type.toUpperCase()} -->
<div class="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-200">
  <!-- SIDEBAR NAVIGATION -->
  <aside class="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
    <div>
      <div class="flex items-center gap-3 mb-8">
        <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-black font-black text-base shadow-md">
          ${spec.type[0]}
        </div>
        <div>
          <div class="font-bold text-white text-sm leading-tight">${spec.name}</div>
          <div class="text-xs text-amber-400 font-medium">${spec.type}</div>
        </div>
      </div>

      <nav class="space-y-1">
        ${spec.screens
          .map(
            (scr, idx) => `
          <a href="#" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${idx === 0 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"} transition-colors">
            <span>${idx === 0 ? "📊" : idx === 1 ? "📁" : idx === 2 ? "📑" : "⚙️"}</span>
            ${scr.name}
          </a>`
          )
          .join("")}
      </nav>
    </div>

    <div class="mt-8 pt-6 border-t border-slate-800">
      <div class="flex items-center gap-3">
        <div class="h-8 w-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
          AD
        </div>
        <div>
          <div class="text-xs font-semibold text-white">Active Operator</div>
          <div class="text-[10px] text-slate-500">Multi-Tenant Protected</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- MAIN OPERATIONAL WORKSPACE -->
  <main class="flex-1 p-6 sm:p-10 overflow-y-auto">
    <!-- TOP BAR -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-slate-800">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">${spec.name}</h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">Operational records directory & live dispatch view.</p>
      </div>
      <div class="flex items-center gap-3">
        <button class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all">
          📥 Export CSV
        </button>
        <button class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold shadow-md transition-all">
          + New Record
        </button>
      </div>
    </div>

    <!-- KPI STAT CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-8">
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Records</div>
        <div class="text-3xl font-extrabold text-white mt-2">1,248</div>
        <div class="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1">
          <span>↑ 18.2%</span> <span class="text-slate-500">vs last month</span>
        </div>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Pipeline</div>
        <div class="text-3xl font-extrabold text-white mt-2">342</div>
        <div class="text-xs text-amber-400 font-semibold mt-2 flex items-center gap-1">
          <span>⚡ High Intent</span> <span class="text-slate-500">requiring follow-up</span>
        </div>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Response Time</div>
        <div class="text-3xl font-extrabold text-white mt-2">8.4s</div>
        <div class="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1">
          <span>🎯 SLA Met</span> <span class="text-slate-500">under 10s target</span>
        </div>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversion Yield</div>
        <div class="text-3xl font-extrabold text-white mt-2">32.6%</div>
        <div class="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1">
          <span>↑ 4.1%</span> <span class="text-slate-500">efficiency index</span>
        </div>
      </div>
    </div>

    <!-- SEARCH & FILTERS -->
    <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      <div class="w-full sm:w-80 relative">
        <input type="text" placeholder="Search by name, email, or record ID..." class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 text-xs" />
        <span class="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
      </div>
      <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
        <button class="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">All (1,248)</button>
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold">Active (342)</button>
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold">Pending Review (88)</button>
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold">Archived (818)</button>
      </div>
    </div>

    <!-- DATA GRID TABLE -->
    <div class="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <th class="py-3.5 px-6">Record Name</th>
              <th class="py-3.5 px-6">Channel / Type</th>
              <th class="py-3.5 px-6">Status</th>
              <th class="py-3.5 px-6">Priority</th>
              <th class="py-3.5 px-6">Assigned Owner</th>
              <th class="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80">
            <tr class="hover:bg-slate-800/40 transition-colors">
              <td class="py-4 px-6 font-semibold text-white">Sarah Jenkins</td>
              <td class="py-4 px-6 text-slate-400">Enterprise Pilot Ingestion</td>
              <td class="py-4 px-6"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Qualified</span></td>
              <td class="py-4 px-6"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">High</span></td>
              <td class="py-4 px-6 text-slate-300">Marcus Vance</td>
              <td class="py-4 px-6 text-right"><button class="text-amber-400 hover:text-amber-300 font-semibold">Inspect</button></td>
            </tr>
            <tr class="hover:bg-slate-800/40 transition-colors">
              <td class="py-4 px-6 font-semibold text-white">David Miller</td>
              <td class="py-4 px-6 text-slate-400">Direct Inbound Callback</td>
              <td class="py-4 px-6"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">In Review</span></td>
              <td class="py-4 px-6"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">Medium</span></td>
              <td class="py-4 px-6 text-slate-300">Rachel Lee</td>
              <td class="py-4 px-6 text-right"><button class="text-amber-400 hover:text-amber-300 font-semibold">Inspect</button></td>
            </tr>
            <tr class="hover:bg-slate-800/40 transition-colors">
              <td class="py-4 px-6 font-semibold text-white">Elena Rostova</td>
              <td class="py-4 px-6 text-slate-400">VIP Private Client Request</td>
              <td class="py-4 px-6"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Active</span></td>
              <td class="py-4 px-6"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400">Urgent</span></td>
              <td class="py-4 px-6 text-slate-300">Derrick Tan</td>
              <td class="py-4 px-6 text-right"><button class="text-amber-400 hover:text-amber-300 font-semibold">Inspect</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</div>`;
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
