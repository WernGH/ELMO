"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Tag, Mail, Phone, Calendar, Loader2, CheckCircle2 } from "lucide-react";
import { ContactService, ContactWithTags } from "@/services/contact.service";
import { AuthService } from "@/services/auth.service";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeOrgId, setActiveOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000001");
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newTag, setNewTag] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const contactService = ContactService.getInstance();
  const authService = AuthService.getInstance();

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const session = await authService.getSession();
      const org = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
      const usr = session?.user?.id || "00000000-0000-0000-0000-000000000001";
      setActiveOrgId(org);
      setUserId(usr);

      const res = await contactService.getContacts(usr, org);
      if (res.data) {
        setContacts(res.data);
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setMessage(null);
    const res = await contactService.findOrCreateContact({
      userId,
      organizationId: activeOrgId,
      email: newEmail.trim(),
      firstName: newFirstName.trim() || undefined,
      lastName: newLastName.trim() || undefined,
      tags: newTag.trim() ? [newTag.trim()] : [],
    });

    if (res.data) {
      setContacts((prev) => [res.data!, ...prev.filter((c) => c.id !== res.data!.id)]);
      setNewEmail("");
      setNewFirstName("");
      setNewLastName("");
      setNewTag("");
      setIsAdding(false);
      setMessage("Contact registered successfully.");
    }
  };

  const filtered = contacts.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.first_name && c.first_name.toLowerCase().includes(q)) ||
      (c.last_name && c.last_name.toLowerCase().includes(q)) ||
      c.tags.some((t) => t.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#060A14]/90 border border-[#14233D] relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,210,255,0.35)] flex-shrink-0">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Audience & Contacts</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 1 Core
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Unified contact records, tagging, and multi-touch customer event telemetry.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-[#0B1A2F] border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleAddContact}
          className="p-5 rounded-2xl bg-[#081224] border border-cyan-500/40 space-y-4"
        >
          <h3 className="text-sm font-bold text-white">Create New Lead Record</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Email *</label>
              <input
                type="email"
                required
                placeholder="lead@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">First Name</label>
              <input
                type="text"
                placeholder="Sarah"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Last Name</label>
              <input
                type="text"
                placeholder="Connor"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Initial Tag</label>
              <input
                type="text"
                placeholder="webinar-lead"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-400 text-black font-bold text-xs hover:brightness-110"
            >
              Save Contact
            </button>
          </div>
        </form>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search by email, name, or tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-xl bg-[#060A14] border border-[#14233D] text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
        />
        <span className="text-xs font-mono text-zinc-400">
          Total: <strong className="text-cyan-400">{filtered.length}</strong> contacts
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Loading contact directory...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#060A14]/80 border border-[#14233D] space-y-3">
          <p className="text-sm text-zinc-400">No contacts found matching criteria.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#060A14]/90 border border-[#14233D] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#14233D] bg-[#091122]/60 font-mono text-[11px] text-zinc-400 uppercase">
              <tr>
                <th className="p-4">Contact</th>
                <th className="p-4">Status</th>
                <th className="p-4">Tags</th>
                <th className="p-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#121E33]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[#0A1428]/60 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white">
                      {c.first_name || c.last_name
                        ? `${c.first_name || ""} ${c.last_name || ""}`.trim()
                        : "Unnamed Contact"}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Mail className="w-3 h-3 text-cyan-400" />
                      <span>{c.email}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.length === 0 ? (
                        <span className="text-zinc-600 font-mono text-[10px]">—</span>
                      ) : (
                        c.tags.map((t) => (
                          <span
                            key={t.id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-950/60 text-cyan-300 border border-blue-800/40"
                          >
                            #{t.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-zinc-400 font-mono text-[11px]">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
