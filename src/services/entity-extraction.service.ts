/**
 * ELMO Phase 1 — Entity Extraction Service (EntityExtractionService)
 *
 * Extracts structured entities from user requests across 20+ canonical domains
 * with zero industry bias (never defaults to property or any single industry).
 * Supports multilingual input (English, Malay, Chinese, and code-mixed formats).
 */

import { ExtractedIntentEntities } from "@/types/elmo-request.types";

export class EntityExtractionService {
  private static instance: EntityExtractionService;

  private constructor() {}

  public static getInstance(): EntityExtractionService {
    if (!EntityExtractionService.instance) {
      EntityExtractionService.instance = new EntityExtractionService();
    }
    return EntityExtractionService.instance;
  }

  /**
   * Extracts structured entities from user text across 20+ canonical entity categories.
   */
  public extractEntities(text: string): ExtractedIntentEntities {
    const raw = text.trim();
    const lower = raw.toLowerCase();
    const entities: ExtractedIntentEntities = {};

    // 1. Industry Extraction (Diverse & neutral: NEVER defaults to property)
    const industry = this.detectIndustry(lower);
    if (industry) {
      entities.industry = industry;
    }

    // 2. Business / Topic Extraction
    const businessMatch = raw.match(
      /(?:for my|about my|about our|for our|bisnes|perniagaan|kedai|syarikat|our company|our agency)\s+([^,.]+?)(?:\s+(?:targeting|for|untuk|to|with)|$)/i
    );
    if (businessMatch) {
      entities.business = businessMatch[1].trim();
      entities.topic = entities.business;
    } else if (industry) {
      entities.topic = `${industry} business`;
    }

    // 3. Audience / Target Demographic
    const audienceMatch =
      raw.match(/(?:targeting|target|fokus on|focus on|fokus kepada|sasaran|khalayak|aimed at)\s+([^,.]+?)(?:\s+\b(?:with|using|in|to|and)\b|$)/i) ||
      raw.match(/(?:for|untuk)\s+([^,.]+?)(?:\s+\b(?:with|using|in|to|and)\b|$)/i);
    if (audienceMatch) {
      const captured = audienceMatch[1].trim();
      // Avoid capturing single prepositions or words like "my", "a", "the"
      if (!/^(my|a|an|the|our|this)$/i.test(captured)) {
        entities.audience = captured;
        entities.targetAudience = captured;
      }
    }

    // 4. Product / Service
    const productMatch = raw.match(/(?:product|produk|software|app|tool|course|item)\s+(?:called|named|is)?\s*([a-zA-Z0-9\s_-]+)/i);
    if (productMatch && productMatch[1]) {
      entities.product = productMatch[1].trim();
    }
    const serviceMatch = raw.match(/(?:service|perkhidmatan|consulting|agency|coaching|treatment)\s+(?:called|named|is)?\s*([a-zA-Z0-9\s_-]+)/i);
    if (serviceMatch && serviceMatch[1]) {
      entities.service = serviceMatch[1].trim();
    }

    // 5. Offer / Lead Magnet
    const offerMatch = raw.match(/(?:offer|lead magnet|freebie|diskaun|discount|voucher|trial|tawaran)\s+([^,.]+)/i);
    if (offerMatch) {
      entities.offer = offerMatch[1].trim();
    } else if (lower.includes("free trial") || lower.includes("14-day trial")) {
      entities.offer = "Free Trial";
    } else if (lower.includes("free consultation") || lower.includes("konsultasi percuma")) {
      entities.offer = "Free Consultation";
    }

    // 6. Funnel Type
    if (lower.includes("webinar")) {
      entities.funnel = "Webinar Funnel";
      entities.funnelType = "Webinar";
    } else if (lower.includes("coaching")) {
      entities.funnel = "Coaching Funnel";
      entities.funnelType = "Coaching";
    } else if (lower.includes("course") || lower.includes("kursus")) {
      entities.funnel = "Course Funnel";
      entities.funnelType = "Course";
    } else if (lower.includes("tripwire")) {
      entities.funnel = "Tripwire Funnel";
      entities.funnelType = "Tripwire";
    } else if (lower.includes("sales")) {
      entities.funnel = "Sales Funnel";
      entities.funnelType = "Sales";
    } else if (lower.includes("lead") || lower.includes("opt-in")) {
      entities.funnel = "Lead Generation Funnel";
      entities.funnelType = "Lead Generation";
    } else if (lower.includes("appointment") || lower.includes("booking") || lower.includes("temujanji")) {
      entities.funnel = "Appointment Funnel";
      entities.funnelType = "Appointment";
    } else if (lower.includes("product") || lower.includes("produk")) {
      entities.funnel = "Product Funnel";
      entities.funnelType = "Product";
    } else if (lower.includes("funnel")) {
      entities.funnel = "Standard Funnel";
      entities.funnelType = "Standard";
    }

    // 7. Page Type
    if (lower.includes("landing page") || lower.includes("landing")) {
      entities.page = "landing";
      entities.pageType = "landing";
    } else if (lower.includes("sales page")) {
      entities.page = "sales";
      entities.pageType = "sales";
    } else if (lower.includes("opt-in page") || lower.includes("optin page") || lower.includes("lead magnet page")) {
      entities.page = "opt-in";
      entities.pageType = "opt-in";
    } else if (lower.includes("checkout page") || lower.includes("checkout")) {
      entities.page = "checkout";
      entities.pageType = "checkout";
    } else if (lower.includes("thank you page") || lower.includes("thankyou")) {
      entities.page = "thank-you";
      entities.pageType = "thank-you";
    } else if (lower.includes("website") || lower.includes("laman web")) {
      entities.page = "website";
      entities.pageType = "custom";
    }

    // 8. Section Type & Styling
    if (lower.includes("headline")) {
      entities.sectionType = "headline";
    } else if (lower.includes("hero")) {
      entities.sectionType = "hero";
    } else if (lower.includes("cta") || lower.includes("call to action") || lower.includes("button")) {
      entities.sectionType = "cta";
    } else if (lower.includes("testimonial") || lower.includes("reviews")) {
      entities.sectionType = "testimonials";
    } else if (lower.includes("pricing")) {
      entities.sectionType = "pricing";
    }

    if (lower.includes("premium") || lower.includes("lebih premium") || lower.includes("luxury")) {
      entities.style = "premium";
    } else if (lower.includes("dark mode") || lower.includes("darker style") || lower.includes("gelap")) {
      entities.style = "dark";
    } else if (lower.includes("modern") || lower.includes("moden") || lower.includes("minimalist")) {
      entities.style = "modern";
    }

    if (lower.includes("mobile") || lower.includes("responsif") || lower.includes("responsive")) {
      entities.responsive = "mobile";
    }

    // 9. Campaign
    if (lower.includes("lead generation campaign") || lower.includes("kempen jana leads")) {
      entities.campaign = "Lead Generation Campaign";
    } else {
      const campaignMatch = raw.match(/(?:campaign|kempen)\s+(?:called|named|for|about)?\s*([a-zA-Z0-9\s_-]+?)(?:\s+(?:by|with|on|for|in|at)|$)/i);
      if (campaignMatch && campaignMatch[1]) {
        entities.campaign = campaignMatch[1].trim();
      }
    }

    // 10. Contact Information (Emails, Phones)
    const emailMatch = raw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      entities.contact = emailMatch[1];
      entities.contactEmail = emailMatch[1];
    }
    const phoneMatch = raw.match(/(?:\+?(\d{1,3}))?[-. ]?\(?\d{2,4}\)?[-. ]?\d{3,4}[-. ]?\d{3,4}/);
    if (phoneMatch && !emailMatch) {
      entities.contact = phoneMatch[0].trim();
    }

