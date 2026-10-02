/**
 * COAI B.O.S v2 — Outbound Drip & Exclusion Playbooks Service (BosDripPlaybooksService)
 *
 * Ported from COAI `leads-engine` (`drip-templates.js`, `apply-exclusions.js`).
 * Provides:
 * 1. High-converting multi-touch outbound cadences (Day 0, Day 3, Day 7, Day 12).
 * 2. Strict exclusion list guard rails (unsubscribes, competitor domains, test patterns).
 * 3. Structured cadence formatter ready for ELMO's automation and funnel execution.
 */

export interface DripStep {
  step: number;
  delayDays: number;
  channel: "email" | "linkedin" | "whatsapp";
  purpose: string;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface DripPlaybook {
  id: string;
  name: string;
  description: string;
  targetPersona: string;
  steps: DripStep[];
}

export interface ExclusionCheckResult {
  allowed: boolean;
  reason?: string;
  matchedPattern?: string;
}

const DEFAULT_EXCLUSIONS: string[] = [
  "coai.international",
  "spam",
  "test@",
  "no-reply",
  "noreply",
  "admin@localhost",
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
];

export class BosDripPlaybooksService {
  private static instance: BosDripPlaybooksService;
  private customExclusions: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): BosDripPlaybooksService {
    if (!BosDripPlaybooksService.instance) {
      BosDripPlaybooksService.instance = new BosDripPlaybooksService();
    }
    return BosDripPlaybooksService.instance;
  }

  /**
   * Evaluates an email or domain against exclusion list rules to prevent spam/duplicate outreach.
   */
  public checkExclusion(email: string, domain?: string): ExclusionCheckResult {
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanDomain = (domain || "").toLowerCase().trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { allowed: false, reason: "Invalid email format" };
    }

    // Check default blacklists
    for (const pattern of DEFAULT_EXCLUSIONS) {
      if (cleanEmail.includes(pattern) || cleanDomain.includes(pattern)) {
        return {
          allowed: false,
          reason: `Recipient matches protected exclusion pattern: "${pattern}"`,
          matchedPattern: pattern,
        };
      }
    }

