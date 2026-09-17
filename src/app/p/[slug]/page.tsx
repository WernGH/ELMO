"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { WebCodingAgentService } from "@/services/agentic/web-coding/web-coding-agent.service";
import { WebPreviewService } from "@/services/agentic/web-coding/web-preview.service";
import { WebsitePageModel, WebsiteStyleConfig } from "@/services/agentic/types/agentic.types";
import { PageService } from "@/services/page.service";
import { Download, ExternalLink } from "lucide-react";

export default function PublicPublishedPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [page, setPage] = useState<WebsitePageModel | null>(null);
  const [styles, setStyles] = useState<WebsiteStyleConfig | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function loadPage() {
      try {
        const agent = WebCodingAgentService.getInstance();
        // 1. Search WebCodingAgent project cache
        const project =
          agent.getLatestProject("11111111-1111-1111-1111-111111111111") ||
          agent.getLatestProject("org-test-dev-001");

        if (project) {
          const matchingPage = project.pages.find((p) => p.slug === slug) || project.pages[0];
          if (matchingPage) {
            setPage(matchingPage);
            setStyles(project.styles);
            const preview = WebPreviewService.getInstance().generatePreview(matchingPage, project.styles);
            setRenderedHtml(preview.renderedHtml);
            return;
          }
        }

        // 2. Fallback: Search PageService
        const pageService = PageService.getInstance();
        const { page: dbPage, organizationId: dbOrgId } = await pageService.getPublicPageBySlug(slug);
        if (dbPage) {
          const model: WebsitePageModel = {
            id: dbPage.id,
            projectId: (dbPage as any).funnel_id || "proj-default",
            organizationId: dbOrgId || (dbPage as any).organization_id || "11111111-1111-1111-1111-111111111111",
            name: dbPage.name || "Published Page",
            slug: dbPage.slug,
            pageType: "landing_page",
            status: "published",
            title: dbPage.title || dbPage.name || "Published Page",
            sections: [],
            createdAt: dbPage.created_at || new Date().toISOString(),
            updatedAt: dbPage.updated_at || new Date().toISOString(),
          };
          setPage(model);
          const defaultStyles: WebsiteStyleConfig = {
            primaryColor: "#2563EB",
            secondaryColor: "#1E293B",
            accentColor: "#38BDF8",
            backgroundColor: "#0F172A",
            textColor: "#F8FAFC",
            fontHeading: "Inter, sans-serif",
            fontBody: "Inter, sans-serif",
            borderRadius: "xl",
            themeMode: "dark",
          };
          setStyles(defaultStyles);
          const preview = WebPreviewService.getInstance().generatePreview(model, defaultStyles);
          setRenderedHtml(preview.renderedHtml);
        }
      } catch {
        // Handled gracefully
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [slug]);

  // Client-side HTML export
  const handleExportHtml = () => {
    if (!renderedHtml) return;
    const blob = new Blob([renderedHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug || "landing-page"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="h-10 w-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Loading Published Experience...</p>
      </div>
    );
  }

  if (!page || !renderedHtml) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 px-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-2xl font-bold mb-6">
          ⚡
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Page Not Published Yet</h1>
        <p className="mt-2 text-sm text-slate-400 max-w-md">
          The requested page <span className="text-amber-400 font-mono">/p/{slug}</span> has not been generated or published.
        </p>
        <a
          href="/"
          className="mt-6 px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white hover:border-slate-700 transition-all"
        >
          Return to ELMO Cockpit
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-slate-950">
      {/* Floating Action Controls */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-2xl">
        <button
          onClick={handleExportHtml}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
          title="Download standalone HTML file"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          Export HTML
        </button>
        <a
          href={`/p/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
          title="Open in new window"
        >
          <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          Open in New Window
        </a>
      </div>

      {/* Rendered Live Page */}
      <div
        className="w-full min-h-screen"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
}
