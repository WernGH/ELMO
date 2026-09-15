"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  Users,
  CheckSquare,
  Target,
  Database,
  Zap,
  Boxes,
  ShieldAlert,
  Activity,
  Settings,
  ChevronRight,
  Radio,
  Filter,
  FormInput,
  Mail,
  BarChart3,
} from "lucide-react";
import { NAVIGATION_ITEMS, SAAS_NAVIGATION_ITEMS, ELMO_IDENTITY } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Cpu,
  Users,
  CheckSquare,
  Target,
  Database,
  Zap,
  Boxes,
  ShieldAlert,
  Activity,
  Settings,
  Filter,
  FormInput,
  Mail,
  BarChart3,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-[#050811] border-r border-[#121E33] flex flex-col h-screen select-none relative z-20">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-[#121E33]">
        <Link href="/overview" className="flex items-center gap-3 group">
          {/* Futuristic Tech Mark */}
          <div className="relative w-10 h-10 rounded-xl bg-[#091120] border border-[#1A2D4C] flex items-center justify-center group-hover:border-cyan-400/60 transition-all duration-300 shadow-[0_0_20px_rgba(0,210,255,0.3)]">
            <span className="font-mono font-black text-sm text-cyan-400 tracking-tighter">
              EL
            </span>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-sm animate-pulse shadow-[0_0_8px_#00D2FF]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm tracking-wider text-zinc-100 group-hover:text-cyan-400 transition-colors">
                {ELMO_IDENTITY.name}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/30">
                SAAS
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono tracking-tight">
              Funnel & AI Executive
            </p>
          </div>
        </Link>
      </div>

      {/* Status Strip */}
      <div className="px-4 py-2 bg-[#080D1A] border-b border-[#121E33] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_8px_#00D2FF]" />
          </span>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-xs font-bold font-mono text-zinc-100 tracking-wider">
                ELMO : ONLINE
              </p>
            </div>
            <p className="text-[10px] text-zinc-400 font-sans">Ready to work</p>
          </div>
        </div>
        <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30 shadow-[0_0_8px_rgba(0,210,255,0.2)]">
          v1.0
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-[#121E33]">
        {/* Funnel SaaS Suite */}
        <div className="px-3 pb-1 pt-2 text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-500/80">
          Funnel & Marketing SaaS
        </div>
        {SAAS_NAVIGATION_ITEMS.map((item) => {
          const Icon = iconMap[item.iconName] || LayoutDashboard;
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-950/60 to-cyan-950/40 text-cyan-200 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,210,255,0.25)] font-semibold"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-[#0A1324]/80 border border-transparent"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-cyan-400 rounded-r shadow-[0_0_12px_rgba(0,210,255,1)]" />
              )}
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )}
                />
                <span className="font-sans">{item.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </div>
            </Link>
          );
        })}

        {/* Command Matrix */}
        <div className="px-3 pb-1 pt-3 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
          Command Matrix
        </div>
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = iconMap[item.iconName] || LayoutDashboard;
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-950/60 to-cyan-950/40 text-cyan-200 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,210,255,0.25)] font-semibold"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-[#0A1324]/80 border border-transparent"
              )}
            >
              {/* Left active glowing indicator strip */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-cyan-400 rounded-r shadow-[0_0_12px_rgba(0,210,255,1)]" />
              )}

              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-cyan-400"
                      : "text-zinc-500 group-hover:text-zinc-300"
                  )}
                />
                <span className="font-sans">{item.name}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span
                    className={cn(
                      "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono font-medium",
                      item.badge === "AI CEO" || item.name === "ELMO"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(0,210,255,0.3)]"
                        : "bg-[#0B1526] text-zinc-400 border border-[#162744]"
                    )}
                  >
                    {item.badge === "AI CEO" ? "CORE AI" : item.badge}
                  </span>
                )}
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Telemetry */}
      <div className="p-3.5 border-t border-[#121E33] text-[11px] font-mono text-zinc-400 flex items-center justify-between bg-[#04070E]">
        <span className="text-[10px] text-zinc-500 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-cyan-400" />
          SUPABASE RLS
        </span>
        <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_#00D2FF]" />
          ACTIVE
        </span>
      </div>
    </aside>
  );
}
