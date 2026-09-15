"use client";

import { useEffect, useState } from "react";
import { Mail, Plus, Clock, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { EmailService } from "@/services/email.service";
import { AuthService } from "@/services/auth.service";
import { EmailTemplateRow, EmailSequenceRow } from "@/lib/supabase/mock-store";

export default function EmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [sequences, setSequences] = useState<EmailSequenceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000001");
  const [isCreatingTpl, setIsCreatingTpl] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const emailService = EmailService.getInstance();
  const authService = AuthService.getInstance();

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const session = await authService.getSession();
      const org = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
      const usr = session?.user?.id || "00000000-0000-0000-0000-000000000001";
      setActiveOrgId(org);
      setUserId(usr);

      const [tRes, sRes] = await Promise.all([
        emailService.getTemplates(usr, org),
        emailService.getSequences(usr, org),
      ]);

      if (tRes.data) setTemplates(tRes.data);
      if (sRes.data) setSequences(sRes.data);
      setIsLoading(false);
    }
    init();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplSubject.trim()) return;

    setMessage(null);
    const res = await emailService.createTemplate({
      userId,
      organizationId: activeOrgId,
      name: tplName.trim(),
      subject: tplSubject.trim(),
      body: tplBody.trim(),
      status: "published",
    });

    if (res.data) {
      setTemplates((prev) => [res.data!, ...prev]);
      setTplName("");
      setTplSubject("");
      setTplBody("");
      setIsCreatingTpl(false);
      setMessage("Email template created successfully.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#060A14]/90 border border-[#14233D] relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,210,255,0.35)] flex-shrink-0">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Email Foundation</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 1 Core
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Reusable templates, automated follow-up sequences, and timed step scheduling.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreatingTpl(!isCreatingTpl)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-[#0B1A2F] border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Creation Modal */}
      {isCreatingTpl && (
        <form
          onSubmit={handleCreateTemplate}
          className="p-5 rounded-2xl bg-[#081224] border border-cyan-500/40 space-y-4"
        >
          <h3 className="text-sm font-bold text-white">Draft Email Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Template Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Webinar Confirmation & Link"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Subject Line *</label>
              <input
                type="text"
                required
                placeholder="e.g. You're in! Access link inside..."
                value={tplSubject}
                onChange={(e) => setTplSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1">Body Content</label>
            <textarea
              rows={4}
              placeholder="Hi {{first_name}}, thank you for registering..."
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreatingTpl(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-400 text-black font-bold text-xs hover:brightness-110"
            >
              Save Template
            </button>
          </div>
        </form>
      )}

      {/* Content Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Loading email foundation...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Templates Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-cyan-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Email Templates ({templates.length})</span>
            </h2>
            {templates.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#060A14]/80 border border-[#14233D] text-xs text-zinc-400">
                No email templates yet. Create your first template above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-5 rounded-2xl bg-[#060A14]/90 border border-[#14233D] hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        {tpl.status}
                      </span>
                      <h3 className="font-bold text-white text-base mt-2">{tpl.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1 font-mono">Subject: {tpl.subject}</p>
                    </div>
                    <div className="pt-3 border-t border-[#121E33] text-[11px] font-mono text-zinc-500">
                      Created: {new Date(tpl.created_at).toLocaleDateString()}
                    </div>
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
