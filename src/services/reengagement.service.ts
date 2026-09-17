/**
 * ELMO Business Operations Suite — Customer Win-Back & Re-Engagement Service
 *
 * Scans contacts for inactivity (e.g. > 30, 60, 90 days), crafts hyper-personalized
 * re-engagement copy with custom incentives, and creates campaign tasks.
 */

import { ContactRow } from "@/lib/supabase/mock-store";
import { ContactService } from "@/services/contact.service";
import { TaskService } from "@/services/task.service";
import { ActivityService } from "@/services/activity.service";

export interface WinbackIncentive {
  offerTitle: string;
  discountCode?: string;
  validityDays?: number;
  businessName?: string;
  customMessageIntro?: string;
}

export interface WinbackDraft {
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  daysInactive: number;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
}

export class ReengagementService {
  private static instance: ReengagementService;
  private contactService: ContactService;
  private taskService: TaskService;
  private activityService: ActivityService;

  private constructor() {
    this.contactService = ContactService.getInstance();
    this.taskService = TaskService.getInstance();
    this.activityService = ActivityService.getInstance();
  }

  public static getInstance(): ReengagementService {
    if (!ReengagementService.instance) {
      ReengagementService.instance = new ReengagementService();
    }
    return ReengagementService.instance;
  }

  public static resetInstance(): void {
    ReengagementService.instance = undefined as any;
  }

  public async scanInactiveContacts(
    userId: string,
    organizationId: string,
    daysInactive = 60
  ): Promise<{ contacts: ContactRow[]; daysThreshold: number }> {
    const contactsResult = await this.contactService.getContacts(userId, organizationId);
    const contacts = contactsResult.data || [];

    const cutoffTime = Date.now() - daysInactive * 24 * 60 * 60 * 1000;

    const inactiveContacts = contacts.filter((c) => {
      if (c.status === "unsubscribed" || c.status === "archived") return false;
      const lastActivityTime = new Date(c.updated_at || c.created_at).getTime();
      return lastActivityTime <= cutoffTime;
    });

    return {
      contacts: inactiveContacts,
      daysThreshold: daysInactive,
    };
  }

  public generateWinbackDraft(
    contact: ContactRow,
    incentive: WinbackIncentive
  ): WinbackDraft {
    const name = contact.first_name || contact.email.split("@")[0];
    const businessName = incentive.businessName || "our team";
    const validityDays = incentive.validityDays || 14;
    const discountCode = incentive.discountCode || "WELCOMEBACK";

    const lastTime = new Date(contact.updated_at || contact.created_at).getTime();
    const daysInactive = Math.max(1, Math.floor((Date.now() - lastTime) / (1000 * 60 * 60 * 24)));

    const whatsappMessage =
      `Hi ${name}! We noticed it's been a while since you last connected with ${businessName}.\n\n` +
      `We'd love to welcome you back with a special VIP offer: *${incentive.offerTitle}*.\n` +
      `Use promo code *${discountCode}* when you book or reply directly to this message!\n\n` +
      `This offer is valid for the next ${validityDays} days. Looking forward to catching up!`;

    const emailSubject = `We miss you, ${name} — here's ${incentive.offerTitle} to welcome you back`;

    const emailBody =
      `Dear ${name},\n\n` +
      `It's been a little while since your last visit to ${businessName}, and we wanted to reach out to see how everything is going.\n\n` +
      `To show our appreciation, we have prepared a special offer exclusively for you:\n` +
      `🌟 ${incentive.offerTitle}\n` +
      `Use discount code: ${discountCode}\n\n` +
      `This exclusive voucher is valid for the next ${validityDays} days.\n\n` +
      `Click here to book your next session or reply directly to this email if we can assist you with anything.\n\n` +
      `Warm regards,\n${businessName}`;

    return {
      contactId: contact.id,
      contactName: name,
      contactEmail: contact.email,
      contactPhone: contact.phone,
      daysInactive,
      whatsappMessage,
      emailSubject,
      emailBody,
    };
  }

  public async createWinbackCampaign(
    userId: string,
    organizationId: string,
    contactIds: string[],
    incentive: WinbackIncentive
  ): Promise<{ campaignId: string; draftCount: number; drafts: WinbackDraft[] }> {
    const contactsResult = await this.contactService.getContacts(userId, organizationId);
    const allContacts = contactsResult.data || [];
    const targetContacts = allContacts.filter((c) => contactIds.includes(c.id));

    const drafts = targetContacts.map((c) => this.generateWinbackDraft(c, incentive));

    // Register an AI Task in TaskService
    const campaignId = `camp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await this.taskService.createTask({
      userId,
      organizationId,
      title: `Win-Back Campaign: ${incentive.offerTitle} (${drafts.length} contacts)`,
      description: `Targeted re-engagement campaign for ${drafts.length} dormant contacts. Promo code: ${incentive.discountCode || "WELCOMEBACK"}. Campaign ID: ${campaignId}`,
      ownerType: "AI",
      ownerName: "ELMO Marketing Agent",
      priority: "HIGH",
    });

    // Log Activity in ActivityService
    await this.activityService.logActivity({
      organizationId,
      actorName: "ELMO Marketing Agent",
      actorType: "AI",
      type: "WINBACK_CAMPAIGN_CREATED",
      description: `Generated ${drafts.length} win-back outreach drafts with incentive "${incentive.offerTitle}".`,
      metadata: {
        campaignId,
        contactCount: drafts.length,
      },
    });

    return {
      campaignId,
      draftCount: drafts.length,
      drafts,
    };
  }
}
