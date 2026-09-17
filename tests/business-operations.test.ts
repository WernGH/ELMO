import { describe, it, expect, beforeEach } from "vitest";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { QuoteService } from "@/services/quote.service";
import { BookingService } from "@/services/booking.service";
import { ReviewService } from "@/services/review.service";
import { ReengagementService } from "@/services/reengagement.service";
import { SopService } from "@/services/sop.service";
import { ContactService } from "@/services/contact.service";
import { ActivityService } from "@/services/activity.service";

describe("ELMO Business Operations Suite", () => {
  const store = MockDataStore.getInstance();
  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    store.reset();
  });

  describe("1. Quotes & Invoicing Engine (QuoteService)", () => {
    const quoteService = QuoteService.getInstance();

    it("should create a quote with accurate line items, subtotal, tax, and total", async () => {
      const quote = await quoteService.createQuote({
        userId,
        organizationId: orgId,
        clientName: "Apex Medical Aesthetics",
        clientEmail: "billing@apexmed.com",
        currency: "USD",
        items: [
          { description: "Website Revamp & Landing Engine", quantity: 1, unit_price: 3500, amount: 3500 },
          { description: "Lead Capture Integration", quantity: 2, unit_price: 500, amount: 1000 },
        ],
        taxRate: 6,
        paymentTerms: "Net 14",
      });

      expect(quote).toBeDefined();
      expect(quote.quote_number).toMatch(/^QT-\d{4}-\d{4}$/);
      expect(quote.client_name).toBe("Apex Medical Aesthetics");
      expect(quote.subtotal).toBe(4500);
      expect(quote.tax_rate).toBe(6);
      expect(quote.tax_amount).toBe(270);
      expect(quote.total_amount).toBe(4770);
      expect(quote.status).toBe("sent");
    });

    it("should allow public view and client acceptance of a quote", async () => {
      const quote = await quoteService.createQuote({
        userId,
        organizationId: orgId,
        clientName: "Horizon Real Estate",
        items: [{ description: "Monthly SEO", quantity: 1, unit_price: 1200, amount: 1200 }],
      });

      // Public client reads quote without auth
      const publicQuote = await quoteService.getPublicQuote(quote.id);
      expect(publicQuote).toBeDefined();
      expect(publicQuote?.client_name).toBe("Horizon Real Estate");
      expect(publicQuote?.status).toBe("sent");

      // Public client accepts quote
      const acceptedQuote = await quoteService.updatePublicQuoteStatus(quote.id, "accepted");
      expect(acceptedQuote?.status).toBe("accepted");

      const refreshed = await quoteService.getQuoteById(userId, orgId, quote.id);
      expect(refreshed?.status).toBe("accepted");
    });

    it("should generate polite WhatsApp and Email payment reminder copy", async () => {
      const quote = await quoteService.createQuote({
        userId,
        organizationId: orgId,
        clientName: "Dr. Sarah",
        items: [{ description: "Consultation", quantity: 1, unit_price: 800, amount: 800 }],
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days overdue
      });

      const whatsappReminder = quoteService.generatePaymentReminderCopy(quote, "https://app.coai.international", "whatsapp");
      expect(whatsappReminder.channel).toBe("whatsapp");
      expect(whatsappReminder.daysOverdue).toBeGreaterThanOrEqual(4);
      expect(whatsappReminder.message).toContain("gentle follow-up");
      expect(whatsappReminder.message).toContain(quote.quote_number);
      expect(whatsappReminder.publicUrl).toContain(`/quote/${quote.id}`);

      const emailReminder = quoteService.generatePaymentReminderCopy(quote, "https://app.coai.international", "email");
      expect(emailReminder.channel).toBe("email");
      expect(emailReminder.subject).toContain("Overdue");
      expect(emailReminder.message).toContain(quote.quote_number);
    });
  });

  describe("2. Smart Bookings & Anti-No-Show Assistant (BookingService)", () => {
    const bookingService = BookingService.getInstance();

    it("should schedule an appointment and update attendance status", async () => {
      const bookingTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const booking = await bookingService.createBooking({
        userId,
        organizationId: orgId,
        customerName: "Michael Chang",
        customerPhone: "+60 12-888 9999",
        serviceName: "Dental Implant Consultation",
        bookingTime,
        notes: "First time patient",
      });

      expect(booking).toBeDefined();
      expect(booking.customer_name).toBe("Michael Chang");
      expect(booking.status).toBe("confirmed");

      // Complete booking
      const completed = await bookingService.updateBookingStatus(userId, orgId, booking.id, "completed");
      expect(completed?.status).toBe("completed");

      // Mark no-show
      const noShow = await bookingService.updateBookingStatus(userId, orgId, booking.id, "no_show");
      expect(noShow?.status).toBe("no_show");
    });

    it("should generate automated 24-hour and 2-hour anti-no-show reminders", async () => {
      const bookingTime = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
      const booking = await bookingService.createBooking({
        userId,
        organizationId: orgId,
        customerName: "Chloe Tan",
        serviceName: "Physiotherapy Assessment",
        bookingTime,
      });

      const reminders = bookingService.generateNoShowReminders(booking);
      expect(reminders.reminder24h.message).toContain("Chloe Tan");
      expect(reminders.reminder24h.message).toContain("Physiotherapy Assessment");
      expect(reminders.reminder24h.message.toLowerCase()).toContain("reply 'yes' to confirm");

      expect(reminders.reminder2h.message).toContain("in 2 hours");
      expect(reminders.reminder2h.message).toContain("directions or parking");
    });
  });

  describe("3. Google Review & Reputation Booster (ReviewService)", () => {
    const reviewService = ReviewService.getInstance();
    const activityService = ActivityService.getInstance();

    it("should route 5-star ratings directly to Google Reviews", async () => {
      const req = await reviewService.createReviewRequest({
        userId,
        organizationId: orgId,
        customerName: "David Lee",
        customerPhoneOrEmail: "+60 19-333 4444",
        googleReviewUrl: "https://g.page/r/my-clinic-review",
      });

      expect(req.status).toBe("pending");

      // Customer gives 5 stars
      const feedbackResult = await reviewService.submitCustomerFeedback(req.id, 5);
      expect(feedbackResult.status).toBe("rated_positive");
      expect(feedbackResult.redirectToGoogle).toBe(true);
      expect(feedbackResult.googleReviewUrl).toBe("https://g.page/r/my-clinic-review");
    });

    it("should shield business from 1-3 star ratings and alert management", async () => {
      const req = await reviewService.createReviewRequest({
        userId,
        organizationId: orgId,
        customerName: "Angry Customer",
        customerPhoneOrEmail: "angry@gmail.com",
      });

      // Customer gives 2 stars with feedback
      const feedbackResult = await reviewService.submitCustomerFeedback(
        req.id,
        2,
        "The wait time was 45 minutes past my booking time."
      );

      expect(feedbackResult.status).toBe("intercepted_negative");
      expect(feedbackResult.redirectToGoogle).toBe(false);
      expect(feedbackResult.message).toContain("valuable feedback");

      // Verify activity timeline received the shield alert
      const activities = await activityService.getActivities(userId, orgId);
      const shieldAlert = activities.find((a) => a.type === "NEGATIVE_REVIEW_INTERCEPTED");
      expect(shieldAlert).toBeDefined();
      expect(shieldAlert?.description).toContain("Angry Customer rated their experience 2/5 stars");
      expect(shieldAlert?.description).toContain("The wait time was 45 minutes");
    });
  });

  describe("4. Customer Win-Back & Re-Engagement (ReengagementService)", () => {
    const reengagementService = ReengagementService.getInstance();
    const contactService = ContactService.getInstance();

    it("should identify dormant contacts and generate personalized win-back campaigns", async () => {
      // Seed an active contact
      await contactService.findOrCreateContact({
        userId,
        organizationId: orgId,
        email: "active@client.com",
        firstName: "Active",
      });

      // Seed an inactive contact (updated 75 days ago)
      const inactiveContact = store.contacts.set("inactive-1", {
        id: "inactive-1",
        organization_id: orgId,
        email: "dormant@client.com",
        first_name: "Dormant",
        last_name: "User",
        phone: "+60 11-222 3333",
        status: "customer",
        source: "website",
        custom_fields: {},
        created_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const scanResult = await reengagementService.scanInactiveContacts(userId, orgId, 60);
      expect(scanResult.contacts.length).toBe(1);
      expect(scanResult.contacts[0].email).toBe("dormant@client.com");

      // Generate campaign
      const campaign = await reengagementService.createWinbackCampaign(
        userId,
        orgId,
        ["inactive-1"],
        {
          offerTitle: "Free Teeth Whitening Add-on",
          discountCode: "SHINE2026",
          validityDays: 10,
          businessName: "Smile Dental Studio",
        }
      );

      expect(campaign.draftCount).toBe(1);
      expect(campaign.drafts[0].whatsappMessage).toContain("Dormant");
      expect(campaign.drafts[0].whatsappMessage).toContain("Free Teeth Whitening Add-on");
      expect(campaign.drafts[0].whatsappMessage).toContain("SHINE2026");
      expect(campaign.drafts[0].whatsappMessage).toContain("Smile Dental Studio");
    });
  });

  describe("5. Staff SOP & Operations Assistant (SopService)", () => {
    const sopService = SopService.getInstance();

    it("should seed default standard SME procedures automatically", async () => {
      const sops = await sopService.getSops(userId, orgId);
      expect(sops.length).toBeGreaterThanOrEqual(5);

      const openingSop = sops.find((s) => s.title.includes("Morning Opening"));
      expect(openingSop).toBeDefined();
      expect(openingSop?.category).toBe("operations");

      const refundSop = sops.find((s) => s.title.includes("Refund"));
      expect(refundSop).toBeDefined();
      expect(refundSop?.category).toBe("customer_service");
    });

    it("should search SOPs and answer staff procedural questions accurately", async () => {
      // Search
      const searchResults = await sopService.searchSops(userId, orgId, "refund");
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].title).toContain("Refund");

      // Ask question about angry customer
      const answer = await sopService.askSopAssistant(
        userId,
        orgId,
        "What should I do if an angry customer is shouting at the counter?"
      );

      expect(answer).toBeDefined();
      expect(answer?.matchedSopTitle).toContain("Angry");
      expect(answer?.steps.length).toBeGreaterThan(0);
      expect(answer?.steps.some((s) => s.includes("Listen") || s.includes("Apologize"))).toBe(true);
    });
  });
});
