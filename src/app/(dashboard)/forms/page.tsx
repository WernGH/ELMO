"use client";

import { useEffect, useState } from "react";
import { FormInput, Plus, CheckCircle2, Loader2, Send } from "lucide-react";
import { FormService } from "@/services/form.service";
import { AuthService } from "@/services/auth.service";
import { FormRow } from "@/lib/supabase/mock-store";

export default function FormsPage() {
  const [forms, setForms] = useState<FormRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000001");
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [tagToApply, setTagToApply] = useState("webinar-lead");
  const [message, setMessage] = useState<string | null>(null);

  // Test Submission State
  const [testFormId, setTestFormId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("");
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  const formService = FormService.getInstance();
  const authService = AuthService.getInstance();

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const session = await authService.getSession();
      const org = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
      const usr = session?.user?.id || "00000000-0000-0000-0000-000000000001";
      setActiveOrgId(org);
      setUserId(usr);

      const res = await formService.getForms(usr, org);
      if (res.data) {
        setForms(res.data);
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setMessage(null);
    const res = await formService.createForm({
      userId,
      organizationId: activeOrgId,
      name: formName.trim(),
      fields: [
        { name: "name", label: "Full Name", type: "text", required: true },
        { name: "email", label: "Email Address", type: "email", required: true },
      ],
      submitAction: {
        add_tags: tagToApply.trim() ? [tagToApply.trim()] : ["lead"],
      },
    });

    if (res.data) {
      setForms((prev) => [res.data!, ...prev]);
      setFormName("");
      setIsCreating(false);
      setMessage("Form created successfully.");
    }
  };

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testFormId || !testEmail.trim()) return;

    setSubmissionFeedback(null);
    const res = await formService.submitForm({
      organizationId: activeOrgId,
      formId: testFormId,
      submissionData: {
        email: testEmail.trim(),
        name: testName.trim(),
      },
    });

    if (res.data) {
      setSubmissionFeedback(
        `Success: Submission captured! Contact ID "${res.data.contactId}" automatically registered and tagged.`
      );
      setTestEmail("");
      setTestName("");
    } else {
      setSubmissionFeedback(res.error || "Submission failed.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#060A14]/90 border border-[#14233D] relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,210,255,0.35)] flex-shrink-0">
            <FormInput className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Lead Capture Forms</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 1 Core
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Automated contact registration, tag routing, and event attribution on submission.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Form</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-[#0B1A2F] border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Creation Modal */}
      {isCreating && (
        <form
          onSubmit={handleCreateForm}
          className="p-5 rounded-2xl bg-[#081224] border border-cyan-500/40 space-y-4"
        >
          <h3 className="text-sm font-bold text-white">Create Opt-in Form</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Form Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Webinar Registration Form"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">Automatic Tag on Submit</label>
              <input
                type="text"
                placeholder="webinar-subscriber"
                value={tagToApply}
                onChange={(e) => setTagToApply(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-400 text-black font-bold text-xs hover:brightness-110"
            >
              Save Form
            </button>
          </div>
        </form>
      )}

      {/* Test Submission Panel */}
      {testFormId && (
        <form
          onSubmit={handleTestSubmit}
          className="p-5 rounded-2xl bg-[#081224] border border-blue-500/40 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" />
              <span>Simulate Live Form Submission</span>
            </h3>
            <button
              type="button"
              onClick={() => setTestFormId(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Close Test Box
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Attendee Name"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
            <input
              type="email"
              required
              placeholder="attendee@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#050B17] border border-[#162744] text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-[11px] text-zinc-400 font-mono">
              Simulates real visitor submit pipeline: Form -&gt; Contact -&gt; Tag -&gt; Event
            </span>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:brightness-110"
            >
              Submit Lead
            </button>
          </div>
          {submissionFeedback && (
            <div className="p-3 rounded-xl bg-[#0B1D35] border border-cyan-500/40 text-xs text-cyan-300">
              {submissionFeedback}
            </div>
          )}
        </form>
      )}

      {/* Forms Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Loading forms...</span>
        </div>
      ) : forms.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#060A14]/80 border border-[#14233D] space-y-3">
          <p className="text-sm text-zinc-400">No forms registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((f) => {
            const fields = (f.fields as any[]) || [];
            const action = (f.submit_action as Record<string, unknown>) || {};
            const tags = (action.add_tags as string[]) || [];

            return (
              <div
                key={f.id}
                className="p-5 rounded-2xl bg-[#060A14]/90 border border-[#14233D] hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base">{f.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {fields.length} Fields
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-400 space-y-1">
                    <p>Fields: {fields.map((field) => field.name).join(", ")}</p>
                    <p>Tags applied: {tags.length > 0 ? tags.map((t) => `#${t}`).join(" ") : "None"}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#121E33] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-500">
                    {new Date(f.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => {
                      setTestFormId(f.id);
                      setSubmissionFeedback(null);
                    }}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                  >
                    Test Submit &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
