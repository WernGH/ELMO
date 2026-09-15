"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Users, ShoppingBag, Eye, Loader2, ArrowUpRight } from "lucide-react";
import { AnalyticsService, FunnelMetricsSummary } from "@/services/analytics.service";
import { FunnelService } from "@/services/funnel.service";
import { AuthService } from "@/services/auth.service";
import { AnalyticsEventRow, FunnelRow } from "@/lib/supabase/mock-store";

export default function AnalyticsPage() {
  const [funnels, setFunnels] = useState<FunnelRow[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [metrics, setMetrics] = useState<FunnelMetricsSummary | null>(null);
  const [events, setEvents] = useState<AnalyticsEventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000001");

  const analyticsService = AnalyticsService.getInstance();
  const funnelService = FunnelService.getInstance();
  const authService = AuthService.getInstance();

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const session = await authService.getSession();
      const org = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
      const usr = session?.user?.id || "00000000-0000-0000-0000-000000000001";
      setActiveOrgId(org);
      setUserId(usr);

      const [fRes, eRes] = await Promise.all([
        funnelService.getFunnels(usr, org),
        analyticsService.getEvents(usr, org),
      ]);

      if (fRes.data) {
        setFunnels(fRes.data);
        if (fRes.data.length > 0) {
          setSelectedFunnelId(fRes.data[0].id);
          const mRes = await analyticsService.getFunnelMetrics(usr, org, fRes.data[0].id);
          if (mRes.data) setMetrics(mRes.data);
        }
      }
      if (eRes.data) setEvents(eRes.data);
      setIsLoading(false);
    }
    init();
  }, []);

  const handleSelectFunnel = async (funnelId: string) => {
    setSelectedFunnelId(funnelId);
    if (funnelId) {
      const mRes = await analyticsService.getFunnelMetrics(userId, activeOrgId, funnelId);
      if (mRes.data) setMetrics(mRes.data);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#060A14]/90 border border-[#14233D] relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,210,255,0.35)] flex-shrink-0">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Event Analytics & Conversion</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 1 Core
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Event-based tracking architecture for visitors, opt-ins, purchases, and drop-off analysis.
            </p>
          </div>
        </div>

        {funnels.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Funnel:</span>
            <select
              value={selectedFunnelId}
              onChange={(e) => handleSelectFunnel(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#081224] border border-[#162744] text-xs text-cyan-300 font-mono focus:border-cyan-400 focus:outline-none"
            >
              {funnels.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Aggregating telemetry signals...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#060A14]/90 border border-[#14233D] space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                <span>TOTAL VISITORS</span>
                <Eye className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-extrabold text-white font-mono">
                {metrics?.totalVisitors ?? 0}
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">Top of funnel visits</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#060A14]/90 border border-[#14233D] space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                <span>LEADS CAPTURED</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-white font-mono">
                {metrics?.totalLeads ?? 0}
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">Form & opt-in conversions</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#060A14]/90 border border-[#14233D] space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                <span>CONVERSION RATE</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-400 font-mono">
                {metrics?.conversionRate ?? 0}%
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">Leads / Visitors</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#060A14]/90 border border-[#14233D] space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                <span>PURCHASES</span>
                <ShoppingBag className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-extrabold text-white font-mono">
                {metrics?.totalPurchases ?? 0}
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">Checkout conversions</p>
            </div>
          </div>

          {/* Live Events Audit Feed */}
          <div className="p-6 rounded-2xl bg-[#060A14]/90 border border-[#14233D] space-y-4">
            <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-cyan-300">
              Recent Conversion & Engagement Events ({events.length})
            </h3>

            {events.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6 font-mono">
                No analytics events recorded yet. Submit forms or trigger page visits to generate signals.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-[#081020] border border-[#14233D] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-white font-semibold uppercase">{ev.event_type}</span>
                      {ev.funnel_id && <span className="text-zinc-500">Funnel: {ev.funnel_id}</span>}
                    </div>
                    <span className="text-zinc-500 text-[11px]">
                      {new Date(ev.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
