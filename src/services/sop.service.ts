/**
 * ELMO Business Operations Suite — Staff SOP & Onboarding Assistant Service
 *
 * Stores Standard Operating Procedures (SOPs), seeds standard business templates,
 * and provides instant answers to staff questions on company procedures.
 */

import { MockDataStore, SopRow, SopInsert } from "@/lib/supabase/mock-store";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface CreateSopParams {
  userId: string;
  organizationId: string;
  title: string;
  category?: "operations" | "customer_service" | "finance" | "safety" | "onboarding";
  content: string;
  tags?: string[];
}

export interface SopAnswer {
  matchedSopTitle: string;
  category: string;
  summary: string;
  steps: string[];
  fullContent: string;
  confidence: number;
}

export class SopService {
  private static instance: SopService;
  private store: MockDataStore;

  private constructor() {
    this.store = MockDataStore.getInstance();
  }

  public static getInstance(): SopService {
    if (!SopService.instance) {
      SopService.instance = new SopService();
    }
    return SopService.instance;
  }

  public static resetInstance(): void {
    SopService.instance = undefined as any;
  }

  public async getSops(userId: string, organizationId: string, category?: SopRow["category"]): Promise<SopRow[]> {
    let list: SopRow[] = [];

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      let query = (supabase.from("sops") as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("title", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (!error && data) {
        list = data as SopRow[];
      }
    } else {
      list = this.store.querySopsWithRLS(userId, organizationId);
      if (category) {
        list = list.filter((s) => s.category === category);
      }
    }

    // Auto-seed default SOPs if none exist
    if (list.length === 0) {
      await this.seedDefaultSops(userId, organizationId);
      return this.getSops(userId, organizationId, category);
    }

    return list;
  }

  public async getSopById(userId: string, organizationId: string, sopId: string): Promise<SopRow | null> {
    const sops = await this.getSops(userId, organizationId);
    return sops.find((s) => s.id === sopId) || null;
  }

  public async createSop(params: CreateSopParams): Promise<SopRow> {
    if (!params.organizationId || !params.title || !params.content) {
      throw new Error("Missing required parameters: organizationId, title, and content are required.");
    }

    const insertData: SopInsert = {
      organization_id: params.organizationId,
      title: params.title.trim(),
      category: params.category || "operations",
      content: params.content.trim(),
      tags: params.tags || [],
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("sops") as any)
        .insert(insertData)
        .select()
        .single();

      if (!error && data) {
        return data as SopRow;
      }
    }

    return this.store.createSop(insertData);
  }

