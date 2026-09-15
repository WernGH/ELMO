"use client";

import { useState } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  X,
  Copy,
  Check,
  Code,
  Eye,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { PreviewPayload } from "@/services/agentic/types/agentic.types";

interface WebsitePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: PreviewPayload | null;
  onApplyEdit?: (prompt: string) => void;
}

export function WebsitePreviewModal({
  isOpen,
  onClose,
  preview,
  onApplyEdit,
}: WebsitePreviewModalProps) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [copied, setCopied] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");

  if (!isOpen || !preview) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(preview.renderedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrompt.trim() || !onApplyEdit) return;
    onApplyEdit(editPrompt);
    setEditPrompt("");
    onClose();
  };

  const viewportWidthClass =
    viewport === "mobile"
      ? "max-w-[375px] h-[667px] shadow-2xl rounded-3xl border-8 border-slate-800"
      : viewport === "tablet"
      ? "max-w-[768px] h-[900px] shadow-xl rounded-2xl border-4 border-slate-800"
      : "w-full h-full rounded-xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <span>{preview.pageTitle}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  /{preview.slug}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {preview.sectionsCount} structured components • AI Web/Coding Specialist
              </p>
            </div>
          </div>

          {/* Controls: Viewports & Modes */}
          <div className="flex items-center gap-3">
            {/* Viewport Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-slate-400">
              <button
                onClick={() => setViewport("desktop")}
                title="Desktop (1280px)"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewport === "desktop" ? "bg-slate-800 text-amber-400 shadow-sm" : "hover:text-white"
                }`}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewport("tablet")}
                title="Tablet (768px)"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewport === "tablet" ? "bg-slate-800 text-amber-400 shadow-sm" : "hover:text-white"
                }`}
              >
                <Tablet className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewport("mobile")}
                title="Mobile (375px)"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewport === "mobile" ? "bg-slate-800 text-amber-400 shadow-sm" : "hover:text-white"
                }`}
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            {/* Visual vs Code Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-slate-400">
              <button
                onClick={() => setViewMode("visual")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "visual" ? "bg-slate-800 text-white" : "hover:text-white"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setViewMode("code")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "code" ? "bg-slate-800 text-white" : "hover:text-white"
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                <span>Source</span>
              </button>
            </div>

            {/* Copy HTML Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy HTML"}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-950/60 p-4 flex items-center justify-center overflow-auto">
          {viewMode === "visual" ? (
            <div className={`transition-all duration-300 w-full flex items-center justify-center`}>
              <iframe
                title="Page Preview"
                srcDoc={preview.renderedHtml}
                className={`${viewportWidthClass} bg-slate-950 border border-slate-800 transition-all duration-300`}
                sandbox="allow-scripts"
              />
            </div>
          ) : (
            <div className="w-full h-full max-w-5xl rounded-2xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-slate-300 overflow-auto">
              <pre className="whitespace-pre-wrap">{preview.renderedHtml}</pre>
            </div>
          )}
        </div>

        {/* Bottom Quick-Edit Bar */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>💡 Quick suggestions:</span>
            <button
              onClick={() => onApplyEdit && onApplyEdit("Make the hero section more premium")}
              className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-amber-300 text-[11px] border border-slate-800"
            >
              "Make hero more premium"
            </button>
            <button
              onClick={() => onApplyEdit && onApplyEdit("Change the CTA to Book a Consultation")}
              className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-amber-300 text-[11px] border border-slate-800"
            >
              "Change CTA"
            </button>
            <button
              onClick={() => onApplyEdit && onApplyEdit("Make this mobile friendly")}
              className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-amber-300 text-[11px] border border-slate-800"
            >
              "Optimize mobile"
            </button>
          </div>

          <form onSubmit={handleQuickEdit} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Ask ELMO to edit this page..."
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 w-full sm:w-64"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all whitespace-nowrap"
            >
              Apply Edit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
