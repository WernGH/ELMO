/**
 * ELMO Business Operations Suite — Review & Reputation Booster Service
 *
 * Dispatches review requests, routes 4-5 star happy ratings to Google Reviews,
 * and intercepts 1-3 star ratings with private feedback capture & manager alerts.
 */

import { MockDataStore, ReviewRequestRow, ReviewRequestInsert } from "@/lib/supabase/mock-store";
import { ActivityService } from "@/services/activity.service";
import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface CreateReviewRequestParams {
  userId: string;
  organizationId: string;
  contactId?: string;
  customerName: string;
  customerPhoneOrEmail: string;
  channel?: "whatsapp" | "sms" | "email";
  googleReviewUrl?: string;
}

export interface ReviewFeedbackResult {
  status: "rated_positive" | "intercepted_negative";
  rating: number;
  redirectToGoogle: boolean;
  googleReviewUrl?: string | null;
  message: string;
}

export class ReviewService {
  private static instance: ReviewService;
  private store: MockDataStore;
  private activityService: ActivityService;

  private constructor() {
    this.store = MockDataStore.getInstance();
    this.activityService = ActivityService.getInstance();
  }

  public static getInstance(): ReviewService {
    if (!ReviewService.instance) {
      ReviewService.instance = new ReviewService();
    }
    return ReviewService.instance;
  }

  public static resetInstance(): void {
    ReviewService.instance = undefined as any;
  }

  public async getReviewRequests(userId: string, organizationId: string): Promise<ReviewRequestRow[]> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("review_requests") as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data as ReviewRequestRow[];
      }
    }
    return this.store.queryReviewsWithRLS(userId, organizationId);
  }

  public async getPublicReviewRequest(requestId: string): Promise<ReviewRequestRow | null> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("review_requests") as any)
        .select("*")
        .eq("id", requestId)
        .single();

      if (!error && data) {
        return data as ReviewRequestRow;
      }
    }
    return this.store.getPublicReviewRequestById(requestId);
  }

  public async createReviewRequest(params: CreateReviewRequestParams): Promise<ReviewRequestRow> {
    if (!params.organizationId || !params.customerName || !params.customerPhoneOrEmail) {
      throw new Error("Missing required review request parameters: organizationId, customerName, and customerPhoneOrEmail are required.");
    }

    const insertData: ReviewRequestInsert = {
      organization_id: params.organizationId,
      contact_id: params.contactId || null,
      customer_name: params.customerName.trim(),
      customer_phone_or_email: params.customerPhoneOrEmail.trim(),
      channel: params.channel || "whatsapp",
      status: "pending",
      google_review_url: params.googleReviewUrl || "https://g.page/r/your-google-review-link",
    };

    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("review_requests") as any)
        .insert(insertData)
        .select()
        .single();

      if (!error && data) {
        return data as ReviewRequestRow;
      }
    }

    return this.store.createReviewRequest(insertData);
  }

  public generateReviewInviteCopy(
    request: ReviewRequestRow,
    baseUrl = "https://app.coai.international"
  ): { message: string; publicUrl: string } {
    const publicUrl = `${baseUrl}/review/${request.id}`;
    const message = `Hi ${request.customer_name}! Thank you for visiting us recently. We strive to provide the best service possible.\n\nCould you take 10 seconds to share your quick rating with us?\n👉 ${publicUrl}\n\nWe truly appreciate your feedback!`;

    return { message, publicUrl };
  }

  public async submitCustomerFeedback(
    requestId: string,
    rating: number,
    feedback?: string
  ): Promise<ReviewFeedbackResult> {
    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }

    let updatedRow: ReviewRequestRow | null = null;

    if (isSupabaseConfigured()) {
      const status = rating >= 4 ? "rated_positive" : "intercepted_negative";
      const supabase = createBrowserSupabase();
      const { data, error } = await (supabase.from("review_requests") as any)
        .update({
          rating,
          status,
          private_feedback: feedback || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();

      if (!error && data) {
        updatedRow = data as ReviewRequestRow;
      }
    } else {
      updatedRow = this.store.submitPublicReviewFeedback(requestId, rating, feedback);
    }

    if (!updatedRow) {
      throw new Error(`Review request with id '${requestId}' not found.`);
    }

    if (rating >= 4) {
      // Positive rating: direct customer to Google Reviews
      return {
        status: "rated_positive",
        rating,
        redirectToGoogle: true,
        googleReviewUrl: updatedRow.google_review_url,
        message: "Thank you so much! We are thrilled you had a great experience. Please take a moment to post your review on Google!",
      };
    }

    // Negative or neutral rating (1-3 stars): Shield business, log internal alert
    try {
      await this.activityService.logActivity({
        organizationId: updatedRow.organization_id,
        actorName: updatedRow.customer_name,
        actorType: "VISITOR",
        type: "NEGATIVE_REVIEW_INTERCEPTED",
        description: `⚠️ Customer ${updatedRow.customer_name} rated their experience ${rating}/5 stars. Feedback: "${feedback || "No comments provided"}". Follow-up recommended.`,
        metadata: {
          requestId: updatedRow.id,
          rating,
          feedback,
          contactInfo: updatedRow.customer_phone_or_email,
        },
      });
    } catch {
      // Non-blocking telemetry
    }

    return {
      status: "intercepted_negative",
      rating,
      redirectToGoogle: false,
      googleReviewUrl: null,
      message: "Thank you for your valuable feedback. Our management team has been notified and will review your comments to make things right.",
    };
  }
}
