import { Bot } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden tech-grid">
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-8 text-center relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,210,255,0.4)] group-hover:scale-105 transition-transform duration-200">
            <Bot className="w-7 h-7 text-black" />
          </div>
          <div className="text-left">
            <h1 className="font-extrabold text-2xl tracking-wider text-white">ELMO</h1>
            <p className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">
              AI Workforce Operating System
            </p>
          </div>
        </Link>
      </div>

      {/* Main Auth Container */}
      <div className="w-full max-w-md relative z-10">{children}</div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-elmo-textDim relative z-10">
        <p>Phase 1 — Secure Technical Foundation</p>
        <p className="text-[10px] mt-1 text-elmo-textDim/80">
          Supabase Auth • Row Level Security • RBAC
        </p>
      </div>
    </div>
  );
}
