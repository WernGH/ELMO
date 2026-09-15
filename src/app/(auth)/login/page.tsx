"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { AuthService } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authService = AuthService.getInstance();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authService.signIn({ email, password });
      if (response.error) {
        setError(response.error);
      } else {
        router.push("/overview");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("founder@elmo-ai.com");
    setPassword("password123");
  };

  return (
    <div className="glass-panel p-8 rounded-2xl border border-cyan-500/20 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">Executive Authentication</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Access the ELMO AI Company Command Center
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="executive@company.com"
              className="w-full text-xs bg-[#081020] border border-[#162744] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold text-zinc-200">
              Password
            </label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-xs bg-[#081020] border border-[#162744] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(0,210,255,0.4)] cursor-pointer font-mono"
        >
          {loading ? (
            <span>Authenticating...</span>
          ) : (
            <>
              <span>Authenticate & Enter Command</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Demo Credentials Helper */}
      <div className="mt-6 pt-4 border-t border-[#162744] flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleFillDemo}
          className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Fill Demo Executive Account
        </button>
        <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-mono">
          <ShieldCheck className="w-3 h-3" /> RLS Protected
        </span>
      </div>

      <div className="mt-4 text-center text-xs text-zinc-400">
        Don&apos;t have an organization yet?{" "}
        <Link href="/signup" className="text-white hover:text-cyan-400 font-semibold transition-colors">
          Initialize Company
        </Link>
      </div>
    </div>
  );
}
