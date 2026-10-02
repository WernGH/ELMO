/**
 * ELMO Phase 2 — Company Brain, Memory & Business Context Types
 *
 * Defines the structured understanding of a business:
 * 1. Business Identity
 * 2. Products & Services
 * 3. Customers
 * 4. Marketing
 * 5. Sales
 * 6. Operations
 * 7. Goals
 *
 * Fully industry-agnostic: supports Property, Insurance, Mortgage, Restaurant,
 * Coaching, Consulting, SaaS, Ecommerce, Agency, Education, Healthcare,
 * Professional Services, Local Services, and Custom Businesses.
 */

import { CompanyMemoryRow } from "@/lib/supabase/mock-store";

// ============================================================================
// 1. Memory Taxonomy (8 Canonical Categories)
// ============================================================================

export type CanonicalMemoryCategory =
  | "business"    // Facts about the company ("The company sells insurance")
  | "customer"    // Facts about customers ("John requested a quotation")
  | "decision"    // Important business decisions ("Decided to target SME owners")
  | "preference"  // Brand tone, voice, format preferences ("Use professional tone")
  | "goal"        // Business objectives and targets ("Increase qualified leads")
  | "rule"        // Business rules & policies ("High-value leads require approval")
  | "lesson"      // Verified lessons learned from outcomes ("Campaign A produced better leads on FB")
  | "workflow";   // Knowledge of operational processes ("Leads receive follow-up in 1 business day")

export type MemoryImportanceLevel = "low" | "normal" | "high" | "critical";

export type MemorySourceType =
  | "fact"            // Confirmed, immutable company facts
  | "user_provided"   // Explicitly provided by human user
  | "system_derived"  // Derived from completed workflow or verified metrics
  | "ai_inferred"     // Inferred by AI during reasoning (requires verification)
  | "unverified"      // Speculative or unconfirmed user/AI statement
  | "conversation"    // Extracted from general conversation
  | "explicit_command"// Explicit "Remember that..." directive
  | "tool_execution"  // Tool run results
  | "user_input";     // Form or settings input

export type MemoryConfidenceGrade = "low" | "medium" | "high" | "confirmed";

// ============================================================================
// 2. Structured Business Profile (7 Dimensions)
// ============================================================================

export interface ProductOrServiceItem {
  id?: string;
  name: string;
  type: "product" | "service" | "package" | "subscription";
  description?: string;
  pricing?: string;
  priceAmount?: number;
  currency?: string;
  features?: string[];
  benefits?: string[];
  differentiators?: string[];
  targetSegment?: string;
}

export interface BusinessOfferItem {
  id?: string;
  name: string;
  type: "lead_magnet" | "core_offer" | "tripwire" | "upsell" | "downsell" | "consultation" | "trial" | "discount";
  headline?: string;
  description?: string;
  valueProposition?: string;
  priceOrDiscount?: string;
  guarantee?: string;
  callToAction?: string;
}

export interface CustomerSegmentProfile {
  name: string;
  isPrimary?: boolean;
  demographics?: string;
  psychographics?: string;
  primaryProblems?: string[];
  acuteNeeds?: string[];
  buyerType?: "b2b_enterprise" | "b2b_sme" | "b2c_consumer" | "b2b2c" | "investor" | "custom";
  lifecycleStage?: "unaware" | "problem_aware" | "solution_aware" | "prospect" | "lead" | "active_customer" | "evangelist";
}

export interface MarketingStrategyProfile {
  positioning?: string;
  coreMessaging?: string;
  brandVoice?: string;
  toneGuidelines?: string[];
  primaryChannels?: string[];
  activeCampaigns?: string[];
  contentStrategy?: string;
  acquisitionStrategy?: string;
}

export interface SalesProcessProfile {
  salesProcessOverview?: string;
  leadStages?: string[];
  qualificationRules?: string[];
  followUpProcess?: string;
  commonObjections?: Array<{ objection: string; counterApproach: string }>;
  conversionGoals?: string[];
}

export interface OperationsProfile {
  workflows?: string[];
  keyResponsibilities?: Record<string, string>;
  businessRules?: string[];
  operationalPolicies?: string[];
  slaGuidelines?: string;
}

export interface BusinessGoalItem {
  id?: string;
  title: string;
  category: "business" | "marketing" | "sales" | "operational";
  targetMetric?: string;
  targetValue?: string | number;
  currentValue?: string | number;
  deadline?: string;
  priority: "low" | "normal" | "high" | "critical";
  status?: "pending" | "in_progress" | "achieved" | "missed";
}

export interface BusinessProfile {
  organizationId?: string;
  businessName?: string;
  companyName?: string; // Convenience alias
  tagline?: string;
  industry: string; // Neutral across 15+ domains
  businessType?: string;
  businessModel?: string; // B2B, B2C, D2C, Subscription, Franchise, Agency, Marketplace
  description?: string;
  location?: string;
  serviceAreas?: string[];
  targetMarket?: string;
  targetAudience?: string | any; // Supports string or structured CustomerSegmentProfile

