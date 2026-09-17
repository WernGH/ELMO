/**
 * ELMO Business Operations Suite — Quote & Invoicing Service
 *
 * Handles creation, status tracking, public review/acceptance,
 * and automated polite payment reminder generation.
 */

import { MockDataStore, QuoteRow, QuoteInsert, QuoteItem } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface CreateQuoteParams {
  userId: string;
  organizationId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  currency?: string;
  items: QuoteItem[];
  taxRate?: number;
  paymentTerms?: string;
  paymentInstructions?: string;
  dueDate?: string;
  notes?: string;
}

export interface PaymentReminder {
  channel: "whatsapp" | "email";
  subject?: string;
  message: string;
  quoteNumber: string;
  totalAmount: number;
  currency: string;
  publicUrl: string;
  daysOverdue: number;
}

export class QuoteService {
  private static instance: QuoteService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): QuoteService {
    if (!QuoteService.instance) {
      QuoteService.instance = new QuoteService();
    }
    return QuoteService.instance;
  }

  public static resetInstance(): void {
    QuoteService.instance = undefined as any;
  }

  public async getQuotes(userId: string, organizationId: string): Promise<QuoteRow[]> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("quotes") as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data as QuoteRow[];
      }
    }
    return this.store.queryQuotesWithRLS(userId, organizationId);
  }

  public async getQuoteById(userId: string, organizationId: string, quoteId: string): Promise<QuoteRow | null> {
    const quotes = await this.getQuotes(userId, organizationId);
    return quotes.find((q) => q.id === quoteId) || null;
  }

  public async getPublicQuote(quoteId: string): Promise<QuoteRow | null> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("quotes") as any)
        .select("*")
        .eq("id", quoteId)
        .single();

      if (!error && data) {
        return data as QuoteRow;
      }
    }
    return this.store.getPublicQuoteById(quoteId);
  }

  public async createQuote(params: CreateQuoteParams): Promise<QuoteRow> {
    if (!params.organizationId || !params.clientName) {
      throw new Error("Missing required parameters: organizationId and clientName are required.");
    }
    if (!params.items || params.items.length === 0) {
      throw new Error("Quote must have at least one line item.");
    }

    const items = params.items.map((it, idx) => ({
      id: it.id || `item-${idx + 1}`,
      description: it.description,
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      amount: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
    }));

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = params.taxRate ?? 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const insertData: QuoteInsert = {
      organization_id: params.organizationId,
      client_name: params.clientName.trim(),
      client_email: params.clientEmail?.trim() || null,
      client_phone: params.clientPhone?.trim() || null,
      currency: params.currency || "USD",
      items,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_terms: params.paymentTerms || "Net 14",
      payment_instructions: params.paymentInstructions || "Bank Transfer or Online Card Payment",
      due_date: params.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      notes: params.notes || null,
      status: "sent",
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("quotes") as any)
        .insert(insertData)
        .select()
        .single();

      if (!error && data) {
        return data as QuoteRow;
      }
    }

    return this.store.createQuote(insertData);
  }

  public async updateQuoteStatus(
    userId: string,
    organizationId: string,
    quoteId: string,
    status: QuoteRow["status"]
  ): Promise<QuoteRow | null> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("quotes") as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", quoteId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (!error && data) {
        return data as QuoteRow;
      }
    }

    return this.store.updateQuote(userId, organizationId, quoteId, { status });
  }

  public async updatePublicQuoteStatus(
    quoteId: string,
    status: "accepted" | "declined"
  ): Promise<QuoteRow | null> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("quotes") as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", quoteId)
        .select()
        .single();

      if (!error && data) {
        return data as QuoteRow;
      }
    }

    return this.store.updatePublicQuoteStatus(quoteId, status);
  }

  public generatePaymentReminderCopy(
    quote: QuoteRow,
    baseUrl = "https://app.coai.international",
    channel: "whatsapp" | "email" = "whatsapp"
  ): PaymentReminder {
    const publicUrl = `${baseUrl}/quote/${quote.id}`;
    const dueTime = quote.due_date ? new Date(quote.due_date).getTime() : Date.now();
    const now = Date.now();
    const isOverdue = now > dueTime;
    const daysOverdue = isOverdue ? Math.floor((now - dueTime) / (1000 * 60 * 60 * 24)) : 0;

    const formattedAmount = `${quote.currency} ${quote.total_amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    if (channel === "whatsapp") {
      const message = isOverdue
        ? `Hi ${quote.client_name}, this is a gentle follow-up regarding quote #${quote.quote_number} (${formattedAmount}), which was due ${daysOverdue} days ago.\n\nYou can review the quote and settle payment easily here:\n👉 ${publicUrl}\n\nThank you for your partnership!`
        : `Hi ${quote.client_name}, hope you are well! Just a friendly reminder that quote #${quote.quote_number} (${formattedAmount}) is available for your review:\n👉 ${publicUrl}\n\nPlease let us know if you have any questions.`;

      return {
        channel: "whatsapp",
        message,
        quoteNumber: quote.quote_number,
        totalAmount: quote.total_amount,
        currency: quote.currency,
        publicUrl,
        daysOverdue,
      };
    }

    const subject = isOverdue
      ? `Follow-up: Overdue Invoice #${quote.quote_number} (${formattedAmount})`
      : `Invoice / Quote #${quote.quote_number} for ${quote.client_name}`;

    const message = isOverdue
      ? `Dear ${quote.client_name},\n\nWe hope this email finds you well. We are following up regarding invoice #${quote.quote_number} for the amount of ${formattedAmount}, which had a due date of ${quote.due_date ? new Date(quote.due_date).toLocaleDateString() : "recently"}.\n\nPlease review and settle the payment via our secure portal:\n${publicUrl}\n\nPayment Instructions:\n${quote.payment_instructions || "Direct bank transfer / Card"}\n\nBest regards,\nAccounts Team`
      : `Dear ${quote.client_name},\n\nPlease find the details for quote #${quote.quote_number} totaling ${formattedAmount}.\n\nYou may review the deliverables and accept the quote here:\n${publicUrl}\n\nBest regards,\nAccounts Team`;

    return {
      channel: "email",
      subject,
      message,
      quoteNumber: quote.quote_number,
      totalAmount: quote.total_amount,
      currency: quote.currency,
      publicUrl,
      daysOverdue,
    };
  }
}
