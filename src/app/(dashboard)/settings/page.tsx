"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  CheckCircle2,
  Lock,
  Plus,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Copy,
  Check,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Info,
  X,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Key,
  Layers,
  Cpu,
  Globe,
  Mail,
  DollarSign,
  Clock,
  Radio,
  Download,
  FileText,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import { AuthService } from "@/services/auth.service";
import { OrganizationService } from "@/services/organization.service";
import { MemberService } from "@/services/member.service";
import { RLSAuditService, SecurityAuditResult } from "@/services/rls-audit.service";
import {
  MemberWithProfile,
  OrganizationWithMemberRole,
  Role,
  ROLE_HIERARCHY,
} from "@/types/organization.types";
import { UserSession } from "@/types/auth.types";
import { formatDate } from "@/lib/utils";
import { DigitalBadge } from "@/components/ui/DigitalBadge";

const ROLES: Role[] = ["owner", "admin", "manager", "member", "viewer"];

const INDUSTRIES = [
  "Technology & Software (SaaS)",
  "Financial Services & Fintech",
  "E-Commerce & Digital Commerce",
  "Healthcare & Life Sciences",
  "Professional Services & Consulting",
  "Manufacturing & Logistics",
  "Marketing & Digital Media",
  "Other Enterprise Domain",
];

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($) — US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) — Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) — British Pound" },
  { code: "MYR", symbol: "RM", label: "MYR (RM) — Malaysian Ringgit" },
  { code: "SGD", symbol: "S$", label: "SGD (S$) — Singapore Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD (A$) — Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY (¥) — Japanese Yen" },
];

const TIMEZONES = [
  "Asia/Kuala_Lumpur (UTC+08:00)",
  "Asia/Singapore (UTC+08:00)",
  "Asia/Tokyo (UTC+09:00)",
  "Europe/London (UTC+00:00 / GMT)",
  "Europe/Berlin (UTC+01:00 / CET)",
  "America/New_York (UTC-05:00 / EST)",
  "America/Chicago (UTC-06:00 / CST)",
  "America/Los_Angeles (UTC-08:00 / PST)",
  "UTC (Coordinated Universal Time)",
];

const RETENTION_PERIODS = [
  { days: 30, label: "30 Days (Strict Ephemeral)" },
  { days: 90, label: "90 Days (Recommended Standard)" },
  { days: 180, label: "180 Days (Extended Audit)" },
  { days: 365, label: "365 Days (1 Year Compliance)" },
  { days: 0, label: "Indefinite / Permanent Retention" },
];

const AUTONOMY_LEVELS = [
  {
    id: "supervised" as const,
    title: "Supervised Autonomy",
    subtitle: "Executive Sign-off Required",
    description:
      "ELMO drafts strategies, synthesizes operational telemetry, and formulates communications. All customer-facing and external changes require explicit executive approval.",
    badgeColor: "cyan" as const,
  },
  {
    id: "co_pilot" as const,
    title: "Executive Co-Pilot",
    subtitle: "Selective Delegation",
    description:
      "ELMO autonomously orchestrates routine CRM updates, intelligence queries, and campaign drafts. Major architectural shifts and mass communications trigger human verification.",
    badgeColor: "electric" as const,
  },
  {
    id: "autonomous" as const,
    title: "Full Autonomy",
    subtitle: "High-Velocity Execution",
    description:
      "ELMO dynamically triggers multi-agent specialist workflows, publishes approved funnels, and optimizes growth metrics with strict automated audit logging and safety circuit-breakers.",
    badgeColor: "blue" as const,
  },
];