  // 1. Products & Services
  products?: ProductOrServiceItem[];
  services?: ProductOrServiceItem[];
  productsServices?: any[]; // Convenience alias
  offers?: BusinessOfferItem[];

  // 2. Customers
  idealCustomer?: string;
  customerSegments?: CustomerSegmentProfile[];

  // 3. Marketing
  marketing?: MarketingStrategyProfile;
  brandVoice?: string | any; // Supports string or structured brand voice

  // 4. Sales
  sales?: SalesProcessProfile;
  salesProcess?: any; // Convenience alias

  // 5. Operations
  operations?: OperationsProfile;
  operationalRules?: any; // Convenience alias
  businessRules?: string[];

  // 6. Goals
  goals?: BusinessGoalItem[] | any; // Supports array or structured goals

  // 7. Industry-Specific Extensions (e.g. restaurant menus/reservations, insurance policies/quotes)
  industrySpecificContext?: Record<string, unknown>;

  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// 3. Compiled Company Brain
// ============================================================================

export interface CompanyBrain {
  organizationId: string;
  profile: BusinessProfile;
  verifiedMemories: CompanyMemoryRow[];
  activeGoals: BusinessGoalItem[];
  businessRules: string[];
  recentDecisions: Array<{ id: string; decision: string; date: string }> | string[];
  lessonsLearned: Array<{ id: string; lesson: string; metric?: string; date: string }> | string[];
  recentLessons?: string[];
  compiledSummary: string;

  // 7 Core Dimensions for Phase 2
  identity: {
    companyName: string;
    industry: string;
    tagline?: string;
    description?: string;
  };
  productsServices: any[];
  targetAudience: any;
  marketingBrandVoice: any;
  salesProcess: any;
  operationalRules: any;
  goalsPriorities: any;
  activeRules: string[];
}

// ============================================================================
// 4. Dynamic Context Retrieval Interfaces
// ============================================================================

export type BusinessInquiryType =
  | "landing_page_creation"
  | "funnel_strategy"
  | "copywriting"
  | "sales_inquiry"
  | "conversion_diagnosis"
  | "marketing_campaign"
  | "email_sequence"
  | "operational_inquiry"
  | "goal_tracking"
  | "general_business";

export interface BusinessContextRequest {
  userId: string;
  organizationId: string;
  requestText: string;
  intent?: string;
  inquiryType?: BusinessInquiryType;
  explicitOverrides?: {
    industry?: string;
    targetAudience?: string;
    topic?: string;
    offer?: string;
  };
}

export interface RelevantBusinessContext {
  organizationId: string;
  businessName: string;
  industry: string;
  activeIndustry?: string; // Convenience alias
  sourceOfIndustry: "explicit_override" | "business_profile" | "company_brain" | "conversation" | "fallback";
  targetAudience?: string;
  coreOffer?: string;
  positioning?: string;
  brandVoice?: string;
  relevantRules?: string[];
  activeRules?: string[]; // Convenience alias
  relevantGoals?: string[];
  activeGoals?: string[]; // Convenience alias
  relevantLessons?: string[];
  keyProductsServices?: string[];
  operationalConstraints?: string[];
  relevantCustomerInfo?: string;
  relevantSalesProcess?: string;
  industrySpecificData?: Record<string, unknown>;
  memoriesInjected: CompanyMemoryRow[];
  formattedContextString: string;
}

// ============================================================================
// 5. Memory Conflict & Deduplication Data Contracts
// ============================================================================

export interface MemoryDeduplicationCheckResult {
  isDuplicate: boolean;
  existingMemory?: CompanyMemoryRow;
  similarityScore: number;
  recommendedAction: "insert" | "update_recency" | "supersede" | "ignore";
}

export interface MemoryConflictResolutionResult {
  hasConflict: boolean;
  conflictingMemory?: CompanyMemoryRow;
  conflictType?: "audience_shift" | "offer_change" | "goal_update" | "rule_override" | "incompatible_fact";
  resolutionAction: "supersede_old" | "flag_unverified" | "reject_ai_inference" | "preserve_both";
  explanation: string;
}

// ============================================================================
// 6. Business Learning Outcome
// ============================================================================

export interface VerifiedBusinessOutcome {
  organizationId: string;
  activityType: "campaign" | "funnel" | "email" | "ad" | "outreach";
  activityName: string;
  outcomeMetric: string;
  metricValue: string | number;
  conversionRate?: number;
  leadsGenerated?: number;
  keyFinding: string;
  recommendedNextStep?: string;
  verifiedByUserId: string;
}
