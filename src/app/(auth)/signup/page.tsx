"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Building, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { AuthService } from "@/services/auth.service";

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authService = AuthService.getInstance();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authService.signUp({
        displayName,
        email,
        password,
        organizationName: organizationName || `${displayName}'s Enterprise`,
      });

      if (response.error) {
        setError(response.error);
      } else {
        router.push("/overview");
      }
    } catch {
      setError("An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 rounded-2xl border border-cyan-500/20 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">Initialize Organization</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Deploy ELMO as your company&apos;s AI CEO
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-zinc-200 mb-1">
            Your Full Name / Superior Title
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Elena Rostova (Owner)"
              className="w-full text-xs bg-[#081020] border border-[#162744] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-200 mb-1">
            Company / Organization Name
          </label>
          <div className="relative">
            <Building className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g. Apex Autonomous Technologies"
              className="w-full text-xs bg-[#081020] border border-[#162744] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-200 mb-1">
            Work Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@company.com"
              className="w-full text-xs bg-[#081020] border border-[#162744] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-200 mb-1">
            Secure Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full text-xs bg-[#081020] border border-[#162744] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-3 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(0,210,255,0.4)] cursor-pointer font-mono"
        >
          {loading ? (
            <span>Deploying Foundation...</span>
          ) : (
            <>
              <span>Initialize Company & Appoint ELMO</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-[#162744] flex items-center justify-center text-xs text-zinc-400 gap-1 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
        Multi-Tenant Row Level Security Enforced
      </div>

      <div className="mt-4 text-center text-xs text-zinc-400">
        Already registered?{" "}
        <Link href="/login" className="text-white hover:text-cyan-400 font-semibold transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  );
}
