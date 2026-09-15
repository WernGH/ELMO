"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Database,
  Brain,
  Search,
  Filter,
  Plus,
  Star,
  ShieldCheck,
  History,
  Archive,
  Trash2,
  Edit3,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Building2,
  User,
  Users,
  Tag,
  ArrowRight,
} from "lucide-react";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { AuthService } from "@/services/auth.service";
import { CompanyMemoryRow } from "@/lib/supabase/mock-store";
import { MemoryCategory, MemoryScope, MemoryStatus, MemoryConfidenceLevel } from "@/types/database.types";

export default function MemoryPage() {
  const [memories, setMemories] = useState<CompanyMemoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("00000000-0000-0000-0000-000000000001");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<CompanyMemoryRow | null>(null);

  // Form states for Add
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryCategory>("business");
  const [newScope, setNewScope] = useState<MemoryScope>("organization");
  const [newImportance, setNewImportance] = useState<number>(4);
  const [newConfidence, setNewConfidence] = useState<MemoryConfidenceLevel>("confirmed");

  // Form states for Edit / Correct
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImportance, setEditImportance] = useState<number>(4);
  const [editConfidence, setEditConfidence] = useState<MemoryConfidenceLevel>("confirmed");
  const [shouldSupersede, setShouldSupersede] = useState<boolean>(true);

  const memoryService = ElmoMemoryService.getInstance();
  const authService = AuthService.getInstance();

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const session = await authService.getSession();
      const org = session?.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
      const usr = session?.user?.id || "00000000-0000-0000-0000-000000000001";
      setActiveOrgId(org);
      setUserId(usr);

      // Fetch active + superseded + archived memories
      const records = await memoryService.listMemories(usr, org, {
        status: ["active", "superseded", "archived"],
        limit: 150,
      });

      // If empty, seed initial company knowledge foundation so user has rich context immediately
      if (records.length === 0) {
        await memoryService.saveBusinessMemory({
          userId: usr,
          organizationId: org,
          title: "Executive Persona & Identity",
          content: "Always communicate with high executive authority, encouraging tone, and clarity.",
          importanceScore: 1.0,
        });
        await memoryService.saveGoal({
          userId: usr,
          organizationId: org,
          goal: "Accelerate high-converting customer acquisition and funnel automation.",
          importance: 5,
        });
        const fresh = await memoryService.listMemories(usr, org, {
          status: ["active", "superseded", "archived"],
          limit: 150,
        });
        setMemories(fresh);
      } else {
        setMemories(records);
      }
    } catch (err: unknown) {
      console.error("Failed to load memories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  // Filtered memory list
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      // Status filter
      if (selectedStatus !== "all" && (m.status || "active") !== selectedStatus) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && m.category !== selectedCategory) {
        return false;
      }
      // Scope filter
      if (selectedScope !== "all" && m.scope !== selectedScope) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inContent = m.content.toLowerCase().includes(q);
        const inTitle = m.title?.toLowerCase().includes(q) || false;
        const inCategory = m.category.toLowerCase().includes(q);
        if (!inContent && !inTitle && !inCategory) return false;
      }
      return true;
    });
  }, [memories, selectedStatus, selectedCategory, selectedScope, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = memories.length;
    const active = memories.filter((m) => (m.status || "active") === "active").length;
    const confirmed = memories.filter((m) => m.confidence_level === "confirmed" || Number(m.confidence) >= 0.95).length;
    const highImportance = memories.filter((m) => Number(m.importance_score) >= 4).length;
    return { total, active, confirmed, highImportance };
  }, [memories]);

  // Create Memory Handler
  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setStatusMessage(null);
    const res = await memoryService.createMemory({
      userId,
      organizationId: activeOrgId,
      title: newTitle.trim() || undefined,
      content: newContent.trim(),
      category: newCategory,
      scope: newScope,
      importance: newImportance,
      confidenceLevel: newConfidence,
      status: "active",
      source: "user_input",
    });

    if (res.data) {
      setIsAddModalOpen(false);
      setNewTitle("");
      setNewContent("");
      setStatusMessage({ type: "success", text: "New business memory successfully committed to Company Brain." });
      await loadMemories();
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to commit memory." });
    }
  };

  // Edit / Supersede Handler
  const handleEditMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemory || !editContent.trim()) return;

    setStatusMessage(null);

    if (shouldSupersede) {
      // Historical supersession: preserve old memory with link
      const res = await memoryService.supersedeMemory({
        userId,
        organizationId: activeOrgId,
        oldMemoryId: selectedMemory.id,
        newMemory: {
          title: editTitle.trim() || selectedMemory.title || undefined,
          content: editContent.trim(),
          category: selectedMemory.category,
          scope: selectedMemory.scope,
          importance: editImportance,
          confidenceLevel: editConfidence,
          source: "user_input",
        },
      });

      if (res.data) {
        setIsEditModalOpen(false);
        setSelectedMemory(null);
        setStatusMessage({
          type: "success",
          text: `Memory updated. Previous record preserved as historical knowledge (superseded).`,
        });
        await loadMemories();
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to update memory." });
      }
    } else {
      // Direct update
      const res = await memoryService.updateMemory(userId, activeOrgId, selectedMemory.id, {
        title: editTitle.trim() || undefined,
        content: editContent.trim(),
        importance: editImportance,
        confidenceLevel: editConfidence,
      });

      if (res.data) {
        setIsEditModalOpen(false);
        setSelectedMemory(null);
        setStatusMessage({ type: "success", text: "Memory record updated directly." });
        await loadMemories();
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to update memory." });
      }
    }
  };

  // Archive Handler
  const handleToggleArchive = async (mem: CompanyMemoryRow) => {
    const nextStatus = mem.status === "archived" ? "active" : "archived";
    const res = await memoryService.updateMemory(userId, activeOrgId, mem.id, { status: nextStatus });
    if (res.data) {
      setStatusMessage({
        type: "success",
        text: nextStatus === "archived" ? "Memory archived." : "Memory restored to active status.",
      });
      await loadMemories();
    }
  };

  // Delete Handler
  const handleDelete = async (memId: string) => {
    if (!confirm("Are you sure you want to permanently delete this memory?")) return;
    const res = await memoryService.deleteMemory(userId, activeOrgId, memId);
    if (res.data) {
      setStatusMessage({ type: "success", text: "Memory record permanently deleted." });
      await loadMemories();
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Company Brain & Memory Bank
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium">
                  Phase 2 Active
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                ELMO&apos;s persistent long-term institutional intelligence, audience insights, decisions, and business rules.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadMemories()}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary rounded-lg border border-border/60 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all shadow-primary/20 hover:shadow-primary/30"
          >
            <Plus className="h-4 w-4" />
            Add Memory
          </button>
        </div>
      </div>

      {/* Status feedback message */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-lg border text-sm transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Total Institutional Memories</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.total}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/80 text-muted-foreground">
            <Database className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Active Business Knowledge</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.active}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Confirmed Facts</div>
            <div className="text-2xl font-bold text-primary mt-1">{stats.confirmed}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">High Importance (Level 4–5)</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats.highImportance}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Star className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search business identity, audience, offers, decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-secondary/50 border border-border/80 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-secondary/40 p-1 rounded-lg border border-border/60 text-xs">
            {["all", "active", "superseded", "archived"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-all ${
                  selectedStatus === st
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Category & Scope Dropdowns */}
        <div className="flex items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <option value="business">Business</option>
            <option value="goal">Goals</option>
            <option value="decision">Decisions</option>
            <option value="preference">Preferences</option>
            <option value="customer">Customer</option>
            <option value="funnel">Funnel</option>
            <option value="strategy">Strategy</option>
            <option value="important_fact">Important Fact</option>
          </select>

          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="text-xs bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Scopes</option>
            <option value="organization">Company Memory</option>
            <option value="user">User Personal</option>
            <option value="customer">Customer</option>
          </select>
        </div>
      </div>

      {/* Memory Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-3 text-sm text-muted-foreground">Accessing neural Company Brain...</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border/80 bg-card/40">
          <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-foreground">No memories found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            No long-term memories match your current search and filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedStatus("all");
              setSelectedScope("all");
            }}
            className="mt-4 px-3 py-1.5 text-xs font-medium text-primary hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map((mem) => {
            const importanceStars = Math.min(5, Math.max(1, Math.round(Number(mem.importance_score) || 3)));
            const isSuperseded = mem.status === "superseded";
            const isArchived = mem.status === "archived";

            return (
              <div
                key={mem.id}
                className={`p-4 rounded-xl bg-card border transition-all flex flex-col justify-between ${
                  isSuperseded
                    ? "border-amber-500/30 bg-amber-500/5 opacity-80"
                    : isArchived
                    ? "border-border/50 bg-secondary/20 opacity-60"
                    : "border-border/80 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
                }`}
              >
                <div>
                  {/* Card Header: Category, Scope, Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-secondary text-foreground uppercase tracking-wider border border-border/60">
                        {mem.category}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                        {mem.scope === "user" ? (
                          <User className="h-2.5 w-2.5" />
                        ) : mem.scope === "customer" ? (
                          <Users className="h-2.5 w-2.5" />
                        ) : (
                          <Building2 className="h-2.5 w-2.5" />
                        )}
                        {mem.scope === "user" ? "User" : mem.scope === "customer" ? "Customer" : "Company"}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize border ${
                        isSuperseded
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : isArchived
                          ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {mem.status || "active"}
                    </span>
                  </div>

                  {/* Title if available */}
                  {mem.title && (
                    <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-1">{mem.title}</h4>
                  )}

                  {/* Memory Content */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 font-normal">
                    {mem.content}
                  </p>

                  {/* Superseded Notification */}
                  {isSuperseded && (
                    <div className="mt-2.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Historical record: Superseded by a newer business directive.</span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  {/* Importance Stars & Confidence */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-400" title={`Importance: ${importanceStars}/5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < importanceStars ? "fill-amber-400" : "text-border"}`}
                        />
                      ))}
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-secondary text-muted-foreground border border-border/40"
                      title="Confidence level"
                    >
                      {(mem.confidence_level || "high").toUpperCase()}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedMemory(mem);
                        setEditTitle(mem.title || "");
                        setEditContent(mem.content);
                        setEditImportance(Math.min(5, Math.max(1, Math.round(Number(mem.importance_score) || 4))));
                        setEditConfidence(mem.confidence_level || "confirmed");
                        setIsEditModalOpen(true);
                      }}
                      className="p-1 hover:text-foreground text-muted-foreground hover:bg-secondary rounded transition-colors"
                      title="Edit / Correct Memory"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(mem)}
                      className="p-1 hover:text-amber-400 text-muted-foreground hover:bg-secondary rounded transition-colors"
                      title={isArchived ? "Restore Memory" : "Archive Memory"}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(mem.id)}
                      className="p-1 hover:text-red-400 text-muted-foreground hover:bg-secondary rounded transition-colors"
                      title="Delete Memory"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Memory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Commit New Business Memory
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Memory Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Target Audience: Mid-sized Dental Practices"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="business">Business</option>
                    <option value="goal">Goal</option>
                    <option value="decision">Decision</option>
                    <option value="preference">Preference / Constraint</option>
                    <option value="customer">Customer</option>
                    <option value="funnel">Funnel</option>
                    <option value="strategy">Strategy</option>
                    <option value="important_fact">Important Fact</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Memory Scope</label>
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value as MemoryScope)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="organization">Company (All Agents & Operations)</option>
                    <option value="user">User Personal Preference</option>
                    <option value="customer">Customer Journey Record</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Knowledge Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter the persistent business fact, offer description, target demographic, or brand rule..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Importance (1 to 5)</label>
                  <select
                    value={newImportance}
                    onChange={(e) => setNewImportance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={5}>5 — Critical Business Rule</option>
                    <option value={4}>4 — Important Strategy / Offer</option>
                    <option value={3}>3 — Useful Context</option>
                    <option value={2}>2 — Low Importance</option>
                    <option value={1}>1 — Trivial Note</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Confidence Calibration</label>
                  <select
                    value={newConfidence}
                    onChange={(e) => setNewConfidence(e.target.value as MemoryConfidenceLevel)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="confirmed">Confirmed (Direct User Order)</option>
                    <option value="high">High (Established Fact)</option>
                    <option value="medium">Medium (Probable / Emerging)</option>
                    <option value="low">Low (Uncertain / Exploration)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-sm transition-all"
                >
                  Commit Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Supersede Memory Modal */}
      {isEditModalOpen && selectedMemory && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                Correct or Update Memory
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditMemory} className="space-y-3.5 text-xs">
              {/* Supersede Mode Toggle */}
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1.5">
                <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shouldSupersede}
                    onChange={(e) => setShouldSupersede(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Supersede older record (Recommended)</span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-5 leading-normal">
                  Preserves the existing record as historical context and links this new version with full traceability.
                </p>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Content</label>
                <textarea
                  rows={4}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Importance</label>
                  <select
                    value={editImportance}
                    onChange={(e) => setEditImportance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={5}>5 — Critical</option>
                    <option value={4}>4 — Important</option>
                    <option value={3}>3 — Useful</option>
                    <option value={2}>2 — Low</option>
                    <option value={1}>1 — Trivial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Confidence Level</label>
                  <select
                    value={editConfidence}
                    onChange={(e) => setEditConfidence(e.target.value as MemoryConfidenceLevel)}
                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-sm transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
