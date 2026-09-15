"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Filter,
  Plus,
  ArrowRight,
  Bot,
  Sparkles,
  Layers,
  BarChart2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { FunnelService } from "@/services/funnel.service";
import { AuthService } from "@/services/auth.service";
import { FunnelRow } from "@/lib/supabase/mock-store";
import { FunnelType } from "@/types/database.types";

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<FunnelRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState("");
  const [newFunnelType, setNewFunnelType] = useState<FunnelType>("Lead Generation");
  const [newFunnelGoal, setNewFunnelGoal] = useState("");
  const [activeOrgId, setActiveOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000001");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const funnelService = FunnelService.getInstance();
  const authService = AuthService.getInstance();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const session = await authService.getSession();
      const org = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
      const usr = session?.user?.id || "00000000-0000-0000-0000-000000000001";
      setActiveOrgId(org);
      setUserId(usr);

      const res = await funnelService.getFunnels(usr, org);
      if (res.data) {
        setFunnels(res.data);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleCreateFunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFunnelName.trim()) return;

    setStatusMessage(null);
    const res = await funnelService.createFunnel({
      userId,
      organizationId: activeOrgId,
      name: newFunnelName.trim(),
      funnelType: newFunnelType,
      goal: newFunnelGoal.trim() || undefined,
      status: "active",
      businessContext: {
        funnel_goal: newFunnelGoal.trim(),
        funnel_type: newFunnelType,
      },
    });

    if (res.data) {
      setFunnels((prev) => [res.data!, ...prev]);
      setNewFunnelName("");
      setNewFunnelGoal("");
      setIsCreating(false);
      setStatusMessage("Funnel created successfully.");
    } else {
      setStatusMessage(res.error || "Failed to create funnel.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#060A14]/90 border border-[#14233D] relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,210,255,0.35)] flex-shrink-0">
            <Filter className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Marketing & Sales Funnels</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 1 Core
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Multi-step customer journeys governed by ELMO conversational AI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/elmo"
            className="px-4 py-2 rounded-xl bg-[#0B172E] border border-cyan-500/40 text-cyan-300 font-bold text-xs hover:bg-cyan-950/40 flex items-center gap-2 transition-colors"
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Ask ELMO to Build Funnel</span>
          </Link>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Funnel</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-[#0B1A2F] border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Creation Modal / Inline Drawer */}
      {isCreating && (
        <form
          onSubmit={handleCreateFunnel}
          className="p-6 rounded-2xl bg-[#081224] border border-cyan-500/40 space-y-4 animate-fade-in"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Define Funnel Blueprint</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Funnel Name</label>
              <input
                type="text"
                placeholder="e.g. High-Ticket Coaching Funnel"
                value={newFunnelName}
                onChange={(e) => setNewFunnelName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Funnel Type</label>
              <select
                value={newFunnelType}
                onChange={(e) => setNewFunnelType(e.target.value as FunnelType)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="Lead Generation">Lead Generation</option>
                <option value="Webinar">Webinar</option>
                <option value="Coaching">Coaching</option>
                <option value="Course">Course</option>
                <option value="Product">Product</option>
                <option value="Service">Service</option>
                <option value="Appointment">Appointment</option>
                <option value="Lead Magnet">Lead Magnet</option>
                <option value="E-commerce">E-commerce</option>
                <option value="SaaS">SaaS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Primary Goal</label>
              <input
                type="text"
                placeholder="e.g. Capture 500 webinar registrations"
                value={newFunnelGoal}
                onChange={(e) => setNewFunnelGoal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white placeholder:text-zinc-600 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-400 text-black font-bold text-xs hover:brightness-110"
            >
              Save Blueprint
            </button>
          </div>
        </form>
      )}

      {/* Funnels Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Loading funnel architectures...</span>
        </div>
      ) : funnels.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#060A14]/80 border border-[#14233D] space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#0B1526] text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Funnels Created Yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Create your first funnel manually, or instruct ELMO in chat: &ldquo;ELMO, create a webinar funnel for me.&rdquo;
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs hover:brightness-110"
          >
            Create Your First Funnel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map((funnel) => {
            const bContext = (funnel.business_context as Record<string, unknown>) || {};
            return (
              <div
                key={funnel.id}
                className="p-5 rounded-2xl bg-[#060A14]/90 border border-[#14233D] hover:border-cyan-500/50 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {funnel.funnel_type}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        funnel.status === "active"
                          ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {funnel.status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {funnel.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {funnel.goal || (bContext.funnel_goal as string) || "No goal specified."}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#121E33] flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {new Date(funnel.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/elmo?funnelId=${funnel.id}`}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-sans text-xs font-semibold"
                  >
                    <span>Manage with ELMO</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
