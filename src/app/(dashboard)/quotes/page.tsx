"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  DollarSign,
  Send,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Trash2,
  FileText,
} from "lucide-react";
import { QuoteService, PaymentReminder } from "@/services/quote.service";
import { QuoteRow, QuoteItem } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";

export default function QuotesPage() {
  const [orgId, setOrgId] = useState("11111111-1111-1111-1111-111111111111");
  const [userId, setUserId] = useState("dev-user");

  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reminderModal, setReminderModal] = useState<PaymentReminder | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentTerms, setPaymentTerms] = useState("Net 14");
  const [items, setItems] = useState<QuoteItem[]>([
    { description: "Standard Service Consultation & Deliverable", quantity: 1, unit_price: 1500, amount: 1500 },
  ]);

  const quoteService = QuoteService.getInstance();

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
    loadQuotes();
  }, [orgId, userId]);

  async function loadQuotes() {
    try {
      const data = await quoteService.getQuotes(userId, orgId);
      setQuotes(data);
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const handleUpdateItem = (index: number, field: keyof QuoteItem, val: string | number) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };
    item.amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || items.length === 0) return;

    try {
      await quoteService.createQuote({
        userId,
        organizationId: orgId,
        clientName,
        clientEmail,
        currency,
        items,
        paymentTerms,
      });

      setClientName("");
      setClientEmail("");
      setItems([{ description: "Standard Service Consultation & Deliverable", quantity: 1, unit_price: 1500, amount: 1500 }]);
      setIsModalOpen(false);
      await loadQuotes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (quoteId: string, status: QuoteRow["status"]) => {
    await quoteService.updateQuoteStatus(userId, orgId, quoteId, status);
    await loadQuotes();
  };

  const handleOpenReminder = (quote: QuoteRow) => {
    const reminder = quoteService.generatePaymentReminderCopy(quote, window.location.origin, "whatsapp");
    setReminderModal(reminder);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Metrics
  const totalValue = quotes.reduce((sum, q) => sum + q.total_amount, 0);
  const paidValue = quotes.filter((q) => q.status === "paid").reduce((sum, q) => sum + q.total_amount, 0);
  const pendingValue = quotes.filter((q) => q.status !== "paid" && q.status !== "declined").reduce((sum, q) => sum + q.total_amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-zinc-100 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-400" />
            Quotes & Invoicing Engine
          </h1>
          <p className="text-sm text-zinc-400">
            Create branded quotations, track acceptance, and generate automated late-payment reminders.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-lg text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Quote
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#091120] border border-[#162744] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Total Quoted</p>
            <p className="text-xl font-bold text-zinc-100">${totalValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-[#091120] border border-[#162744] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Collected / Paid</p>
            <p className="text-xl font-bold text-emerald-400">${paidValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-[#091120] border border-[#162744] p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Pending Balance</p>
            <p className="text-xl font-bold text-blue-400">${pendingValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Quotes List */}
      <div className="bg-[#091120] border border-[#162744] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#162744] flex items-center justify-between">
          <h2 className="text-sm font-bold font-mono text-zinc-200">Active Pipeline Quotes ({quotes.length})</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500 font-mono text-sm">Loading quotes...</div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-zinc-400 text-sm">No quotations created yet.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs text-amber-400 underline font-mono"
            >
              Create your first quote
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#162744]">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="p-4 hover:bg-[#0C172C] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-zinc-100">{quote.quote_number}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        quote.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : quote.status === "accepted"
                          ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                          : quote.status === "overdue"
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {quote.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-300">{quote.client_name}</p>
                  <p className="text-xs text-zinc-500 font-mono">
                    {quote.items.length} line item(s) • Terms: {quote.payment_terms}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono text-zinc-100">
                      {quote.currency} {quote.total_amount.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Due: {quote.due_date ? new Date(quote.due_date).toLocaleDateString() : "Upon Receipt"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/quote/${quote.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded bg-[#162744] hover:bg-[#1E365E] text-zinc-300 transition-colors"
                      title="View Public Quote Page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => handleOpenReminder(quote)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Remind
                    </button>

                    {quote.status !== "paid" && (
                      <button
                        onClick={() => handleStatusChange(quote.id, "paid")}
                        className="p-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                        title="Mark as Paid"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Quote Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#091120] border border-[#162744] rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold font-mono text-zinc-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Create Quotation / Invoice
            </h2>

            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-400">Client / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Apex Legal Group"
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400">Client Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="billing@apexlegal.com"
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-400">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="MYR">MYR (RM)</option>
                    <option value="SGD">SGD (S$)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-[#0C172C] border border-[#162744] rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 14">Net 14 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-zinc-300 font-semibold uppercase tracking-wider">
                    Line Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#0C172C] p-2.5 rounded-lg border border-[#162744]">
                    <input
                      type="text"
                      required
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                      className="flex-1 px-2 py-1 bg-transparent text-sm text-zinc-100 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(idx, "quantity", e.target.value)}
                      className="w-16 px-2 py-1 bg-[#162744] rounded text-sm text-zinc-100 text-center font-mono focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => handleUpdateItem(idx, "unit_price", e.target.value)}
                      className="w-24 px-2 py-1 bg-[#162744] rounded text-sm text-zinc-100 text-right font-mono focus:outline-none"
                    />
                    <span className="w-24 text-right text-sm font-mono text-zinc-200">
                      ${item.amount.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="text-right pt-2 font-mono text-sm font-bold text-zinc-200">
                  Total: {currency} {subtotal.toLocaleString()}
                </div>
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
                  Generate & Send Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Copy Modal */}
      {reminderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#091120] border border-[#162744] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                Polite Payment Reminder Generator
              </h3>
              <button
                onClick={() => setReminderModal(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-mono"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Ready-to-send copy with direct payment link to send via WhatsApp or SMS:
            </p>

            <div className="p-3 bg-[#050914] border border-[#162744] rounded-lg font-mono text-xs text-zinc-200 whitespace-pre-wrap select-all">
              {reminderModal.message}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] font-mono text-zinc-500">
                Link: {reminderModal.publicUrl}
              </span>
              <button
                onClick={() => copyToClipboard(reminderModal.message)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs font-mono transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
