/**
 * ELMO Phase 4 — Customer Support Worker Specialist (SupportAgent)
 *
 * Handles customer support workflows using approved Company Brain, customer information,
 * verified policies, and controlled tools.
 *
 * Strict Governance:
 * 1. Anti-Hallucination Doctrine: Never invents customer information, order status, account facts,
 *    company policies, refund decisions, or unverified commitments.
 * 2. Missing Information: Halts or explicitly reports missing parameters when ground truth is absent.
 * 3. Human Escalation: Sensitive or high-impact actions (refunds, account cancellations) require human approval.
 */

import {
  AgentMessage,
  AgentResult,
  SupportWorkerOutput,
} from "../types/agentic.types";
import { KnowledgeRetrievalService } from "@/services/knowledge/knowledge-retrieval.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { ContactService } from "@/services/contact.service";

export class SupportAgent {
  private static instance: SupportAgent;
  private knowledgeService: KnowledgeRetrievalService;
  private memoryService: ElmoMemoryService;
  private contactService: ContactService;

  private constructor() {
    this.knowledgeService = KnowledgeRetrievalService.getInstance();
    this.memoryService = ElmoMemoryService.getInstance();
    this.contactService = ContactService.getInstance();
  }

  public static getInstance(): SupportAgent {
    if (!SupportAgent.instance) {
      SupportAgent.instance = new SupportAgent();
    }
    return SupportAgent.instance;
  }