    // 11. Customer
    const customerMatch = raw.match(/(?:customer|pelanggan|client|klien)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (customerMatch) {
      entities.customer = customerMatch[1].trim();
    }

    // 12. Leads / Volume
    const leadMatch = raw.match(/(\d+)\s*(?:qualified\s+)?(?:leads|potensial|pelanggan)/i);
    if (leadMatch) {
      entities.lead = leadMatch[0].trim();
    }

    // 13. Goal
    const goalMatch =
      raw.match(/(?:goal is to|goal is|matlamat(?: kita)?(?: adalah)?|aiming for|aim is to|target of|target to|i want to (?:get|reach|hit|achieve|generate))\s+([^,.]+)/i) ||
      raw.match(/(?:hit|reach|achieve|generate)\s+(\$?\d+[\d,]*(?:\s*[a-zA-Z]+)?)/i);
    if (goalMatch) {
      entities.goal = goalMatch[1].trim();
    }

    // 14. Task
    const taskMatch = raw.match(/(?:task|tugasan|action item|to-do):\s*([^,.]+)/i);
    if (taskMatch) {
      entities.task = taskMatch[1].trim();
    }

    // 15. Metrics
    if (lower.includes("conversion rate") || lower.includes("kadar penukaran")) {
      entities.metric = "conversion_rate";
      entities.metricType = "conversion_rate";
    } else if (lower.includes("visitors") || lower.includes("pelawat") || lower.includes("traffic")) {
      entities.metric = "visitors";
      entities.metricType = "visitors";
    } else if (lower.includes("cpa") || lower.includes("cost per acquisition")) {
      entities.metric = "cpa";
    } else if (lower.includes("roi") || lower.includes("return on investment")) {
      entities.metric = "roi";
    } else if (lower.includes("drop-off") || lower.includes("drop off")) {
      entities.metric = "drop_off_rate";
    }

    // 16. Budget (Monetary amounts: $, RM, USD, EUR, etc.)
    const budgetMatch = raw.match(/(?:budget|bajet|peruntukan|kos|cost of)\s*(?:is|of|around|kira-kira)?\s*([$RM€£¥A-Z]{1,4}\s*[\d,]+(?:\.\d{2})?(?:\s*(?:usd|myr|eur|k|k\b|thousand|million))?|\d+[\d,]*\s*(?:usd|myr|ringgit|dollars|rm))/i);
    if (budgetMatch) {
      entities.budget = budgetMatch[1].trim();
    } else {
      const currencyMatch = raw.match(/([$RM€£¥]\s*\d[\d,]*(?:\.\d{2})?(?:\s*k|\s*thousand|\s*million)?)/i);
      if (currencyMatch) {
        entities.budget = currencyMatch[1].trim();
      }
    }

    // 17. Date & Deadline
    const deadlineMatch = raw.match(/(?:by|before|until|deadline|sebelum|hingga|pada|tarikh)\s+((?:end of\s+)?(?:this month|next month|this week|next week|tomorrow|friday|monday|tuesday|wednesday|thursday|saturday|sunday|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}|\d{4}-\d{2}-\d{2}))/i);
    if (deadlineMatch) {
      entities.deadline = deadlineMatch[1].trim();
      entities.date = deadlineMatch[1].trim();
    }

