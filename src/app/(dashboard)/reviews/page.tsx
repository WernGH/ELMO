"use client";

import React, { useState, useEffect } from "react";
import {
  Star,
  Plus,
  ShieldCheck,
  Send,
  AlertTriangle,
  Copy,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { ReviewService } from "@/services/review.service";
import { ReviewRequestRow } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";

export default function ReviewsPage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");

  const [reviews, setReviews] = useState<ReviewRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareModal, setShareModal] = useState<{ message: string; publicUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("https://g.page/r/your-google-profile/review");

  const reviewService = ReviewService.getInstance();

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
    loadReviews();
  }, [orgId, userId]);

  async function loadReviews() {
    try {
      const data = await reviewService.getReviewRequests(userId, orgId);
      setReviews(data);
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerContact.trim()) return;

    try {
      const req = await reviewService.createReviewRequest({
        userId,
        organizationId: orgId,
        customerName,
        customerPhoneOrEmail: customerContact,
        channel,
        googleReviewUrl,
      });

      const invite = reviewService.generateReviewInviteCopy(req, window.location.origin);
      setCustomerName("");
      setCustomerContact("");
      setIsModalOpen(false);
      setShareModal(invite);
      await loadReviews();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ratedReviews = reviews.filter((r) => r.rating !== null && r.rating !== undefined);
  const avgRating =
    ratedReviews.length > 0
      ? (ratedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedReviews.length).toFixed(1)
      : "5.0";

  const positiveCount = reviews.filter((r) => r.status === "rated_positive").length;
  const interceptedCount = reviews.filter((r) => r.status === "intercepted_negative").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-zinc-100 flex items-center gap-2.5">
            <Star className="w-6 h-6 text-amber-400" />
            Google Review & Reputation Booster
          </h1>
          <p className="text-sm text-zinc-400">
            Route 4-5 star ratings directly to Google Reviews, and intercept 1-3 star feedback before it hurts your reputation.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-lg text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Request Customer Review
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#091120] border border-[#162744] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Average Rating</p>
            <p className="text-xl font-bold text-amber-400">
              {avgRating} <span className="text-xs font-normal text-zinc-400">/ 5.0</span>
            </p>
          </div>
        </div>

        <div className="bg-[#091120] border border-[#162744] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ThumbsUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Sent to Google</p>
            <p className="text-xl font-bold text-emerald-400">{positiveCount}</p>
          </div>
        </div>

        <div className="bg-[#091120] border border-[#162744] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Shielded / Intercepted</p>
            <p className="text-xl font-bold text-rose-400">{interceptedCount}</p>
          </div>
        </div>
      </div>

      {/* Review Requests List */}
      <div className="bg-[#091120] border border-[#162744] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#162744] flex items-center justify-between">
          <h2 className="text-sm font-bold font-mono text-zinc-200">Customer Review History ({reviews.length})</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500 font-mono text-sm">Loading review records...</div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Star className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-zinc-400 text-sm">No review requests sent yet.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-amber-400 underline font-mono"
            >
              Send your first review request
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#162744]">
            {reviews.map((req) => (
              <div
                key={req.id}
                className="p-4 hover:bg-[#0C172C] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-zinc-100">{req.customer_name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        req.status === "rated_positive"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : req.status === "intercepted_negative"
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                      }`}
                    >
                      {req.status === "rated_positive"
                        ? "5-Star Redirected"
                        : req.status === "intercepted_negative"
                        ? "Negative Intercepted"
                        : "Pending Feedback"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">
                    Contact: {req.customer_phone_or_email} • Channel: {req.channel}
                  </p>
                  {req.private_feedback && (
                    <div className="mt-2 p-2.5 rounded bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200">
                      <span className="font-bold">Private Customer Feedback: </span>
                      "{req.private_feedback}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {req.rating ? (
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(req.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                      <span className="font-mono text-xs font-bold text-zinc-200 ml-1">
                        {req.rating}/5
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-zinc-500">Unrated</span>
                  )}

                  <div className="flex items-center gap-2">
                    <a
                      href={`/review/${req.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded bg-[#162744] hover:bg-[#1E365E] text-zinc-300 transition-colors"
                      title="Open Rating Page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => {
                        const copy = reviewService.generateReviewInviteCopy(req, window.location.origin);
                        setShareModal(copy);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Share Link
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Review Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#091120] border border-[#162744] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold font-mono text-zinc-100 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Request Customer Review
            </h2>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-zinc-400">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-400">Phone or Email *</label>
                  <input
                    type="text"
                    required
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    placeholder="+60 12-345 6789"
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400">Outreach Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400">Google Review Profile URL</label>
                <input
                  type="url"
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/..."
                  className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Customers rating 4 or 5 stars will be immediately redirected here.
                </p>
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
                  Create & Get Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#091120] border border-[#162744] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                Customer Review Invite Copy
              </h3>
              <button
                onClick={() => setShareModal(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-mono"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Copy and paste this invite message directly into WhatsApp or SMS:
            </p>

            <div className="p-3 bg-[#050914] border border-[#162744] rounded-lg font-mono text-xs text-zinc-200 whitespace-pre-wrap select-all">
              {shareModal.message}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] font-mono text-zinc-500">
                Link: {shareModal.publicUrl}
              </span>
              <button
                onClick={() => copyToClipboard(shareModal.message)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs font-mono transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
