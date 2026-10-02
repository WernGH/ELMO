"use client";

import React, { useState } from "react";
import { X, Target, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

interface OutcomeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitOutcome: (title: string, targetMetric?: { name: string; targetValue: string }) => Promise<void>;
}

export const OutcomeEntryModal: React.FC<OutcomeEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmitOutcome,
}) => {
  const [outcomeTitle, setOutcomeTitle] = useState("");
  const [metricName, setMetricName] = useState("");
  const [metricTarget, setMetricTarget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const presets = [
    {
      title: "Increase qualified leads by 30%",
      metric: { name: "Qualified Leads", targetValue: "+30%" },
    },
    {
      title: "Automate lead qualification and follow-up sequence",
      metric: { name: "Lead Response Time", targetValue: "< 5 mins" },
    },
    {
      title: "Launch high-converting landing page and marketing funnel",
      metric: { name: "Conversion Rate", targetValue: "3.5%" },
    },
    {
      title: "Audit and optimize operational sales pipeline bottlenecks",
      metric: { name: "Pipeline Velocity", targetValue: "+25%" },
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const targetMetric =
        metricName.trim() && metricTarget.trim()
          ? { name: metricName.trim(), targetValue: metricTarget.trim() }
          : undefined;

      await onSubmitOutcome(outcomeTitle.trim(), targetMetric);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectPreset = (p: typeof presets[0]) => {
    setOutcomeTitle(p.title);
    setMetricName(p.metric.name);
    setMetricTarget(p.metric.targetValue);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 sm:p-8 text-white space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#00FF66]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Enter Desired Business Outcome
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                ELMO determines required capabilities, workers, and tools.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              What outcome do you want to achieve?
            </label>
            <textarea
              value={outcomeTitle}
              onChange={(e) => setOutcomeTitle(e.target.value)}
              placeholder="e.g. Increase qualified leads by 30% through targeted market positioning and follow-up automation"
              rows={3}
              required
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-all resize-none"
            />
          </div>

          {/* Optional Metric Target */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Metric Name (Optional)</label>
              <input
                type="text"
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
                placeholder="e.g. Qualified Leads"
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF66]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Target Value (Optional)</label>
              <input
                type="text"
                value={metricTarget}
                onChange={(e) => setMetricTarget(e.target.value)}
                placeholder="e.g. +30%"
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF66]"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00FF66]" /> Suggested High-Value Outcomes
            </span>
            <div className="space-y-1.5">
              {presets.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => selectPreset(p)}
                  className="w-full text-left p-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors flex items-center justify-between"
                >
                  <span className="truncate pr-2">{p.title}</span>
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/20 shrink-0">
                    {p.metric.targetValue}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !outcomeTitle.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00FF66] hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,255,102,0.3)]"
            >
              <Target className="w-4 h-4 fill-current" />
              {isSubmitting ? "Orchestrating..." : "Submit Outcome to ELMO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
