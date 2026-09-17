"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { QuoteService } from "@/services/quote.service";
import { QuoteRow } from "@/lib/supabase/mock-store";
import { Receipt, CheckCircle2, AlertCircle, Shield, Building2 } from "lucide-react";

export default function PublicQuotePage() {
  const params = useParams();
  const quoteId = params?.id as string;

  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const quoteService = QuoteService.getInstance();

  useEffect(() => {
    if (quoteId) {
      loadQuote();
    }
  }, [quoteId]);

  async function loadQuote() {
    try {
      const q = await quoteService.getPublicQuote(quoteId);
      setQuote(q);
      if (q?.status === "accepted" || q?.status === "paid") {
        setAccepted(true);
      }
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const handleAcceptQuote = async () => {
    setSubmitting(true);
    try {
      await quoteService.updatePublicQuoteStatus(quoteId, "accepted");
      setAccepted(true);
      await loadQuote();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4">
        <p className="text-zinc-500 font-mono text-sm">Loading quotation...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="text-lg font-bold text-zinc-100 font-mono">Quotation Not Found</h1>
          <p className="text-xs text-zinc-500 font-mono">The requested quote link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-zinc-100 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto bg-[#091120] border border-[#162744] rounded-2xl p-6 sm:p-10 space-y-8 shadow-2xl">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#162744] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold">Official Quotation</p>
              <h1 className="text-xl font-bold font-mono text-zinc-100">{quote.quote_number}</h1>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span
              className={`text-xs font-mono px-3 py-1 rounded-full border uppercase ${
                accepted || quote.status === "paid"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-bold"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
              }`}
            >
              {accepted ? "Accepted & Confirmed" : quote.status}
            </span>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              Issue Date: {new Date(quote.issue_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Client & Company Context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1">Prepared For</p>
            <p className="font-bold text-zinc-100 text-base">{quote.client_name}</p>
            {quote.client_email && <p className="text-zinc-400 text-xs font-mono">{quote.client_email}</p>}
            {quote.client_phone && <p className="text-zinc-400 text-xs font-mono">{quote.client_phone}</p>}
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1">Payment Schedule</p>
            <p className="font-bold text-zinc-200">{quote.payment_terms}</p>
            <p className="text-zinc-400 text-xs font-mono">
              Due Date: {quote.due_date ? new Date(quote.due_date).toLocaleDateString() : "Upon Receipt"}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-[#162744] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0C172C] text-zinc-400 font-mono text-xs border-b border-[#162744]">
              <tr>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-center">Qty</th>
                <th className="p-3.5 text-right">Rate</th>
                <th className="p-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162744] text-zinc-300">
              {quote.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#0C172C]/50">
                  <td className="p-3.5 font-medium text-zinc-200">{item.description}</td>
                  <td className="p-3.5 text-center font-mono text-zinc-400">{item.quantity}</td>
                  <td className="p-3.5 text-right font-mono text-zinc-400">
                    ${item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right font-mono font-semibold text-zinc-100">
                    ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Breakdown */}
          <div className="bg-[#0C172C] p-4 border-t border-[#162744] space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>{quote.currency} {quote.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {quote.tax_rate > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Tax ({quote.tax_rate}%)</span>
                <span>{quote.currency} {quote.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-amber-400 pt-2 border-t border-[#162744]">
              <span>Total Amount</span>
              <span>{quote.currency} {quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Payment Details & Notes */}
        <div className="p-4 bg-[#050914] border border-[#162744] rounded-xl space-y-2 text-xs font-mono">
          <p className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">Payment Instructions</p>
          <p className="text-zinc-300 whitespace-pre-wrap">{quote.payment_instructions || "Direct bank transfer / Card payment"}</p>
          {quote.notes && (
            <div className="pt-2 border-t border-[#162744] text-zinc-400">
              <span className="font-bold">Notes: </span>{quote.notes}
            </div>
          )}
        </div>

        {/* Action Callout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#162744]">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <Shield className="w-4 h-4 text-emerald-400" />
            Verified & Protected by ELMO Operations
          </div>

          {!accepted ? (
            <button
              onClick={handleAcceptQuote}
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 font-mono disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? "Confirming..." : "Accept & Confirm Quotation"}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold">
              <CheckCircle2 className="w-5 h-5" />
              Quotation Accepted
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