  public async updateSop(
    userId: string,
    organizationId: string,
    sopId: string,
    updates: Partial<SopRow>
  ): Promise<SopRow | null> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("sops") as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", sopId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (!error && data) {
        return data as SopRow;
      }
    }

    return this.store.updateSop(userId, organizationId, sopId, updates);
  }

  public async deleteSop(userId: string, organizationId: string, sopId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { error } = await (supabase.from("sops") as any)
        .delete()
        .eq("id", sopId)
        .eq("organization_id", organizationId);
      return !error;
    }

    return this.store.deleteSop(userId, organizationId, sopId);
  }

  public async searchSops(userId: string, organizationId: string, query: string): Promise<SopRow[]> {
    const sops = await this.getSops(userId, organizationId);
    const q = query.toLowerCase().trim();
    if (!q) return sops;

    return sops.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
    );
  }

  public async askSopAssistant(
    userId: string,
    organizationId: string,
    question: string
  ): Promise<SopAnswer | null> {
    const sops = await this.getSops(userId, organizationId);
    if (sops.length === 0) return null;

    const tokens = question
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 2);

    let bestSop: SopRow | null = null;
    let highestScore = 0;

    for (const sop of sops) {
      let score = 0;
      const titleLower = sop.title.toLowerCase();
      const contentLower = sop.content.toLowerCase();

      for (const token of tokens) {
        if (titleLower.includes(token)) score += 3;
        if (contentLower.includes(token)) score += 1;
        if (sop.tags.some((t) => t.toLowerCase().includes(token))) score += 2;
      }

      if (score > highestScore) {
        highestScore = score;
        bestSop = sop;
      }
    }

    if (!bestSop || highestScore === 0) {
      bestSop = sops[0];
      highestScore = 1;
    }

    // Extract step bullets from markdown
    const lines = bestSop.content.split("\n");
    const steps = lines
      .filter((l) => /^\s*(\d+\.|\-|\*)\s+/.test(l))
      .map((l) => l.replace(/^\s*(\d+\.|\-|\*)\s+/, "").trim());

    return {
      matchedSopTitle: bestSop.title,
      category: bestSop.category,
      summary: lines.find((l) => l.trim().length > 10 && !l.startsWith("#")) || bestSop.title,
      steps: steps.length > 0 ? steps : [bestSop.content.slice(0, 150)],
      fullContent: bestSop.content,
      confidence: Math.min(1.0, 0.5 + highestScore * 0.1),
    };
  }

  public async seedDefaultSops(userId: string, organizationId: string): Promise<void> {
    const defaults = [
      {
        title: "Store & Office Morning Opening Checklist",
        category: "operations" as const,
        tags: ["opening", "checklist", "morning", "security"],
        content: `# Store & Office Morning Opening Checklist

Ensure the following tasks are completed before unlocking doors for customers:

1. Disarm the security alarm and verify all perimeter sensors are clear.
2. Turn on all primary showroom lights, air conditioning (set to 23°C), and ambient background audio.
3. Power on the POS terminal and run the morning system diagnostic test.
4. Verify cash float of $200.00 in the cash register drawer.
5. Check restrooms for cleanliness, hand soap, and paper towel replenishment.
6. Inspect the front entrance glass doors and clean any visible smudges.
7. Open front door at exactly 09:00 AM.`,
      },
      {
        title: "Store Closing & Night Lockup Procedure",
        category: "operations" as const,
        tags: ["closing", "security", "evening", "cash"],
        content: `# Store Closing & Night Lockup Procedure

Follow these steps immediately after the last customer leaves at 09:00 PM:

1. Lock the front glass door and flip the entrance sign to 'CLOSED'.
2. Count the cash drawer, reconcile total receipts with the POS terminal daily sales report.
3. Place excess cash into the night drop safe, keeping the $200 float in the drawer.
4. Turn off all display screens, showroom lights, and air conditioning units.
5. Ensure all rear delivery doors and secondary exit fire doors are deadbolted.
6. Arm the alarm system via keypad code within 45 seconds.
7. Double-check front door lock before departure.`,
      },
      {
        title: "Customer Refund & Exchange Policy",
        category: "customer_service" as const,
        tags: ["refund", "returns", "exchange", "policy"],
        content: `# Customer Refund & Exchange Policy

Standard guidelines for handling return and refund requests:

1. Items can be returned or exchanged within 14 days of purchase with original receipt.
2. The item must be in unused, original packaging with intact security seals.
3. For defective items, issue an immediate replacement or full refund to the original payment method.
4. If the customer does not have a receipt, offer a store credit exchange at the item's lowest 30-day price.
5. For transactions exceeding $100, manager approval is required before processing cash or card refunds.`,
      },
      {
        title: "De-escalation Protocol for Difficult or Angry Customers",
        category: "customer_service" as const,
        tags: ["escalation", "complaints", "angry customer", "protocol"],
        content: `# De-escalation Protocol for Difficult or Angry Customers

Follow the L.A.S.T. framework when handling customer dissatisfaction:

1. **Listen**: Allow the customer to speak without interrupting for at least 60 seconds.
2. **Apologize**: Express empathy genuinely ("I understand how frustrating this has been for you, and I am here to help").
3. **Solve**: Offer a concrete solution (e.g., immediate replacement, discount on next service, or free upgrade).
4. **Thank**: Thank the customer for bringing the issue to our attention so we can improve.
5. If the customer becomes abusive, calmly say: "I want to help you, but I need us to speak respectfully. Let me get my supervisor for you."`,
      },
      {
        title: "Cash Handling & Daily Float Reconciliation",
        category: "finance" as const,
        tags: ["cash", "float", "till", "banking"],
        content: `# Cash Handling & Daily Float Reconciliation

Procedures to maintain strict financial compliance:

1. Count the opening float ($200) every morning before first sale.
2. Large bills ($100 notes) must be checked using the counterfeit UV detector marker.
3. When drawer cash exceeds $1,000, perform a 'cash drop' into the drop safe.
4. End of day discrepancy under $5 must be logged in the discrepancy logbook.
5. Any discrepancy over $10 requires an immediate notification to the store manager.`,
      },
    ];

    for (const item of defaults) {
      await this.createSop({
        userId,
        organizationId,
        title: item.title,
        category: item.category,
        content: item.content,
        tags: item.tags,
      });
    }
  }
}
