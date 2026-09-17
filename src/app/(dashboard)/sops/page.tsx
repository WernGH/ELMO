"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  HelpCircle,
  Sparkles,
  Tag,
  CheckCircle2,
  ChevronRight,
  FileText,
  Trash2,
} from "lucide-react";
import { SopService, SopAnswer } from "@/services/sop.service";
import { SopRow } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";

export default function SopsPage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");

  const [sops, setSops] = useState<SopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSop, setSelectedSop] = useState<SopRow | null>(null);

  // Ask Assistant
  const [staffQuestion, setStaffQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState<SopAnswer | null>(null);
  const [asking, setAsking] = useState(false);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SopRow["category"]>("operations");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const sopService = SopService.getInstance();

  useEffect(() => {
    async function initAuth() {
      const auth = AuthService.getInstance();
      const sess = await auth.getSession();
      if (sess?.activeOrganizationId) setOrgId(sess.activeOrganizationId);
      if (sess?.user?.id) setUserId(sess.user.id);
    }
    initAuth();
  }, []);

  useEffect(() => {
    loadSops();
  }, [orgId, userId, selectedCategory]);

  async function loadSops() {
    try {
      const cat = selectedCategory === "all" ? undefined : (selectedCategory as SopRow["category"]);
      const data = await sopService.getSops(userId, orgId, cat);
      setSops(data);
      if (data.length > 0 && !selectedSop) {
        setSelectedSop(data[0]);
      }
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffQuestion.trim()) return;
    setAsking(true);
    try {
      const answer = await sopService.askSopAssistant(userId, orgId, staffQuestion);
      setAssistantAnswer(answer);
    } finally {
      setAsking(false);
    }
  };

  const handleCreateSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await sopService.createSop({
        userId,
        organizationId: orgId,
        title,
        category,
        content,
        tags,
      });

      setTitle("");
      setContent("");
      setTagsInput("");
      setIsModalOpen(false);
      await loadSops();
      setSelectedSop(created);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredSops = sops.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-zinc-100 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            Staff SOP & Operations Handbook
          </h1>
          <p className="text-sm text-zinc-400">
            Internal operational procedures, opening/closing checklists, customer service protocols, and instant staff Q&A.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-lg text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all font-mono"
        >
          <Plus className="w-4 h-4" />
          Add New SOP
        </button>
      </div>

      {/* Ask SOP Assistant Strip */}
      <div className="bg-[#091120] border border-amber-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.1)]">
        <form onSubmit={handleAskQuestion} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <HelpCircle className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
            <input
              type="text"
              value={staffQuestion}
              onChange={(e) => setStaffQuestion(e.target.value)}
              placeholder="Staff question: 'How do I handle a customer refund without receipt?' or 'Opening checklist?'"
              className="w-full pl-9 pr-4 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={asking || !staffQuestion.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {asking ? "Consulting..." : "Ask Assistant"}
          </button>
        </form>

        {assistantAnswer && (
          <div className="mt-4 p-4 bg-[#050914] border border-[#162744] rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Matching SOP: {assistantAnswer.matchedSopTitle}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                {(assistantAnswer.confidence * 100).toFixed(0)}% Match
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-medium text-zinc-200">{assistantAnswer.summary}</p>
              <ul className="space-y-1 text-xs text-zinc-400 list-disc list-inside">
                {assistantAnswer.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Category Filter, Search & Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Categories & SOP Index */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter procedures..."
              className="w-full pl-9 pr-3 py-2 bg-[#091120] border border-[#162744] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["all", "operations", "customer_service", "finance", "safety", "onboarding"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono capitalize transition-colors ${
                  selectedCategory === cat
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                    : "bg-[#091120] text-zinc-400 border border-[#162744] hover:text-zinc-200"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="bg-[#091120] border border-[#162744] rounded-xl overflow-hidden divide-y divide-[#162744]">
            {filteredSops.map((sop) => {
              const isSelected = selectedSop?.id === sop.id;
              return (
                <div
                  key={sop.id}
                  onClick={() => setSelectedSop(sop)}
                  className={`p-3 cursor-pointer hover:bg-[#0C172C] transition-colors flex items-center justify-between ${
                    isSelected ? "bg-[#0C172C] border-l-2 border-l-amber-400" : ""
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className={`text-xs font-bold ${isSelected ? "text-amber-300" : "text-zinc-200"}`}>
                      {sop.title}
                    </p>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      {sop.category.replace("_", " ")}
                    </span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400" : "text-zinc-600"}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected SOP Reader */}
        <div className="md:col-span-2 bg-[#091120] border border-[#162744] rounded-xl p-6 space-y-4">
          {selectedSop ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#162744] pb-4">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    {selectedSop.category.replace("_", " ")}
                  </span>
                  <h2 className="text-lg font-bold font-mono text-zinc-100 mt-1.5">{selectedSop.title}</h2>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedSop.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#162744] text-zinc-400 flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-zinc-300 text-sm font-sans whitespace-pre-wrap leading-relaxed">
                {selectedSop.content}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 font-mono text-sm">
              Select a standard operating procedure from the list to read.
            </div>
          )}
        </div>
      </div>

      {/* Create SOP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#091120] border border-[#162744] rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold font-mono text-zinc-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Add Standard Operating Procedure
            </h2>

            <form onSubmit={handleCreateSop} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-400">SOP Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. VIP Client Welcome Protocol"
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="operations">Operations</option>
                    <option value="customer_service">Customer Service</option>
                    <option value="finance">Finance</option>
                    <option value="safety">Safety</option>
                    <option value="onboarding">Onboarding</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400">Search Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. checklist, morning, front-desk"
                  className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400">Procedure Content / Steps (Markdown) *</label>
                <textarea
                  required
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="1. First step...&#10;2. Second step...&#10;3. Critical warning..."
                  className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#162744]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all font-mono"
                >
                  Save SOP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