    // Check custom organization exclusions
    for (const custom of this.customExclusions) {
      if (cleanEmail.includes(custom) || cleanDomain.includes(custom)) {
        return {
          allowed: false,
          reason: `Recipient matches custom organization exclusion: "${custom}"`,
          matchedPattern: custom,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Adds an exclusion rule (domain, specific email, or keyword).
   */
  public addExclusion(pattern: string): void {
    if (pattern) {
      this.customExclusions.add(pattern.toLowerCase().trim());
    }
  }

  /**
   * Clears custom exclusions.
   */
  public clearCustomExclusions(): void {
    this.customExclusions.clear();
  }

  /**
   * Retrieves a battle-tested B.O.S campaign playbook.
   */
  public getPlaybook(playbookId: "b2b_sme_consultative" | "webinar_followup" | "founder_quick_ask"): DripPlaybook {
    switch (playbookId) {
      case "b2b_sme_consultative":
        return {
          id: "b2b_sme_consultative",
          name: "B.O.S SME Consultative Pipeline",
          description: "4-touch high-conversion outbound sequence tailored for SME business owners and operators.",
          targetPersona: "Founders, Managing Directors, and Operations Leads",
          steps: [
            {
              step: 1,
              delayDays: 0,
              channel: "email",
              purpose: "Personalized Icebreaker & Core Bottleneck",
              subjectTemplate: "Quick question on {{companyName}}'s operational workflow",
              bodyTemplate:
                "Hi {{firstName}},\n\nNoticed {{companyName}}'s recent growth in the {{industry}} space.\n\nMost operators we speak with find that managing lead follow-ups and manual quotes eats up 12+ hours a week.\n\nWe built an automated system that handles client inquiries in under 60 seconds, which recently helped peer businesses double their booked consultations.\n\nOpen to a 5-minute chat next week to see if this is relevant for {{companyName}}?\n\nBest,\n{{senderName}}",
            },
            {
              step: 2,
              delayDays: 3,
              channel: "email",
              purpose: "Social Proof & Concrete Peer Metrics",
              subjectTemplate: "Re: Quick question on {{companyName}}'s operational workflow",
              bodyTemplate:
                "Hi {{firstName}},\n\nFollowing up on my note from Tuesday.\n\nWanted to share a quick 1-page case study: a team in {{industry}} was losing 30% of their inquiries to slow response times. Within 3 weeks of deploying automated qualification, their consultation show-up rate rose by 44%.\n\nHappy to send the 1-page breakdown over if you're interested?\n\nBest,\n{{senderName}}",
            },
            {
              step: 3,
              delayDays: 7,
              channel: "email",
              purpose: "Frictionless Roadmap Check-in",
              subjectTemplate: "Re: Quick question on {{companyName}}'s operational workflow",
              bodyTemplate:
                "Hi {{firstName}},\n\nI know your week is busy. Just wanted to ask: is streamlining {{companyName}}'s client operations a priority for this quarter, or should I circle back later in the year?\n\nThanks,\n{{senderName}}",
            },
            {
              step: 4,
              delayDays: 12,
              channel: "email",
              purpose: "Graceful Breakup & Referral Query",
              subjectTemplate: "Closing the loop: {{companyName}}",
              bodyTemplate:
                "Hi {{firstName}},\n\nAssuming timing isn't right or this isn't a current focus for {{companyName}}. Totally understand!\n\nI'll step back and won't crowd your inbox. If priorities shift in the future, feel free to reach out anytime.\n\nWishing you continued success.\n\nBest,\n{{senderName}}",
            },
          ],
        };

      case "webinar_followup":
        return {
          id: "webinar_followup",
          name: "B.O.S Event & Webinar Fast-Nurture",
          description: "High-urgency 3-touch follow-up designed for event attendees and registration leads.",
          targetPersona: "Webinar Registrants and Attendees",
          steps: [
            {
              step: 1,
              delayDays: 0,
              channel: "email",
              purpose: "Session Recording & Action Plan Delivery",
              subjectTemplate: "Your action plan & recording from the workshop",
              bodyTemplate:
                "Hi {{firstName}},\n\nThank you for joining our session on AI Workforce deployment.\n\nAs promised, here is the full replay and the step-by-step implementation blueprint: {{link}}\n\nLet me know if you have any questions on implementing this for {{companyName}}.\n\nBest,\n{{senderName}}",
            },
            {
              step: 2,
              delayDays: 2,
              channel: "email",
              purpose: "1-on-1 Strategy Session Invitation",
              subjectTemplate: "Tailoring this specifically to {{companyName}}",
              bodyTemplate:
                "Hi {{firstName}},\n\nSeveral attendees from the workshop asked how to adapt the workflow for {{industry}}.\n\nWe have 3 open slots this Thursday for a personalized 15-minute diagnostic. Would you like to reserve one for {{companyName}}?\n\nBest,\n{{senderName}}",
            },
          ],
        };

      default:
        return this.getPlaybook("b2b_sme_consultative");
    }
  }

  /**
   * Hydrates a playbook step template with real prospect and company values.
   */
  public formatStep(
    step: DripStep,
    variables: {
      firstName: string;
      companyName: string;
      industry: string;
      senderName: string;
      link?: string;
    }
  ): { subject: string; body: string } {
    let subject = step.subjectTemplate;
    let body = step.bodyTemplate;

    const replacements: Record<string, string> = {
      "{{firstName}}": variables.firstName,
      "{{companyName}}": variables.companyName,
      "{{industry}}": variables.industry,
      "{{senderName}}": variables.senderName,
      "{{link}}": variables.link || "",
    };

    for (const [tag, val] of Object.entries(replacements)) {
      subject = subject.replace(new RegExp(tag, "g"), val);
      body = body.replace(new RegExp(tag, "g"), val);
    }

    return { subject, body };
  }
}
