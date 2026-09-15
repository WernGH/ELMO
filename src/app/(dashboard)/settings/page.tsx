"use client";

import { useEffect, useState } from "react";
import {
  Building,
  CheckCircle2,
  Lock,
  Plus,
  Save,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { AuthService } from "@/services/auth.service";
import { OrganizationService } from "@/services/organization.service";
import { MemberService } from "@/services/member.service";
import { MemberWithProfile, OrganizationWithMemberRole, Role } from "@/types/organization.types";
import { UserSession } from "@/types/auth.types";
import { formatDate } from "@/lib/utils";

const ROLES: Role[] = ["owner", "admin", "manager", "member", "viewer"];

export default function SettingsPage() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [organization, setOrganization] = useState<OrganizationWithMemberRole | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const authService = AuthService.getInstance();
  const orgService = OrganizationService.getInstance();
  const memberService = MemberService.getInstance();

  useEffect(() => {
    async function loadSettings() {
      const sess = await authService.getSession();
      setSession(sess);

      if (sess.user && sess.activeOrganizationId) {
        const { data: org } = await orgService.getOrganization(sess.user.id, sess.activeOrganizationId);
        if (org) {
          setOrganization(org);
          setOrgName(org.name);
          const { data: memList } = await memberService.getMembers(sess.user.id, org.id);
          setMembers(memList);
        }
      }
    }
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !organization || !orgName.trim()) return;

    setIsSavingOrg(true);
    setStatusMessage(null);

    const { data: updated, error } = await orgService.updateOrganization(
      session.user.id,
      organization.id,
      { name: orgName.trim() }
    );

    setIsSavingOrg(false);

    if (error) {
      setStatusMessage({ type: "error", text: error });
    } else if (updated) {
      setOrganization({ ...organization, name: updated.name });
      setStatusMessage({ type: "success", text: "Organization name updated successfully." });
    }
  };

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
        text: `Successfully added ${newMem.email || inviteEmail} as ${inviteRole}.`,
      });
    }
  };

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
      setStatusMessage({ type: "success", text: "Member role updated." });
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!session?.user || !organization) return;
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
      setStatusMessage({ type: "success", text: "Member removed from organization." });
    }
  };

  const isOwnerOrAdmin = organization?.role === "owner" || organization?.role === "admin";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Organization Settings & Security</h1>
        <p className="text-xs text-elmo-textMuted mt-1">
          Manage company details, team membership, 5-tier RBAC permissions, and Row Level Security.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Organization Details Card */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-elmo-cyan" />
          <h2 className="text-base font-bold text-white">Company Profile</h2>
        </div>

        <form onSubmit={handleUpdateOrgName} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-elmo-text mb-1">
                Company Name
              </label>
              <input
                type="text"
                disabled={!isOwnerOrAdmin}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full text-xs bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-elmo-cyan disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-elmo-text mb-1">
                Unique Slug (Identifier)
              </label>
              <input
                type="text"
                disabled
                value={organization?.slug || ""}
                className="w-full text-xs bg-surface-200/50 border border-surface-border rounded-lg px-3 py-2 text-elmo-textDim font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-border text-xs text-elmo-textDim">
            <span>Created: {formatDate(organization?.created_at)}</span>
            {isOwnerOrAdmin && (
              <button
                type="submit"
                disabled={isSavingOrg}
                className="px-4 py-1.5 rounded-lg bg-elmo-cyan text-black font-semibold text-xs flex items-center gap-2 hover:bg-elmo-cyanDim transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingOrg ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Member Management & 5-Tier RBAC Card */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">Organization Members & RBAC</h2>
            </div>
            <p className="text-xs text-elmo-textMuted mt-0.5">
              5-Tier Permission Matrix: Owner, Admin, Manager, Member, Viewer
            </p>
          </div>
          <span className="text-xs font-mono text-elmo-cyan bg-elmo-cyan/10 px-2.5 py-1 rounded-full border border-elmo-cyan/20">
            {members.length} Active {members.length === 1 ? "Member" : "Members"}
          </span>
        </div>

        {/* Add Member Form (Owners / Admins only) */}
        {isOwnerOrAdmin && (
          <form
            onSubmit={handleAddMember}
            className="p-4 rounded-xl bg-surface-200/50 border border-surface-border space-y-3"
          >
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-elmo-cyan" />
              Add Member to Organization
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 text-xs bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-elmo-cyan"
              />

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="text-xs bg-surface-200 border border-surface-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-elmo-cyan"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={isInviting}
                className="px-4 py-2 rounded-lg bg-surface-100 border border-surface-border text-white text-xs font-semibold hover:bg-surface-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5 text-elmo-cyan" />
                {isInviting ? "Adding..." : "Add Member"}
              </button>
            </div>
          </form>
        )}

        {/* Member Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-border text-elmo-textDim font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Member</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Joined Date</th>
                {isOwnerOrAdmin && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {members.map((m) => {
                const isSelf = m.user_id === session?.user?.id;
                const isOwner = m.role === "owner";

                return (
                  <tr key={m.id} className="hover:bg-surface-200/30 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-semibold text-white flex items-center gap-2">
                          {m.profile?.display_name || m.email || "Executive User"}
                          {isSelf && (
                            <span className="text-[9px] bg-elmo-cyan/15 text-elmo-cyan px-1.5 py-0.2 rounded font-mono">
                              YOU
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-elmo-textDim">{m.email || "user@organization.com"}</p>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {isOwnerOrAdmin && !isSelf ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.user_id, e.target.value as Role)}
                          className="bg-surface-200 border border-surface-border rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-elmo-cyan"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-surface-200 border border-surface-border text-elmo-cyan">
                          {m.role}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-elmo-textDim font-mono">
                      {formatDate(m.created_at)}
                    </td>

                    {isOwnerOrAdmin && (
                      <td className="py-3 px-3 text-right">
                        {!isSelf && !isOwner && (
                          <button
                            onClick={() => handleRemoveMember(m.user_id)}
                            className="p-1.5 rounded-lg text-elmo-textDim hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & RLS Compliance Verification */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-elmo-emerald" />
          <h2 className="text-base font-bold text-white">Security & RLS Specifications</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface-200/40 border border-surface-border space-y-1">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-elmo-emerald" />
              Row Level Security (RLS)
            </p>
            <p className="text-elmo-textDim">
              Enabled on <code className="text-white">organizations</code>, <code className="text-white">profiles</code>, and <code className="text-white">organization_members</code>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-200/40 border border-surface-border space-y-1">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-elmo-cyan" />
              Client Secret Isolation
            </p>
            <p className="text-elmo-textDim">
              <code className="text-white">SUPABASE_SERVICE_ROLE_KEY</code> is strictly guarded server-side and never packaged for client-side JavaScript.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-200/40 border border-surface-border space-y-1">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-purple-400" />
              Multi-Tenant Boundary
            </p>
            <p className="text-elmo-textDim">
              All member, executive, and future agent queries are strictly scoped to the active <code className="text-white">organization_id</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