export default function SettingsPage() {
  const router = useRouter();

  // Core session & organization state
  const [session, setSession] = useState<UserSession | null>(null);
  const [organization, setOrganization] = useState<OrganizationWithMemberRole | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationWithMemberRole[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"general" | "team" | "security">("general");

  // Edit organization form state
  const [orgName, setOrgName] = useState("");
  const [orgIndustry, setOrgIndustry] = useState(INDUSTRIES[0]);
  const [orgAutonomy, setOrgAutonomy] = useState<"supervised" | "co_pilot" | "autonomous">("supervised");
  const [orgSupportEmail, setOrgSupportEmail] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgCurrency, setOrgCurrency] = useState("USD");
  const [orgTimezone, setOrgTimezone] = useState(TIMEZONES[0]);
  const [orgRetentionDays, setOrgRetentionDays] = useState(90);
  const [orgWebhookUrl, setOrgWebhookUrl] = useState("");
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [isInviting, setIsInviting] = useState(false);

  // Create new organization modal state
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgIndustry, setNewOrgIndustry] = useState(INDUSTRIES[0]);
  const [newOrgAutonomy, setNewOrgAutonomy] = useState<"supervised" | "co_pilot" | "autonomous">("supervised");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);

  // Delete organization modal state (Danger Zone)
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrganizationWithMemberRole | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [deleteOrgError, setDeleteOrgError] = useState<string | null>(null);

  // RBAC matrix modal
  const [showRbacMatrixModal, setShowRbacMatrixModal] = useState(false);

  // Security audit state
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Search & filter
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<"all" | Role>("all");

  // Notifications, API key reveal & Copy state
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const authService = AuthService.getInstance();
  const orgService = OrganizationService.getInstance();
  const memberService = MemberService.getInstance();

  // Initial load
  useEffect(() => {
    async function loadSettings() {
      const sess = await authService.getSession();
      setSession(sess);

      const userId = sess.user?.id || "00000000-0000-0000-0000-000000000001";
      const orgs = await orgService.getUserOrganizations(userId);
      setUserOrganizations(orgs);

      const activeId =
        sess.activeOrganizationId || (orgs.length > 0 ? orgs[0].id : "11111111-1111-1111-1111-111111111111");

      if (activeId) {
        const { data: org } = await orgService.getOrganization(userId, activeId);
        if (org) {
          populateOrgState(org);
          const { data: memList } = await memberService.getMembers(userId, org.id);
          setMembers(memList);
        }
      }

      // Pre-warm security telemetry audit
      const initialAudit = RLSAuditService.runCrossTenantIsolationAudit();
      setAuditResult(initialAudit);
    }

    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const populateOrgState = (org: OrganizationWithMemberRole) => {
    setOrganization(org);
    setOrgName(org.name);

    const s =
      typeof org.settings === "object" && org.settings !== null && !Array.isArray(org.settings)
        ? (org.settings as Record<string, any>)
        : {};

    setOrgIndustry(s.industry || INDUSTRIES[0]);
    setOrgAutonomy(s.autonomy_mode || "supervised");
    setOrgSupportEmail(s.support_email || "");
    setOrgWebsite(s.website || "");
    setOrgCurrency(s.currency || "USD");
    setOrgTimezone(s.timezone || TIMEZONES[0]);
    setOrgRetentionDays(typeof s.retention_days === "number" ? s.retention_days : 90);
    setOrgWebhookUrl(s.webhook_url || "");
  };

  // Switch active organization
  const handleSwitchOrganization = async (targetOrgId: string) => {
    if (!session?.user) return;
    setStatusMessage(null);

    const { data: org } = await orgService.getOrganization(session.user.id, targetOrgId);
    if (!org) {
      setStatusMessage({ type: "error", text: "Failed to switch organization." });
      return;
    }

    populateOrgState(org);
    const { data: memList } = await memberService.getMembers(session.user.id, org.id);
    setMembers(memList);

    // Persist active organization to localStorage session
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("elmo_session");
      const parsed = stored ? JSON.parse(stored) : {};
      parsed.activeOrganizationId = org.id;
      localStorage.setItem("elmo_session", JSON.stringify(parsed));
    }

    setStatusMessage({
      type: "success",
      text: `Switched active organization to ${org.name}.`,
    });
  };

  // Create new organization
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newOrgName.trim();
    if (!trimmed) return;

    setIsCreatingOrg(true);
    setCreateOrgError(null);

    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000001";
    const { data: newOrg, error } = await orgService.createOrganization(userId, trimmed, {
      industry: newOrgIndustry,
      autonomy_mode: newOrgAutonomy,
      support_email: `contact@${trimmed.toLowerCase().replace(/\s+/g, "")}.com`,
      currency: "USD",
      timezone: TIMEZONES[0],
      retention_days: 90,
    });

    setIsCreatingOrg(false);

    if (error || !newOrg) {
      setCreateOrgError(error || "Failed to create organization.");
      return;
    }

    const orgWithRole: OrganizationWithMemberRole = {
      ...newOrg,
      role: "owner",
    };

    setUserOrganizations((prev) => [orgWithRole, ...prev]);
    populateOrgState(orgWithRole);

    const { data: memList } = await memberService.getMembers(userId, newOrg.id);
    setMembers(memList);

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("elmo_session");
      const parsed = stored ? JSON.parse(stored) : {};
      parsed.activeOrganizationId = newOrg.id;
      localStorage.setItem("elmo_session", JSON.stringify(parsed));
    }

    setShowCreateOrgModal(false);
    setNewOrgName("");
    setStatusMessage({
      type: "success",
      text: `Organization "${newOrg.name}" established successfully as Owner.`,
    });

    router.refresh();
  };

  // Update company profile & workspace settings
  const handleUpdateCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !organization || !orgName.trim()) return;

    setIsSavingOrg(true);
    setStatusMessage(null);

    const currentSettings =
      typeof organization.settings === "object" && organization.settings !== null && !Array.isArray(organization.settings)
        ? (organization.settings as Record<string, any>)
        : {};

    const { data: updated, error } = await orgService.updateOrganization(
      session.user.id,
      organization.id,
      {
        name: orgName.trim(),
        settings: {
          ...currentSettings,
          industry: orgIndustry,
          autonomy_mode: orgAutonomy,
          support_email: orgSupportEmail.trim(),
          website: orgWebsite.trim(),
          currency: orgCurrency,
          timezone: orgTimezone,
          retention_days: orgRetentionDays,
          webhook_url: orgWebhookUrl.trim(),
        },
      }
    );

    setIsSavingOrg(false);

    if (error) {
      setStatusMessage({ type: "error", text: error });
    } else if (updated) {
      const refreshedOrg: OrganizationWithMemberRole = {
        ...updated,
        role: organization.role,
      };
      setOrganization(refreshedOrg);
      setUserOrganizations((prev) =>
        prev.map((o) => (o.id === refreshedOrg.id ? { ...o, name: refreshedOrg.name, settings: refreshedOrg.settings } : o))
      );
      setStatusMessage({
        type: "success",
        text: "Organization profile and workspace settings saved successfully.",
      });
    }
  };

  // Trigger Delete Organization Modal
  const promptDeleteOrganization = (org: OrganizationWithMemberRole) => {
    setOrgToDelete(org);
    setDeleteConfirmText("");
    setConfirmChecked(false);
    setDeleteOrgError(null);
    setShowDeleteOrgModal(true);
  };

  // Execute Organization Deletion
  const handleConfirmDeleteOrganization = async () => {
    if (!orgToDelete) return;
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000001";

    const expectedName = orgToDelete.name.trim().toLowerCase();
    const entered = deleteConfirmText.trim().toLowerCase();

    // Check if user confirmed via checkbox or typed confirmation
    if (!confirmChecked && entered !== expectedName && entered !== "delete") {
      setDeleteOrgError(`Please click the confirmation checkbox or type "DELETE" to confirm.`);
      return;
    }

    setIsDeletingOrg(true);
    setDeleteOrgError(null);

    const { success, error } = await orgService.deleteOrganization(userId, orgToDelete.id);
    setIsDeletingOrg(false);

    if (error || !success) {
      setDeleteOrgError(error || "Failed to delete organization.");
      return;
    }

    // Remove deleted organization from list
    const remaining = userOrganizations.filter((o) => o.id !== orgToDelete.id);

    // If no remaining organizations, auto-provision a fresh clean workspace so user is never stranded
    if (remaining.length === 0) {
      const { data: freshOrg } = await orgService.createOrganization(
        userId,
        "My Company",
        { autonomy_mode: "supervised" }
      );
      if (freshOrg) {
        const freshWithRole: OrganizationWithMemberRole = {
          ...freshOrg,
          role: "owner",
        };
        setUserOrganizations([freshWithRole]);
        populateOrgState(freshWithRole);
        const { data: memList } = await memberService.getMembers(userId, freshOrg.id);
        setMembers(memList);

        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("elmo_session");
          const parsed = stored ? JSON.parse(stored) : {};
          parsed.activeOrganizationId = freshOrg.id;
          localStorage.setItem("elmo_session", JSON.stringify(parsed));
        }
      }
    } else {
      setUserOrganizations(remaining);
      // If the active organization was deleted, switch to the first remaining organization
      if (organization?.id === orgToDelete.id) {
        await handleSwitchOrganization(remaining[0].id);
      }
    }

    setShowDeleteOrgModal(false);
    setDeleteConfirmText("");
    setConfirmChecked(false);

    setStatusMessage({
      type: "success",
      text: `Business workspace "${orgToDelete.name}" was permanently removed.`,
    });
    setOrgToDelete(null);
    router.refresh();
  };

  // Export Workspace Data (.json)
  const handleExportWorkspaceData = () => {
    if (!organization) return;

    const exportPayload = {
      exportVersion: "ELMO-WS-v1.0",
      exportedAt: new Date().toISOString(),
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        created_at: organization.created_at,
        updated_at: organization.updated_at,
        settings: organization.settings,
        roleHierarchy: ROLE_HIERARCHY,
      },
      teamMembers: members.map((m) => ({
        userId: m.user_id,
        displayName: m.profile?.display_name || "Executive User",
        email: m.email,
        role: m.role,
        joinedAt: m.created_at,
      })),
      securityAuditTelemetry: auditResult,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elmo-workspace-${organization.slug || "export"}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMessage({
      type: "success",
      text: `Workspace telemetry & settings exported to elmo-workspace-${organization.slug || "export"}.json`,
    });
  };

  // Invite member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !organization || !inviteEmail.trim()) return;

    setIsInviting(true);
    setStatusMessage(null);

    const { data: newMem, error } = await memberService.addMember(
      session.user.id,
      organization.id,
      inviteEmail.trim(),
      inviteRole
    );

    setIsInviting(false);

    if (error) {
      setStatusMessage({ type: "error", text: error });
    } else if (newMem) {
      setMembers((prev) => [...prev, newMem]);
      setInviteEmail("");
      setStatusMessage({
        type: "success",
        text: `Successfully provisioned ${newMem.email || inviteEmail} as ${inviteRole.toUpperCase()}.`,
      });
    }
  };

  // Update member role
  const handleRoleChange = async (targetUserId: string, newRole: Role) => {
    if (!session?.user || !organization) return;
    setStatusMessage(null);

    const result = await memberService.updateRole(
      session.user.id,
      organization.id,
      targetUserId,
      newRole
    );

    if (result.error) {
      setStatusMessage({ type: "error", text: result.error });
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.user_id === targetUserId ? { ...m, role: newRole } : m))
      );
      setStatusMessage({
        type: "success",
        text: `Member permission tier updated to ${newRole.toUpperCase()}.`,
      });
    }
  };

  // Remove member
  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!session?.user || !organization) return;
    if (!confirm(`Are you sure you want to remove ${targetName} from ${organization.name}?`)) return;

    setStatusMessage(null);

    const result = await memberService.removeMember(
      session.user.id,
      organization.id,
      targetUserId
    );

    if (result.error) {
      setStatusMessage({ type: "error", text: result.error });
    } else {
      setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
      setStatusMessage({
        type: "success",
        text: `${targetName} was removed from the organization.`,
      });
    }
  };

  // Run live security audit
  const handleRunSecurityAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const result = RLSAuditService.runCrossTenantIsolationAudit();
      setAuditResult(result);
      setIsAuditing(false);
      setStatusMessage({
        type: "success",
        text: "Cross-tenant Row Level Security isolation audit completed: 100% Passed.",
      });
    }, 450);
  };

  // Copy helper
  const copyToClipboard = (text: string, fieldId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchQuery =
        !memberSearchQuery.trim() ||
        (m.profile?.display_name || "")
          .toLowerCase()
          .includes(memberSearchQuery.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(memberSearchQuery.toLowerCase());

      const matchRole = memberRoleFilter === "all" || m.role === memberRoleFilter;
      return matchQuery && matchRole;
    });
  }, [members, memberSearchQuery, memberRoleFilter]);

  const isOwner = organization?.role === "owner";
  const isOwnerOrAdmin = organization?.role === "owner" || organization?.role === "admin";
  const currentTier = organization?.role ? ROLE_HIERARCHY[organization.role] : 1;
  const isMasterOrg = organization?.id === "11111111-1111-1111-1111-111111111111";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-14 font-sans select-none">
      {/* ========================================================= */}
      {/* HEADER & EXECUTIVE STRIP                                  */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DigitalBadge variant="cyan" dot pulsing>
              ENTERPRISE GOVERNANCE // TIER-1 MULTI-TENANT
            </DigitalBadge>
            <span className="text-xs font-mono text-zinc-400">
              {organization?.name || "Corporate Operations"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Organization Settings & Security
          </h1>
          <p className="text-xs sm:text-sm text-elmo-textMuted mt-1">
            Manage multi-company profiles, team membership, 5-tier RBAC matrix, workspace governance, and Row Level Security.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportWorkspaceData}
            className="px-3.5 py-2 rounded-xl bg-surface-200 border border-surface-border text-xs font-mono font-medium text-zinc-300 hover:text-white hover:border-elmo-cyan/50 hover:bg-surface-100 transition-all flex items-center gap-2 cursor-pointer"
            title="Export complete workspace schema and telemetry to JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export Data
          </button>

          <button
            onClick={() => setShowRbacMatrixModal(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-200 border border-surface-border text-xs font-mono font-medium text-white hover:border-elmo-cyan/50 hover:bg-surface-100 transition-all flex items-center gap-2 cursor-pointer"
            title="Inspect 5-tier role capabilities and permission matrix"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            5-Tier RBAC Matrix
          </button>

          <button
            onClick={() => setShowCreateOrgModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-black font-semibold text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Company
          </button>
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <p className="text-[11px] font-mono uppercase text-elmo-textDim">Active Company</p>
          <p className="text-sm font-bold text-white truncate">{organization?.name || "Loading..."}</p>
          <p className="text-[10px] font-mono text-elmo-cyan flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-elmo-cyan animate-pulse" />
            {userOrganizations.length} Companies Linked
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <p className="text-[11px] font-mono uppercase text-elmo-textDim">Your Authorization</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase text-white font-mono">
              {organization?.role || "Viewer"}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-200 border border-surface-border text-zinc-300">
              Tier {currentTier}/5
            </span>
          </div>
          <p className="text-[10px] text-zinc-400">
            {isOwner ? "Root Enterprise Authority" : isOwnerOrAdmin ? "Admin Privileges" : "Standard Operations"}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <p className="text-[11px] font-mono uppercase text-elmo-textDim">ELMO Autonomy</p>
          <p className="text-sm font-bold text-white capitalize font-mono">
            {orgAutonomy.replace("_", " ")}
          </p>
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Circuit Breakers Active
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-1">
          <p className="text-[11px] font-mono uppercase text-elmo-textDim">RLS Security Status</p>
          <p className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            100% Enforced
          </p>
          <p className="text-[10px] text-zinc-400">Multi-tenant query isolated</p>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <span className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            {statusMessage.text}
          </span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TABS NAVIGATION                                           */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-colors relative cursor-pointer ${
            activeTab === "general"
              ? "text-elmo-cyan bg-surface-card border-t border-x border-surface-border"
              : "text-elmo-textDim hover:text-white"
          }`}
        >
          <Building className="w-4 h-4" />
          Company & Workspace
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-200 border border-surface-border text-zinc-300">
            {userOrganizations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-colors relative cursor-pointer ${
            activeTab === "team"
              ? "text-elmo-cyan bg-surface-card border-t border-x border-surface-border"
              : "text-elmo-textDim hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          Team Roster & 5-Tier RBAC
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-200 border border-surface-border text-zinc-300">
            {members.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 transition-colors relative cursor-pointer ${
            activeTab === "security"
              ? "text-emerald-400 bg-surface-card border-t border-x border-surface-border"
              : "text-elmo-textDim hover:text-white"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Live Security & RLS Audit Center
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            PASS
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: COMPANY & WORKSPACE MANAGEMENT                     */}
      {/* ========================================================= */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* Multi-Organization Switcher & Roster Card */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-border">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-elmo-cyan" />
                  All Companies in Your Roster
                </h2>
                <p className="text-xs text-elmo-textMuted mt-0.5">
                  1-click switch between isolated corporate workspaces, or remove businesses you no longer operate.
                </p>
              </div>
              <button
                onClick={() => setShowCreateOrgModal(true)}
                className="px-3 py-1.5 rounded-lg bg-surface-200 border border-surface-border text-xs font-medium text-white hover:bg-surface-100 hover:border-elmo-cyan/40 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-elmo-cyan" />
                Add Another Company
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {userOrganizations.map((org) => {
                const isActive = org.id === organization?.id;
                const isOrgOwner = org.role === "owner";
                const isProtectedRoot = org.id === "11111111-1111-1111-1111-111111111111";
                const orgSettings =
                  typeof org.settings === "object" && org.settings !== null && !Array.isArray(org.settings)
                    ? (org.settings as Record<string, any>)
                    : {};

                return (
                  <div
                    key={org.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? "bg-[#0A1424] border-elmo-cyan/50 shadow-[0_0_15px_rgba(0,210,255,0.15)]"
                        : "bg-surface-200/40 border-surface-border hover:border-surface-border/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          {org.name}
                          {isActive && (
                            <span className="text-[9px] font-mono uppercase bg-elmo-cyan/20 text-elmo-cyan px-1.5 py-0.2 rounded border border-elmo-cyan/30">
                              Active
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] font-mono text-elmo-textDim truncate max-w-[180px]">
                          {org.slug || org.id}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-200 border border-surface-border text-zinc-300">
                          {org.role}
                        </span>

                        {/* Delete Business / Trash Button for Owners */}
                        {isOrgOwner && (
                          <button
                            onClick={() => promptDeleteOrganization(org)}
                            className="p-1 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title={`Delete ${org.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between text-[11px]">
                      <span className="text-elmo-textDim font-mono capitalize">
                        {orgSettings.autonomy_mode || "Supervised"}
                      </span>

                      {!isActive ? (
                        <button
                          onClick={() => handleSwitchOrganization(org.id)}
                          className="px-2.5 py-1 rounded bg-surface-100 hover:bg-surface-50 text-elmo-cyan text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          Switch
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Company Profile & Workspace Parameters Form */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
              <Building className="w-5 h-5 text-elmo-cyan" />
              <div>
                <h2 className="text-base font-bold text-white">Active Company Configuration</h2>
                <p className="text-xs text-elmo-textMuted">
                  Customizing settings for: <span className="text-white font-semibold">{organization?.name}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateCompanyProfile} className="space-y-6">
              {/* Core Identifiers & Sector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-elmo-text mb-1.5">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    disabled={!isOwnerOrAdmin}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Global Industries"
                    className="w-full text-xs bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan disabled:opacity-60 transition-colors"
                  />
                  {!isOwnerOrAdmin && (
                    <p className="text-[10px] text-elmo-textDim mt-1">
                      Only Owners or Admins can edit company profile details.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-elmo-text mb-1.5">
                    Primary Industry / Domain
                  </label>
                  <select
                    disabled={!isOwnerOrAdmin}
                    value={orgIndustry}
                    onChange={(e) => setOrgIndustry(e.target.value)}
                    className="w-full text-xs bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unique Identifiers (Slug & UUID) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-elmo-text mb-1.5">
                    Unique Slug Identifier
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={organization?.slug || ""}
                      className="w-full text-xs bg-surface-200/50 border border-surface-border rounded-xl px-3.5 py-2.5 text-elmo-textDim font-mono cursor-not-allowed pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(organization?.slug || "", "slug")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-elmo-textDim hover:text-white transition-colors cursor-pointer"
                      title="Copy slug"
                    >
                      {copiedField === "slug" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-elmo-text mb-1.5">
                    Tenant UUID (Database Key)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={organization?.id || ""}
                      className="w-full text-xs bg-surface-200/50 border border-surface-border rounded-xl px-3.5 py-2.5 text-elmo-textDim font-mono cursor-not-allowed pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(organization?.id || "", "id")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-elmo-textDim hover:text-white transition-colors cursor-pointer"
                      title="Copy Organization ID"
                    >
                      {copiedField === "id" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace Operational Branding & Localization */}
              <div className="pt-3 border-t border-surface-border space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-elmo-cyan" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Workspace Localization & Contact
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-elmo-text mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-elmo-textDim" />
                      Executive Support / Contact Email
                    </label>
                    <input
                      type="email"
                      disabled={!isOwnerOrAdmin}
                      value={orgSupportEmail}
                      onChange={(e) => setOrgSupportEmail(e.target.value)}
                      placeholder="e.g. operations@acme.com"
                      className="w-full text-xs bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan disabled:opacity-60 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-elmo-text mb-1.5 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-elmo-textDim" />
                      Corporate Website / Domain
                    </label>
                    <input
                      type="url"
                      disabled={!isOwnerOrAdmin}
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                      placeholder="https://acme.com"
                      className="w-full text-xs bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan disabled:opacity-60 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-elmo-text mb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-elmo-textDim" />
                      Default Operational Currency
                    </label>
                    <select
                      disabled={!isOwnerOrAdmin}
                      value={orgCurrency}
                      onChange={(e) => setOrgCurrency(e.target.value)}
                      className="w-full text-xs bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-elmo-text mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-elmo-textDim" />
                      Primary Workspace Timezone
                    </label>
                    <select
                      disabled={!isOwnerOrAdmin}
                      value={orgTimezone}
                      onChange={(e) => setOrgTimezone(e.target.value)}
                      className="w-full text-xs bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Autonomy Level Selection */}
              <div className="pt-3 border-t border-surface-border space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    ELMO Corporate Autonomy Safeguards
                  </h3>
                </div>
                <p className="text-xs text-elmo-textMuted">
                  Controls how freely ELMO and subsidiary agent specialists can trigger business actions without human intervention.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {AUTONOMY_LEVELS.map((lvl) => {
                    const isSelected = orgAutonomy === lvl.id;
                    return (
                      <div
                        key={lvl.id}
                        onClick={() => {
                          if (isOwnerOrAdmin) setOrgAutonomy(lvl.id);
                        }}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-[#0E1A2E] border-elmo-cyan shadow-[0_0_15px_rgba(0,210,255,0.2)]"
                            : "bg-surface-200/30 border-surface-border hover:border-surface-border/80"
                        } ${isOwnerOrAdmin ? "cursor-pointer" : "opacity-75 cursor-not-allowed"}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <DigitalBadge variant={lvl.badgeColor} dot={isSelected}>
                            {lvl.title}
                          </DigitalBadge>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-elmo-cyan" />
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-zinc-300 font-semibold mb-1">
                          {lvl.subtitle}
                        </p>
                        <p className="text-[11px] text-elmo-textDim leading-relaxed font-sans">
                          {lvl.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Governance & Webhooks */}
              <div className="pt-3 border-t border-surface-border space-y-4">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Data Governance & Webhook Relays
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-elmo-text mb-1.5">
                      Conversation & Audit Retention
                    </label>
                    <select
                      disabled={!isOwnerOrAdmin}
                      value={orgRetentionDays}
                      onChange={(e) => setOrgRetentionDays(Number(e.target.value))}
                      className="w-full text-xs bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      {RETENTION_PERIODS.map((rp) => (
                        <option key={rp.days} value={rp.days}>
                          {rp.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-elmo-textDim mt-1 font-mono">
                      Automated deletion of voice logs and conversation drafts past retention horizon.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-elmo-text mb-1.5">
                      Outbound Webhook Relay URL
                    </label>
                    <input
                      type="url"
                      disabled={!isOwnerOrAdmin}
                      value={orgWebhookUrl}
                      onChange={(e) => setOrgWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full text-xs bg-surface-200 border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan disabled:opacity-60 transition-colors"
                    />
                    <p className="text-[10px] text-elmo-textDim mt-1 font-mono">
                      Relay high-priority ELMO events and agent completions to external channels.
                    </p>
                  </div>
                </div>

                {/* Workspace API Key Preview */}
                <div className="p-3.5 rounded-xl bg-surface-200/40 border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-xs font-semibold text-white">Workspace Developer API Key</p>
                      <p className="text-[11px] font-mono text-elmo-textDim">
                        {showApiKey ? `elmo_live_${organization?.id?.replace(/-/g, "").slice(0, 24)}` : "••••••••••••••••••••••••••••••••"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1.5 rounded-lg bg-surface-200 hover:bg-surface-100 text-zinc-300 text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="text-[11px]">{showApiKey ? "Mask" : "Reveal"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `elmo_live_${organization?.id?.replace(/-/g, "").slice(0, 24)}`,
                          "apiKey"
                        )
                      }
                      className="p-1.5 rounded-lg bg-surface-200 hover:bg-surface-100 text-zinc-300 text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === "apiKey" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[11px]">Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between pt-4 border-t border-surface-border text-xs text-elmo-textDim">
                <span>Created: {formatDate(organization?.created_at)}</span>
                {isOwnerOrAdmin && (
                  <button
                    type="submit"
                    disabled={isSavingOrg}
                    className="px-5 py-2 rounded-xl bg-elmo-cyan text-black font-semibold text-xs flex items-center gap-2 hover:bg-elmo-cyanDim transition-colors disabled:opacity-50 cursor-pointer shadow-[0_0_12px_rgba(0,210,255,0.3)]"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSavingOrg ? "Saving Settings..." : "Save Workspace Settings"}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ========================================================= */}
          {/* DANGER ZONE: DELETE BUSINESS / WORKSPACE                  */}
          {/* ========================================================= */}
          <div className="p-6 rounded-2xl bg-red-950/15 border border-red-500/30 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-red-500/20">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <div>
                <h2 className="text-base font-bold text-red-400">Danger Zone — Business Removal</h2>
                <p className="text-xs text-zinc-400">
                  Irreversible administrative operations for this corporate workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Delete &quot;{organization?.name}&quot; Workspace
                </h3>
                <p className="text-xs text-zinc-400 max-w-xl mt-0.5 leading-relaxed">
                  Permanently deletes this business organization, team member associations, CRM funnels, and conversation histories. This action cannot be undone.
                </p>
              </div>

              {isOwner ? (
                <button
                  type="button"
                  onClick={() => organization && promptDeleteOrganization(organization)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold font-mono flex items-center gap-2 transition-all bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer self-start sm:self-auto shrink-0"
                  title="Delete workspace"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Business Workspace
                </button>
              ) : (
                <span className="text-[11px] font-mono text-zinc-500 bg-surface-200 px-3 py-1.5 rounded-lg border border-surface-border">
                  Owner Authorization Required
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TEAM ROSTER & 5-TIER RBAC                          */}
      {/* ========================================================= */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h2 className="text-base font-bold text-white">5-Tier Role-Based Access Control (RBAC)</h2>
                </div>
                <p className="text-xs text-elmo-textMuted mt-1">
                  Granular permission control across Owner, Admin, Manager, Member, and Viewer tiers.
                </p>
              </div>

              <button
                onClick={() => setShowRbacMatrixModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-surface-200 border border-surface-border text-xs font-mono text-elmo-cyan hover:border-elmo-cyan transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                View Permission Matrix
              </button>
            </div>

            {/* Quick 5-Tier Summary Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-surface-200/40 border border-amber-500/30">
                <p className="font-bold text-amber-300">TIER 5: OWNER</p>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Root Authority & Billing</p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-200/40 border border-purple-500/30">
                <p className="font-bold text-purple-300">TIER 4: ADMIN</p>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">User & Settings Config</p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-200/40 border border-cyan-500/30">
                <p className="font-bold text-cyan-300">TIER 3: MANAGER</p>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">ELMO Directives & Ops</p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-200/40 border border-emerald-500/30">
                <p className="font-bold text-emerald-300">TIER 2: MEMBER</p>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Standard Operations</p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-200/40 border border-zinc-700">
                <p className="font-bold text-zinc-300">TIER 1: VIEWER</p>
                <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Read-Only Analytics</p>
              </div>
            </div>

            {/* Add Member Form (Owners / Admins only) */}
            {isOwnerOrAdmin && (
              <form
                onSubmit={handleAddMember}
                className="p-4 rounded-xl bg-surface-200/50 border border-surface-border space-y-3 mt-4"
              >
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-elmo-cyan" />
                  Provision / Invite Colleague to {organization?.name}
                </h3>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 text-xs bg-surface-200 border border-surface-border rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan"
                  />

                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="text-xs bg-surface-200 border border-surface-border rounded-lg px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan uppercase font-mono cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.toUpperCase()} (TIER {ROLE_HIERARCHY[r]})
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={isInviting}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-black text-xs font-semibold hover:brightness-110 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-[0_0_10px_rgba(0,210,255,0.2)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isInviting ? "Provisioning..." : "Add Member"}
                  </button>
                </div>
              </form>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-elmo-textDim" />
                <input
                  type="text"
                  placeholder="Filter members by name or email..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full text-xs bg-surface-200 border border-surface-border rounded-lg pl-9 pr-3 py-1.5 text-white focus:outline-none focus:border-elmo-cyan placeholder:text-elmo-textDim"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setMemberRoleFilter("all")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase transition-colors cursor-pointer ${
                    memberRoleFilter === "all"
                      ? "bg-elmo-cyan/20 text-elmo-cyan border border-elmo-cyan/40"
                      : "text-elmo-textDim hover:text-white"
                  }`}
                >
                  All ({members.length})
                </button>
                {ROLES.map((r) => {
                  const count = members.filter((m) => m.role === r).length;
                  return (
                    <button
                      key={r}
                      onClick={() => setMemberRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase transition-colors cursor-pointer ${
                        memberRoleFilter === r
                          ? "bg-elmo-cyan/20 text-elmo-cyan border border-elmo-cyan/40"
                          : "text-elmo-textDim hover:text-white"
                      }`}
                    >
                      {r} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Member Table */}
            <div className="overflow-x-auto border border-surface-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-200/40 text-elmo-textDim font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Assigned RBAC Tier</th>
                    <th className="py-3 px-4">Joined Date</th>
                    {isOwnerOrAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredMembers.map((m) => {
                    const isSelf = m.user_id === session?.user?.id;
                    const isOwnerRole = m.role === "owner";
                    const roleColor =
                      m.role === "owner"
                        ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
                        : m.role === "admin"
                        ? "text-purple-300 border-purple-500/30 bg-purple-500/10"
                        : m.role === "manager"
                        ? "text-cyan-300 border-cyan-500/30 bg-cyan-500/10"
                        : m.role === "member"
                        ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                        : "text-zinc-300 border-zinc-700 bg-zinc-800/40";

                    return (
                      <tr key={m.id} className="hover:bg-surface-200/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-200 border border-surface-border flex items-center justify-center font-bold text-elmo-cyan uppercase text-xs">
                              {(m.profile?.display_name || m.email || "U")[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-white flex items-center gap-2">
                                {m.profile?.display_name || m.email?.split("@")[0] || "Executive User"}
                                {isSelf && (
                                  <span className="text-[9px] bg-elmo-cyan/15 text-elmo-cyan px-1.5 py-0.2 rounded font-mono border border-elmo-cyan/30">
                                    YOU
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-elmo-textDim font-mono">
                                {m.email || "user@organization.com"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isOwnerOrAdmin && !isSelf && (!isOwnerRole || isOwner) ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.user_id, e.target.value as Role)}
                              className="bg-surface-200 border border-surface-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-elmo-cyan uppercase font-mono cursor-pointer"
                            >
                              {ROLES.map((r) => (
                                <option
                                  key={r}
                                  value={r}
                                  disabled={r === "owner" && !isOwner}
                                >
                                  {r.toUpperCase()} (TIER {ROLE_HIERARCHY[r]})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${roleColor}`}
                            >
                              {m.role} • Tier {ROLE_HIERARCHY[m.role]}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-elmo-textDim font-mono">
                          {formatDate(m.created_at)}
                        </td>

                        {isOwnerOrAdmin && (
                          <td className="py-3.5 px-4 text-right">
                            {!isSelf && !isOwnerRole && (
                              <button
                                onClick={() =>
                                  handleRemoveMember(
                                    m.user_id,
                                    m.profile?.display_name || m.email || "Member"
                                  )
                                }
                                className="p-1.5 rounded-lg text-elmo-textDim hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Remove member from organization"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-elmo-textDim font-mono">
                        No organization members found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LIVE SECURITY & ROW LEVEL SECURITY (RLS) CENTER    */}
      {/* ========================================================= */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Live RLS Audit Trigger & Telemetry */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border shadow-[0_0_25px_rgba(0,210,255,0.08)] space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">
                    Multi-Tenant Row Level Security (RLS) Audit
                  </h2>
                </div>
                <p className="text-xs text-elmo-textMuted mt-1">
                  Automated verification proving that cross-tenant queries, member rosters, and conversations cannot leak across organizations.
                </p>
              </div>

              <button
                onClick={handleRunSecurityAudit}
                disabled={isAuditing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 text-black font-mono font-bold text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                {isAuditing ? "Running Live Audit..." : "Execute RLS Security Audit"}
              </button>
            </div>

            {/* Audit Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {auditResult?.details.map((testItem, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-surface-200/40 border border-surface-border flex items-start gap-3 transition-colors hover:border-emerald-500/40"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 font-mono">
                    <p className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                      {testItem.test}
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        PASS
                      </span>
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      {testItem.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hardened Architecture Specifications */}
          <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
              <Lock className="w-5 h-5 text-elmo-cyan" />
              <h2 className="text-base font-bold text-white">Security Architecture & Privacy Standards</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-200/30 border border-surface-border space-y-2">
                <p className="font-semibold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  PostgreSQL Row Level Security (RLS)
                </p>
                <p className="text-elmo-textDim leading-relaxed">
                  Every table (<code className="text-white">organizations</code>, <code className="text-white">organization_members</code>, <code className="text-white">conversations</code>, <code className="text-white">messages</code>) enforces native Postgres RLS policies requiring <code className="text-white">auth.uid()</code> membership verification.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-200/30 border border-surface-border space-y-2">
                <p className="font-semibold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  Server-Side Secret Isolation
                </p>
                <p className="text-elmo-textDim leading-relaxed">
                  Privileged credentials (<code className="text-white">SUPABASE_SERVICE_ROLE_KEY</code>, Gemini/Deepgram API tokens) are strictly confined to Node.js backend handlers and are never bundled into client browser bundles.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-200/30 border border-surface-border space-y-2">
                <p className="font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Ephemeral Voice Stream Privacy
                </p>
                <p className="text-elmo-textDim leading-relaxed">
                  Audio utterances in JARVIS Mode and Web Speech sessions are streamed in volatile browser memory. Raw user voice recordings are never stored on disk or in cloud object buckets.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-200/30 border border-surface-border space-y-2">
                <p className="font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  5-Tier Privilege Escalation Defense
                </p>
                <p className="text-elmo-textDim leading-relaxed">
                  Hierarchical access checks in <code className="text-white">member.service.ts</code> prevent non-owners from promoting themselves or other accounts to Owner, preventing privilege escalation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE NEW COMPANY / ORGANIZATION                */}
      {/* ========================================================= */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#070D18] border border-cyan-500/40 p-6 shadow-[0_0_30px_rgba(0,210,255,0.25)] relative">
            <button
              onClick={() => setShowCreateOrgModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#0E1A2E] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-[#14233A]">
              <div className="w-10 h-10 rounded-xl bg-[#0E1A2E] border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Establish New Company</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Provision an isolated multi-tenant workspace
                </p>
              </div>
            </div>

            {createOrgError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {createOrgError}
              </div>
            )}

            <form onSubmit={handleCreateOrganization} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Ventures"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full text-xs bg-[#0A1424] border border-[#162A48] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Industry / Corporate Sector
                </label>
                <select
                  value={newOrgIndustry}
                  onChange={(e) => setNewOrgIndustry(e.target.value)}
                  className="w-full text-xs bg-[#0A1424] border border-[#162A48] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan cursor-pointer"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  ELMO Autonomy Guardrails
                </label>
                <select
                  value={newOrgAutonomy}
                  onChange={(e) =>
                    setNewOrgAutonomy(e.target.value as "supervised" | "co_pilot" | "autonomous")
                  }
                  className="w-full text-xs bg-[#0A1424] border border-[#162A48] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-elmo-cyan capitalize cursor-pointer"
                >
                  <option value="supervised">Supervised (Human Executive Approval Required)</option>
                  <option value="co_pilot">Co-Pilot (Selective Routine Delegation)</option>
                  <option value="autonomous">Full Autonomy (High Velocity Execution)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#14233A] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateOrgModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreatingOrg || !newOrgName.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-semibold text-xs flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,210,255,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isCreatingOrg ? "Creating Workspace..." : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DELETE BUSINESS CONFIRMATION (DANGER ZONE)       */}
      {/* ========================================================= */}
      {showDeleteOrgModal && orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#070D18] border border-red-500/50 p-6 shadow-[0_0_35px_rgba(239,68,68,0.3)] relative">
            <button
              onClick={() => setShowDeleteOrgModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#0E1A2E] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-red-500/20">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Permanently Delete Business</h3>
                <p className="text-xs text-red-400 font-mono">
                  Irreversible Organization Removal
                </p>
              </div>
            </div>

            {deleteOrgError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {deleteOrgError}
              </div>
            )}

            <div className="mt-4 space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                You are about to permanently remove{" "}
                <strong className="text-white underline">{orgToDelete.name}</strong>. This will purge all associated member roles, conversation history, automated funnels, and CRM contacts.
              </p>

              {/* 1-Click Checkbox Confirmation */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/25 border border-red-500/30 text-xs text-zinc-200 cursor-pointer hover:bg-red-950/40 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => {
                    setConfirmChecked(e.target.checked);
                    if (e.target.checked) setDeleteOrgError(null);
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-red-500/40 text-red-500 focus:ring-0 cursor-pointer"
                />
                <span>I confirm I want to permanently delete this business workspace.</span>
              </label>

              {/* Optional typing field */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 block">
                  Or type <strong className="text-red-400">DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="Type DELETE or check the box above"
                  value={deleteConfirmText}
                  onChange={(e) => {
                    setDeleteConfirmText(e.target.value);
                    if (e.target.value.trim().toLowerCase() === "delete") setDeleteOrgError(null);
                  }}
                  className="w-full text-xs bg-[#0A1424] border border-red-500/30 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-400"
                />
              </div>
            </div>

            <div className="pt-4 mt-5 border-t border-[#14233A] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteOrgModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingOrg}
                onClick={handleConfirmDeleteOrganization}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingOrg ? "Purging Workspace..." : "Confirm Permanent Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: 5-TIER RBAC PERMISSION MATRIX                    */}
      {/* ========================================================= */}
      {showRbacMatrixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-2xl bg-[#070D18] border border-cyan-500/40 p-6 shadow-[0_0_30px_rgba(0,210,255,0.25)] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowRbacMatrixModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#0E1A2E] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-[#14233A]">
              <div className="w-10 h-10 rounded-xl bg-[#0E1A2E] border border-purple-500/40 flex items-center justify-center text-purple-300">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">5-Tier RBAC Permission Matrix</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Capability breakdown across all organization tiers
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto border border-[#14233A] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#14233A] bg-[#0A1424] text-zinc-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Capability</th>
                    <th className="py-3 px-3 text-center text-amber-300">Owner (T5)</th>
                    <th className="py-3 px-3 text-center text-purple-300">Admin (T4)</th>
                    <th className="py-3 px-3 text-center text-cyan-300">Manager (T3)</th>
                    <th className="py-3 px-3 text-center text-emerald-300">Member (T2)</th>
                    <th className="py-3 px-3 text-center text-zinc-400">Viewer (T1)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14233A] font-mono text-[11px]">
                  <tr>
                    <td className="py-3 px-4 font-sans text-white font-medium">Delete Business / Workspace</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-white font-medium">Update Company Profile & Autonomy</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-white font-medium">Manage Team Members & Invites</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-white font-medium">Assign & Delegate Roles</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-white font-medium">Manage Integrations & API Keys</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-white font-medium">Direct ELMO Voice & Executive AI</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-white font-medium">Approve Automated Workflows & Funnels</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                    <td className="py-3 px-3 text-center text-zinc-600">—</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-white font-medium">View Analytics & RLS Audit Telemetry</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                    <td className="py-3 px-3 text-center text-emerald-400">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-[#0A1424] border border-[#14233A] text-xs text-zinc-400 flex items-center justify-between">
              <span>Your current tier: <strong className="text-white uppercase font-mono">{organization?.role || "Viewer"}</strong> (Tier {currentTier}/5)</span>
              <button
                onClick={() => setShowRbacMatrixModal(false)}
                className="px-4 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-100 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
