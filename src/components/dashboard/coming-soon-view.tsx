import { LucideIcon, Bot, ShieldCheck, Sparkles } from "lucide-react";

interface ComingSoonViewProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  phase?: string;
  featuresPreview: string[];
}

export function ComingSoonView({
  title,
  subtitle,
  icon: Icon,
  phase = "Phase 2+",
  featuresPreview,
}: ComingSoonViewProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#060A14]/90 border border-[#14233D] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#081020] border border-[#182A45] flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.2)]">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,210,255,0.15)]">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#081020] border border-[#162744] text-xs text-zinc-400 font-mono">
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span>Reserved for ELMO AI CEO</span>
        </div>
      </div>

      {/* Feature Preview Card */}
      <div className="p-8 rounded-2xl bg-[#060A14]/90 border border-[#14233D] space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Planned Capabilities ({phase})</span>
          </div>
          <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Foundation Architecture Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featuresPreview.map((feature, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#081020]/80 border border-[#162744] flex items-start gap-3"
            >
              <span className="w-6 h-6 rounded-md bg-[#0A1426] border border-[#1C3050] text-cyan-300 text-xs font-mono flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed">{feature}</p>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00D2FF]"></span>
            <span className="font-medium">Phase 1 Technical Status:</span>
            <span className="text-zinc-400">
              TypeScript interfaces, data contracts, and security boundaries are established.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
