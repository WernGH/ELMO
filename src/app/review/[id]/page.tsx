"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ReviewService, ReviewFeedbackResult } from "@/services/review.service";
import { ReviewRequestRow } from "@/lib/supabase/mock-store";
import { Star, CheckCircle2, AlertCircle, Heart, ShieldCheck, ExternalLink, Send } from "lucide-react";

export default function PublicReviewPage() {
  const params = useParams();
  const requestId = params?.id as string;

  const [request, setRequest] = useState<ReviewRequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReviewFeedbackResult | null>(null);

  const reviewService = ReviewService.getInstance();

  useEffect(() => {
    if (requestId) {
      loadRequest();
    }
  }, [requestId]);

  async function loadRequest() {
    try {
      const r = await reviewService.getPublicReviewRequest(requestId);
      setRequest(r);
      if (r?.rating) {
        setSelectedRating(r.rating);
      }
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await reviewService.submitCustomerFeedback(requestId, selectedRating, feedbackText);
      setResult(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4">
        <p className="text-zinc-500 font-mono text-sm">Loading feedback page...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="text-lg font-bold text-zinc-100 font-mono">Feedback Link Not Found</h1>
          <p className="text-xs text-zinc-500 font-mono">This review invitation may be invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-zinc-100 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-lg w-full bg-[#091120] border border-[#162744] rounded-2xl p-6 sm:p-10 space-y-6 shadow-2xl">
        {result ? (
          // Post-Submission Screen
          <div className="text-center space-y-4 py-4">
            {result.redirectToGoogle ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <Heart className="w-7 h-7 fill-emerald-400" />
                </div>
                <h2 className="text-xl font-bold font-mono text-zinc-100">Thank You, {request.customer_name}!</h2>
                <p className="text-sm text-zinc-300">{result.message}</p>
                {result.googleReviewUrl && (
                  <div className="pt-4">
                    <a
                      href={result.googleReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all font-mono"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Post Review on Google
                    </a>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold font-mono text-zinc-100">We Value Your Feedback</h2>
                <p className="text-sm text-zinc-300">{result.message}</p>
                <p className="text-xs text-zinc-500 font-mono">
                  Your comments have been delivered to our management team for review.
                </p>
              </>
            )}
          </div>
        ) : (
          // Rating Form
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                Customer Experience
              </span>
              <h1 className="text-2xl font-bold font-mono text-zinc-100">
                How was your experience, {request.customer_name}?
              </h1>
              <p className="text-xs text-zinc-400">
                Tap the stars below to rate your recent service with us.
              </p>
            </div>

            {/* Interactive 5-Star Selector */}
            <div className="flex items-center justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || selectedRating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setSelectedRating(star)}
                    className="p-1 text-zinc-600 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        isFilled
                          ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                          : "text-zinc-600"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Dynamic Context based on rating */}
            {selectedRating <= 3 ? (
              <div className="space-y-2 bg-[#0C172C] p-4 rounded-xl border border-rose-500/30">
                <p className="text-xs font-bold text-rose-300">
                  We&apos;re so sorry to hear your experience wasn&apos;t 5-star.
                </p>
                <p className="text-xs text-zinc-400">
                  Please tell our management team what happened so we can resolve this for you immediately:
                </p>
                <textarea
                  required
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What could we have done better?"
                  className="w-full mt-2 p-2.5 bg-[#050914] border border-[#162744] rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-rose-400"
                />
              </div>
            ) : (
              <div className="text-center text-xs text-zinc-400 font-mono">
                Awesome! You will be invited to post your review on Google.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 font-mono disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