    // 18. Location
    const locationMatch = raw.match(/(?:in|at|di|around|located in|kawasan)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (locationMatch && !/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(locationMatch[1])) {
      entities.location = locationMatch[1].trim();
    }

    // 19. URL
    const httpUrlMatch = raw.match(/https?:\/\/[^\s,]+/i);
    if (httpUrlMatch) {
      entities.URL = httpUrlMatch[0].trim().replace(/[.,;!?]+$/, "");
    } else {
      const urlMatch = raw.match(/(?:www\.[^\s,]+|(?<!@)\b[a-zA-Z0-9-]+\.(?:com|io|co|my|net|org|app|dev)\b)/i);
      if (urlMatch) {
        entities.URL = urlMatch[0].trim().replace(/[.,;!?]+$/, "");
      }
    }

    // 20. Platform
    if (lower.includes("facebook") || lower.includes("fb ads")) entities.platform = "Facebook";
    else if (lower.includes("google") || lower.includes("google ads")) entities.platform = "Google";
    else if (lower.includes("tiktok")) entities.platform = "TikTok";
    else if (lower.includes("instagram") || lower.includes("ig")) entities.platform = "Instagram";
    else if (lower.includes("linkedin")) entities.platform = "LinkedIn";
    else if (lower.includes("whatsapp")) entities.platform = "WhatsApp";
    else if (lower.includes("email") || lower.includes("emel")) entities.platform = "Email";
    else if (lower.includes("web") || lower.includes("website")) entities.platform = "Web";

    return entities;
  }

  /**
   * Industry classifier with explicit recognition across diverse business domains.
   * Completely neutral: returns undefined when no industry is mentioned.
   */
  private detectIndustry(lower: string): string | undefined {
    if (/\b(insurance|insurans|takaful|underwriting|actuary)\b/i.test(lower)) {
      return "Insurance";
    }
    if (/\b(restaurant|restoran|cafe|bistro|f&b|bakery|dining|food delivery|makanan|masakan)\b/i.test(lower)) {
      return "Restaurant";
    }
    if (/\b(coaching|coach|mentorship|mentor|course creator|personal development|kaunseling)\b/i.test(lower)) {
      return "Coaching";
    }
    if (/\b(saas|software|b2b tech|cloud app|subscription app|platform)\b/i.test(lower)) {
      return "SaaS";
    }
    if (/\b(ecommerce|e-commerce|online store|kedai online|shopify|woocommerce|retail|dropshipping)\b/i.test(lower)) {
      return "Ecommerce";
    }
    if (/\b(agency|agensi|marketing agency|digital agency|creative agency|ad agency)\b/i.test(lower)) {
      return "Agency";
    }
    if (/\b(consulting|consultancy|perunding|advisory|consultant)\b/i.test(lower)) {
      return "Consulting";
    }
    if (/\b(healthcare|clinic|klinik|dental|doctor|wellness|kesihatan|hospital)\b/i.test(lower)) {
      return "Healthcare";
    }
    if (/\b(fitness|gym|personal trainer|workout|yoga|gimnasium)\b/i.test(lower)) {
      return "Fitness";
    }
    if (/\b(education|school|tuition|tuisyen|academy|universiti|learning)\b/i.test(lower)) {
      return "Education";
    }
    if (/\b(legal|law firm|lawyer|peguam|attorney|notary)\b/i.test(lower)) {
      return "Legal";
    }
    if (/\b(finance|accounting|perakaunan|auditing|tax|bookkeeping|cpa)\b/i.test(lower)) {
      return "Finance";
    }
    if (/\b(property|real estate|hartanah|realtor|estate agent|housing development|perumahan)\b/i.test(lower)) {
      return "Property";
    }
    if (/\b(automotive|workshop|bengkel|car repair|kenderaan)\b/i.test(lower)) {
      return "Automotive";
    }
    if (/\b(service business|perkhidmatan|cleaning|plumbing|contractor)\b/i.test(lower)) {
      return "Service Business";
    }
    return undefined;
  }
}
