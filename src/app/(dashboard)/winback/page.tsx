"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Search,
  Sparkles,
  Send,
  Clock,
  Gift,
  CheckCircle2,
  Copy,
  Users,
  AlertCircle,
} from "lucide-react";
import { ReengagementService, WinbackDraft } from "@/services/reengagement.service";
import { ContactRow } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";

export default function WinbackPage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");

  const [daysThreshold, setDaysThreshold] = useState(60);
  const [inactiveContacts, setInactiveContacts] = useState<ContactRow[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Incentive config
  const [offerTitle, setOfferTitle] = useState("Exclusive 20% Return Customer Voucher");
  const [discountCode, setDiscountCode] = useState("WELCOME20");
  const [validityDays, setValidityDays] = useState("14");
  const [businessName, setBusinessName] = useState("Our Team");

  // Campaign result
  const [generatedDrafts, setGeneratedDrafts] = useState<WinbackDraft[]>([]);
  const [campaignLaunched, setCampaignLaunched] = useState(false);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  const reengagementService = ReengagementService.getInstance();

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
    handleScan();
  }, [orgId, userId, daysThreshold]);

  async function handleScan() {
    setLoading(true);
    setCampaignLaunched(false);
    try {
      const res = await reengagementService.scanInactiveContacts(userId, orgId, daysThreshold);
      setInactiveContacts(res.contacts);
      setSelectedContactIds(res.contacts.map((c) => c.id));
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const toggleSelectContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter((cid) => cid !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.length === inactiveContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(inactiveContacts.map((c) => c.id));
    }
  };

  const handleGenerateCampaign = async () => {
    if (selectedContactIds.length === 0) return;
    try {
      const result = await reengagementService.createWinbackCampaign(
        userId,
        orgId,
        selectedContactIds,
        {
          offerTitle,
          discountCode,
          validityDays: parseInt(validityDays) || 14,
          businessName,
        }
      );

      setGeneratedDrafts(result.drafts);
      setCampaignLaunched(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyDraft = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraftId(id);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-zinc-100 flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-amber-400" />
            Customer Win-Back & Re-Engagement
          </h1>
          <p className="text-sm text-zinc-400">
            Automatically scan dormant customers, craft personalized win-back offers, and drive repeat revenue without ads.
          </p>
        </div>
      </div>

      {/* Control Strip & Scanner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Filter & Offer Settings */}
        <div className="bg-[#091120] border border-[#162744] p-5 rounded-xl space-y-4">
          <h2 className="text-sm font-bold font-mono text-zinc-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-400" />
            1. Inactive Audience Filter
          </h2>

          <div>
            <label className="text-xs font-mono text-zinc-400">Dormant Period Threshold</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {[30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setDaysThreshold(days)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-mono border transition-all ${
                    daysThreshold === days
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                      : "bg-[#0C172C] text-zinc-400 border-[#162744] hover:text-zinc-200"
                  }`}
                >
                  {days}+ Days
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#162744] space-y-3">
            <h2 className="text-sm font-bold font-mono text-zinc-200 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400" />
              2. Win-Back Incentive
            </h2>

            <div>
              <label className="text-xs font-mono text-zinc-400">Offer Title</label>
              <input
                type="text"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                placeholder="e.g. 20% Off Your Next Visit"
                className="w-full mt-1 px-3 py-1.5 bg-[#0C172C] border border-[#162744] rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-mono text-zinc-400">Promo Code</label>
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0C172C] border border-[#162744] rounded-lg text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-400">Valid Days</label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-[#0C172C] border border-[#162744] rounded-lg text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400">Business / Brand Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Metro Dental Clinic"
                className="w-full mt-1 px-3 py-1.5 bg-[#0C172C] border border-[#162744] rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              onClick={handleGenerateCampaign}
              disabled={selectedContactIds.length === 0}
              className="w-full mt-2 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-lg text-xs font-mono shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Generate Win-Back Drafts ({selectedContactIds.length})
            </button>
          </div>
        </div>

        {/* Right Column: Scanned Inactive Contacts List */}
        <div className="md:col-span-2 bg-[#091120] border border-[#162744] rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#162744] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold font-mono text-zinc-200">
                Dormant Contacts ({inactiveContacts.length} found)
              </h2>
            </div>
            {inactiveContacts.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-xs font-mono text-amber-400 hover:text-amber-300"
              >
                {selectedContactIds.length === inactiveContacts.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 font-mono text-xs">Scanning contacts...</div>
            ) : inactiveContacts.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mx-auto" />
                <p className="text-zinc-300 text-sm font-medium">All contacts are actively engaged!</p>
                <p className="text-zinc-500 text-xs font-mono">
                  No contacts found inactive for over {daysThreshold} days.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#162744]">
                {inactiveContacts.map((contact) => {
                  const isSelected = selectedContactIds.includes(contact.id);
                  const lastTime = new Date(contact.updated_at || contact.created_at).getTime();
                  const daysAgo = Math.floor((Date.now() - lastTime) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleSelectContact(contact.id)}
                      className={`p-3 hover:bg-[#0C172C] transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected ? "bg-[#0C172C]/60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 accent-amber-500 rounded"
                        />
                        <div>
                          <p className="text-xs font-bold text-zinc-200">
                            {contact.first_name || contact.email}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-mono">
                            {contact.email} {contact.phone ? `• ${contact.phone}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{daysAgo} days ago</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Generated Result */}
      {campaignLaunched && generatedDrafts.length > 0 && (
        <div className="bg-[#091120] border border-amber-500/30 rounded-xl p-5 space-y-4 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
          <div className="flex items-center justify-between border-b border-[#162744] pb-3">
            <div>
              <h3 className="text-sm font-bold font-mono text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Win-Back Campaign Generated ({generatedDrafts.length} messages)
              </h3>
              <p className="text-xs text-zinc-400">
                Drafts registered in Tasks and recorded in Activity feed. Ready for 1-click dispatch.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              DISPATCH QUEUED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedDrafts.slice(0, 4).map((draft) => (
              <div key={draft.contactId} className="bg-[#050914] border border-[#162744] p-3.5 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-zinc-200">{draft.contactName}</span>
                  <span className="text-zinc-500">{draft.daysInactive} days inactive</span>
                </div>

                <div className="p-2.5 bg-[#0C172C] rounded text-xs font-mono text-zinc-300 whitespace-pre-wrap select-all max-h-32 overflow-y-auto">
                  {draft.whatsappMessage}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => copyDraft(draft.whatsappMessage, draft.contactId)}
                    className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedDraftId === draft.contactId ? "Copied!" : "Copy WhatsApp Copy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
