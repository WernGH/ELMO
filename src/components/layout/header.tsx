"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  ChevronDown,
  LogOut,
  Plus,
  Shield,
  User,
  Bell,
  Clock,
  Radio,
} from "lucide-react";
import { AuthService } from "@/services/auth.service";
import { OrganizationService } from "@/services/organization.service";
import { OrganizationWithMemberRole } from "@/types/organization.types";
import { UserSession } from "@/types/auth.types";
import { ELMOStatus } from "@/components/ui/ELMOStatus";

interface HeaderProps {
  currentOrgId?: string;
  onOrgChange?: (orgId: string) => void;
}

export function Header({ currentOrgId, onOrgChange }: HeaderProps) {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithMemberRole[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrganizationWithMemberRole | null>(null);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().replace("T", " • ").slice(0, 19) + " UTC"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);

  const authService = AuthService.getInstance();
  const orgService = OrganizationService.getInstance();

  useEffect(() => {
    async function loadData() {
      const sess = await authService.getSession();
      setSession(sess);

      const userId = sess?.user?.id || "00000000-0000-0000-0000-000000000001";
      const orgs = await orgService.getUserOrganizations(userId);
      setOrganizations(orgs);

      const targetId =
        currentOrgId || sess?.activeOrganizationId || (orgs.length > 0 ? orgs[0].id : null);
      if (targetId) {
        const selected = orgs.find((o) => o.id === targetId) || orgs[0] || null;
        setActiveOrg(selected);
        if (onOrgChange && selected) onOrgChange(selected.id);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrgId]);

  const handleOrgSelect = (org: OrganizationWithMemberRole) => {
    setActiveOrg(org);
    setIsOrgDropdownOpen(false);
    if (onOrgChange) onOrgChange(org.id);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("elmo_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.activeOrganizationId = org.id;
        localStorage.setItem("elmo_session", JSON.stringify(parsed));
      }
    }
    router.refresh();
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newOrgName.trim();
    if (!trimmed) return;

    setIsSubmittingOrg(true);
    setCreateOrgError(null);

    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000001";
    const { data: newOrg, error } = await orgService.createOrganization(
      userId,
      trimmed
    );

    setIsSubmittingOrg(false);

    if (error || !newOrg) {
      setCreateOrgError(error || "Failed to create organization.");
      return;
    }

    const orgWithRole: OrganizationWithMemberRole = {
      ...newOrg,
      role: "owner",
    };
    setOrganizations((prev) => [orgWithRole, ...prev]);
    setActiveOrg(orgWithRole);
    setIsCreatingOrg(false);
    setNewOrgName("");
    setCreateOrgError(null);
    setIsOrgDropdownOpen(false);

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("elmo_session");
      const parsed = stored ? JSON.parse(stored) : {};
      parsed.activeOrganizationId = newOrg.id;
      localStorage.setItem("elmo_session", JSON.stringify(parsed));
    }

    if (onOrgChange) onOrgChange(newOrg.id);
    router.refresh();
  };

  const handleLogout = async () => {
    await authService.signOut();
    router.push("/login");
  };

  return (
    <header className="h-16 border-b border-[#121E33] bg-[#050811]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left Area: Organization Switcher */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => {
              setIsOrgDropdownOpen(!isOrgDropdownOpen);
              setIsUserDropdownOpen(false);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#081020] border border-[#162744] hover:border-cyan-400/40 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Building className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-100 truncate max-w-[130px] font-sans">
                  {activeOrg?.name || "Select Org"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider block">
                ORG: {activeOrg?.role || "Owner"}
              </span>
            </div>
          </button>

          {/* Org Dropdown */}
          {isOrgDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-[#081020] border border-[#182A45] rounded-xl shadow-2xl p-2 z-50">
              <div className="px-2 py-1.5 text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                Switch Organization
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleOrgSelect(org)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      activeOrg?.id === org.id
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-semibold shadow-[0_0_10px_rgba(0,210,255,0.15)]"
                        : "text-zinc-300 hover:text-white hover:bg-[#0E1A30]"
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#0E1A30] font-mono text-zinc-400 border border-[#1C3050]">
                      {org.role}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-[#182A45] mt-2 pt-2">
                {isCreatingOrg ? (
                  <form onSubmit={handleCreateOrg} className="p-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Organization name..."
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      disabled={isSubmittingOrg}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#0C172B] border border-[#1F3555] text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                      autoFocus
                    />
                    {createOrgError && (
                      <p className="text-[10px] text-red-400 font-mono leading-tight">{createOrgError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmittingOrg || !newOrgName.trim()}
                        className="flex-1 text-[11px] font-semibold py-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-black rounded-md hover:from-cyan-400 hover:to-blue-500 transition-colors shadow-[0_0_10px_rgba(0,210,255,0.3)] disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {isSubmittingOrg ? "Creating..." : "Create"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingOrg(false);
                          setCreateOrgError(null);
                        }}
                        className="px-2 text-[11px] text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreatingOrg(true)}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-cyan-400 hover:bg-[#0E1A30] rounded-lg flex items-center gap-2 transition-colors font-mono"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Organization
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Mission Objective & Status Indicator */}
      <div className="hidden lg:flex items-center gap-4">
        {/* Mission Objective */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#081020] border border-[#162744] text-[11px] font-mono text-zinc-300">
          <span className="text-cyan-400 font-bold tracking-wider">MISSION:</span>
          <span className="text-zinc-200">Autonomous Operations & Intelligence</span>
        </div>

        {/* System Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/40 text-xs font-mono text-cyan-300 shadow-[0_0_12px_rgba(0,210,255,0.2)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_8px_#00D2FF]" />
          </span>
          <span className="font-bold tracking-wider">ELMO ONLINE // ALL SYSTEMS ONLINE</span>
        </div>

        {/* Live Clock / Date */}
        {currentTime && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#081020] border border-[#162744] text-[11px] font-mono text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentTime}</span>
          </div>
        )}
      </div>

      {/* Right Controls: Operator Badge + Notifications + User Menu */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Operator Role Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#081020] border border-cyan-500/30 text-xs font-mono shadow-[0_0_10px_rgba(0,210,255,0.1)]">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-zinc-200">SYSTEM OPERATOR</span>
          <span className="text-[10px] text-cyan-400 font-bold tracking-wider uppercase">
            [Owner]
          </span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsUserDropdownOpen(false);
              setIsOrgDropdownOpen(false);
            }}
            className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#0E1A30] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00D2FF]" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-[#081020] border border-[#182A45] rounded-xl shadow-2xl p-3 z-50 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#182A45] text-xs">
                <span className="font-bold text-zinc-200">EXECUTIVE ALERTS</span>
                <span className="text-[10px] text-cyan-400">1 NEW</span>
              </div>
              <div className="py-2.5 space-y-2 text-xs">
                <div className="p-2 rounded bg-[#0B1526] border border-[#1C3050] text-zinc-300">
                  <p className="text-[10px] text-amber-400 font-bold">APPROVAL PENDING</p>
                  <p className="font-sans text-[11px] text-zinc-300 mt-0.5">
                    Marketing Agent ready to launch Meta Ads campaign ($500/mo).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
              setIsOrgDropdownOpen(false);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#0E1A30] transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0A1426] border border-[#1C3050] flex items-center justify-center text-cyan-400">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-zinc-100 leading-none font-sans">
                {session?.user?.displayName || "Human Owner"}
              </p>
              <p className="text-[10px] text-zinc-400 leading-none mt-1 truncate max-w-[120px] font-mono">
                {session?.user?.email || "owner@coai.network"}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-52 bg-[#081020] border border-[#182A45] rounded-xl shadow-2xl p-2 z-50 font-sans">
              <div className="px-2 py-1.5 border-b border-[#182A45] mb-1">
                <p className="text-xs font-semibold text-white">
                  {session?.user?.displayName || "Human Owner"}
                </p>
                <p className="text-[10px] text-zinc-400 font-mono truncate">
                  {session?.user?.email}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsUserDropdownOpen(false);
                  router.push("/settings");
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-[#0E1A30] rounded-lg flex items-center gap-2 transition-colors"
              >
                <Building className="w-3.5 h-3.5" />
                Workspace Settings
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg flex items-center gap-2 transition-colors mt-1 font-mono"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