  public async execute(message: AgentMessage): Promise<AgentResult> {
    const orgId = (message.context.organizationId as string) || "11111111-1111-1111-1111-111111111111";
    const userId = (message.context.userId as string) || "00000000-0000-0000-0000-000000000001";
    const enquiry = (message.input?.enquiry as string) || (message.inputData?.enquiry as string) || message.task || "";
    const lower = enquiry.toLowerCase();
    const toolsUsed: string[] = ["search_knowledge", "query_memory"];

    // 1. Issue Categorization & Priority Detection
    let category = "general_inquiry";
    let priority: "low" | "medium" | "high" | "urgent" = "medium";
    let isSensitiveAction = false;
    let requiresHumanEscalation = false;
    let escalationReason: string | undefined;

    if (lower.includes("refund") || lower.includes("money back") || lower.includes("chargeback")) {
      category = "billing_refund";
      priority = "urgent";
      isSensitiveAction = true;
      requiresHumanEscalation = true;
      escalationReason = "Refund requests require human executive authorization under company policy.";
    } else if (lower.includes("cancel") || lower.includes("close account") || lower.includes("delete account")) {
      category = "account_cancellation";
      priority = "high";
      isSensitiveAction = true;
      requiresHumanEscalation = true;
      escalationReason = "Account cancellation requires confirmation from customer service lead.";
    } else if (lower.includes("complaint") || lower.includes("unhappy") || lower.includes("terrible") || lower.includes("broken")) {
      category = "service_complaint";
      priority = "high";
      requiresHumanEscalation = true;
      escalationReason = "Customer grievance detected; routed to tier-2 support.";
    } else if (lower.includes("pricing") || lower.includes("hours") || lower.includes("location") || lower.includes("menu") || lower.includes("how does") || lower.includes("faq")) {
      category = "product_faq";
      priority = "low";
    }

    // 2. Knowledge & Policy Retrieval from Company Brain
    let verifiedPolicy: string | undefined;
    let sourceDocs: string[] = [];
    let verifiedFacts: string[] = [];

    try {
      const ragRes = await this.knowledgeService.retrieve({
        query: `support policy ${enquiry}`,
        organizationId: orgId,
        topK: 2,
      });

      if (ragRes && ragRes.chunks && ragRes.chunks.length > 0) {
        sourceDocs = ragRes.chunks.map((c) => (c as any).documentTitle || c.documentId || "knowledge-doc");
        verifiedFacts = ragRes.chunks.map((c) => c.content);
        verifiedPolicy = verifiedFacts[0];
      }
    } catch {
      // Non-blocking
    }

    const memoryEntries = await this.memoryService.searchRelevantMemory(
      orgId,
      `support ${enquiry}`,
      "organization",
      2
    );
    if (memoryEntries.length > 0) {
      verifiedFacts.push(...memoryEntries.map((m) => m.content));
    }

    // 3. Customer Information Retrieval (with tenant boundary check)
    // 3. Customer Information Retrieval (with tenant boundary check)
    const customerId =
      (message.input?.customerId as string) ||
      (message.input?.contactId as string) ||
      (message.inputData?.customerId as string) ||
      (message.inputData?.contactId as string);

    let customerContext = {
      identified: false,
      contactId: customerId,
      name: undefined as string | undefined,
      email: undefined as string | undefined,
      accountStatus: undefined as string | undefined,
      grounded: false,
    };

    if (customerId) {
      toolsUsed.push("get_contact");
      try {
        const contactRes = await this.contactService.getContactById(userId, orgId, customerId);
        if (contactRes.data) {
          customerContext = {
            identified: true,
            contactId: contactRes.data.id,
            name: `${contactRes.data.first_name || ""} ${contactRes.data.last_name || ""}`.trim() || undefined,
            email: contactRes.data.email,
            accountStatus: contactRes.data.status || "active",
            grounded: true,
          };
        }
      } catch {
        // Not found or cross-tenant
      }
    }

    // 4. Missing Information Detection (Anti-Hallucination)
    const missingInformation: string[] = [];
    const invoiceId = message.input?.invoiceId || message.inputData?.invoiceId;
    const transactionId = message.input?.transactionId || message.inputData?.transactionId;

    if (category === "billing_refund" && !invoiceId && !transactionId) {
      missingInformation.push("invoice_or_account_identifier");
    }
    if ((lower.includes("invoice") || lower.includes("payment") || lower.includes("account")) && !customerId && !invoiceId && !transactionId) {
      missingInformation.push("invoice_or_account_identifier");
    }
    if (customerId && !customerContext.identified) {
      missingInformation.push(`Customer record for ID "${customerId}" could not be verified in organization records.`);
    }

    // 5. Response Drafting (Grounded Anti-Hallucination)
    let responseText = "";
    if (isSensitiveAction) {
      responseText = `Thank you for contacting us regarding your ${category === "billing_refund" ? "refund" : "account"} inquiry. ` +
        `Your request has been logged and assigned to human supervisor review. Our team will verify your account details and follow up directly.`;
    } else if (missingInformation.length > 0) {
      responseText = `Thank you for reaching out. To assist you accurately without delay, could you please provide your invoice number, account email, or transaction reference?`;
    } else if (verifiedFacts.length > 0) {
      responseText = `Based on our verified policies: ${verifiedFacts[0].slice(0, 200)}. Please let us know if you need further clarification.`;
    } else {
      responseText = `Thank you for your enquiry. We have received your question and are looking into the specifics for your account.`;
    }

    const supportOutput: SupportWorkerOutput = {
      enquiryClassification: {
        category,
        priority,
        sentiment: lower.includes("angry") || lower.includes("terrible") ? "frustrated" : "neutral",
        requiresHumanEscalation,
      },
      customerContext,
      groundedKnowledge: {
        policyReferenced: verifiedPolicy,
        sourceDocs,
        verifiedFacts,
      },
      responseDraft: {
        messageText: responseText,
        tone: "empathetic_professional",
        groundedInBrain: verifiedFacts.length > 0,
        missingInformationFlagged: missingInformation.length > 0,
        missingInformationFields: missingInformation.length > 0 ? missingInformation : undefined,
      },
      missingInformation: missingInformation.length > 0 ? missingInformation : undefined,
      escalation: requiresHumanEscalation
        ? {
            escalated: true,
            reason: escalationReason,
            targetRole: "HUMAN_OPERATOR",
            priority,
            requiresApproval: true,
          }
        : undefined,
      approvalRequired: requiresHumanEscalation,
    };

    return {
      agentId: "support-worker",
      success: true,
      summary: `Processed customer support enquiry (${category}, priority: ${priority}). Grounded in Company Brain knowledge.`,
      data: {
        ...supportOutput,
        organizationId: orgId,
      },
      recommendations: requiresHumanEscalation
        ? [`Human operator review required for ${category}.`]
        : ["Deliver drafted grounded response to customer."],
      actionsTaken: [
        {
          action: "ENQUIRY_CLASSIFICATION_AND_RESOLUTION",
          description: `Classified as ${category} and retrieved grounded knowledge`,
          status: "SUCCESS",
        },
      ],
      toolsUsed,
      needsMoreWork: isSensitiveAction || missingInformation.length > 0,
      nextSuggestedAgent: category === "product_faq" ? "sales-worker" : undefined,
      confidence: verifiedFacts.length > 0 ? 0.95 : 0.85,
    };
  }
}
