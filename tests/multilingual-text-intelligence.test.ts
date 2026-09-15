/**
 * ELMO Phase 2 — Multilingual Text Intelligence Test Suite
 *
 * Verifies all Phase 2 requirements:
 * 1. English conversation & response
 * 2. Malay conversation ("Bagaimana saya boleh meningkatkan jualan saya?") -> Malay response
 * 3. Mandarin conversation -> Mandarin response
 * 4. Spanish conversation -> Spanish response
 * 5. Japanese conversation -> Japanese response
 * 6. Arabic conversation -> Arabic response
 * 7. Language switching across 5 turns in ONE conversation (English -> Malay -> Mandarin -> Spanish -> English)
 * 8. Explicit language request ("Reply in Malay" -> Malay, "Now reply in English" -> English)
 * 9. Natural mixed-language input (Manglish / Bahasa Rojak)
 * 10. Context preservation across languages (Campaign in English -> "Sekarang bagi saya versi Bahasa Melayu" -> "现在给我一个中文版本")
 * 11. Translation requests vs regular inquiries ("Translate this into Japanese: The quarterly meeting is at 2 PM")
 * 12. Clarification behavior in user's response language when request is ambiguous
 * 13. Simulated provider errors & graceful recovery
 * 14. Security & tenant isolation (Org A vs Org B)
 * 15. SSE streaming & duplicate prevention
 * 16. AI usage tracking (tokens, model, provider, timestamps)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { LanguageContextService } from "@/services/language-context.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ChatService } from "@/services/chat.service";
import { LLMProvider, LLMGenerateOptions } from "@/types/chat.types";

describe("ELMO Phase 2: Multilingual Text Intelligence Architecture", () => {
  const orgId = "11111111-1111-1111-1111-111111111111"; // TechCorp Enterprise
  const otherOrgId = "22222222-2222-2222-2222-222222222222"; // Global Logistics
  const userId = "00000000-0000-0000-0000-000000000001"; // Alex Rivera

  let intelligenceService: ELMOIntelligenceService;

  beforeEach(() => {
    MockDataStore.getInstance().reset();
    LanguageContextService.resetInstance();
    ELMOIntelligenceService.resetInstance();
    intelligenceService = ELMOIntelligenceService.getInstance();
  });

  // =========================================================================
  // 1. Native World Language Understanding & Same-Language Responses
  // =========================================================================
  describe("1. Native Same-Language Responses (Zero English Intermediary)", () => {
    it("should converse and respond in English when addressed in English", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "What can you help me with?",
      });

      expect(res.detectedLanguage).toBe("en");
      expect(res.responseLanguage).toBe("en");
      expect(res.text.toLowerCase()).toContain("elmo");
      expect(res.text.toLowerCase()).toContain("ai ceo");
      expect(res.isTranslation).toBe(false);
    });

    it("should understand Malay and respond in fluent Bahasa Melayu", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Bagaimana saya boleh meningkatkan jualan saya?",
      });

      expect(res.detectedLanguage).toBe("ms");
      expect(res.responseLanguage).toBe("ms");
      expect(res.text).toContain("Salam sejahtera");
      expect(res.text).toContain("jualan");
      expect(res.text).toContain("pelanggan");
      expect(res.isTranslation).toBe(false);
    });

    it("should understand Mandarin Chinese and respond in fluent Mandarin", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "我怎样才能获得更多客户？",
      });

      expect(res.detectedLanguage).toBe("zh");
      expect(res.responseLanguage).toBe("zh");
      expect(res.text).toContain("ELMO");
      expect(res.text).toContain("客户");
      expect(res.isTranslation).toBe(false);
    });

    it("should understand Spanish and respond in fluent Spanish", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "¿Cómo puedo conseguir más clientes?",
      });

      expect(res.detectedLanguage).toBe("es");
      expect(res.responseLanguage).toBe("es");
      expect(res.text).toContain("ELMO");
      expect(res.text.toLowerCase()).toContain("clientes");
      expect(res.isTranslation).toBe(false);
    });

    it("should understand Japanese and respond in fluent Japanese", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "売上を伸ばすにはどうすればよいですか？",
      });

      expect(res.detectedLanguage).toBe("ja");
      expect(res.responseLanguage).toBe("ja");
      expect(res.text).toContain("売上");
      expect(res.text).toContain("顧客");
      expect(res.isTranslation).toBe(false);
    });

    it("should understand Arabic and respond in fluent Arabic", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "كيف يمكنني زيادة مبيعاتي؟",
      });

      expect(res.detectedLanguage).toBe("ar");
      expect(res.responseLanguage).toBe("ar");
      expect(res.text).toContain("مبيعات");
      expect(res.isTranslation).toBe(false);
    });
  });

  // =========================================================================
  // 2. Multi-Turn Language Switching in ONE Continuous Conversation
  // =========================================================================
  describe("2. Multi-Turn Dynamic Language Switching in ONE Conversation", () => {
    it("should switch English -> Malay -> Mandarin -> Spanish -> English in the SAME conversation", async () => {
      // Turn 1: English
      const t1 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Provide an executive operational status report.",
      });
      const convId = t1.conversationId;
      expect(t1.responseLanguage).toBe("en");

      // Turn 2: Malay in same conversation
      const t2 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "Boleh terangkan status syarikat hari ini?",
      });
      expect(t2.conversationId).toBe(convId);
      expect(t2.responseLanguage).toBe("ms");
      expect(t2.text).toContain("Salam sejahtera");

      // Turn 3: Mandarin in same conversation
      const t3 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "公司的运营状态如何？",
      });
      expect(t3.conversationId).toBe(convId);
      expect(t3.responseLanguage).toBe("zh");
      expect(t3.text).toContain("ELMO");

      // Turn 4: Spanish in same conversation
      const t4 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "¿Cuál es el estado del proyecto y de la empresa?",
      });
      expect(t4.conversationId).toBe(convId);
      expect(t4.responseLanguage).toBe("es");
      expect(t4.text).toContain("ELMO");

      // Turn 5: English in same conversation
      const t5 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "Summarize our readiness for this week.",
      });
      expect(t5.conversationId).toBe(convId);
      expect(t5.responseLanguage).toBe("en");

      // Verify all 10 messages (5 user + 5 assistant) exist in the single conversation
      const chatService = ChatService.getInstance();
      const msgs = await chatService.listMessages(userId, orgId, convId);
      expect(msgs.data).toHaveLength(10);
    });
  });

  // =========================================================================
  // 3. Explicit Language Directives
  // =========================================================================
  describe("3. Explicit Language Directives", () => {
    it("should obey explicit user language instruction to switch to Malay and then back to English", async () => {
      const t1 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Reply in Malay.",
      });
      expect(t1.responseLanguage).toBe("ms");
      expect(t1.isExplicitOverride).toBe(true);
      expect(t1.text).toContain("Bahasa Melayu");

      const t2 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: t1.conversationId,
        message: "Now reply in English.",
      });
      expect(t2.responseLanguage).toBe("en");
      expect(t2.isExplicitOverride).toBe(true);
      expect(t2.text).toContain("English");
    });
  });

  // =========================================================================
  // 4. Natural Mixed-Language Input (Manglish / Bahasa Rojak)
  // =========================================================================
  describe("4. Natural Mixed-Language Input", () => {
    it("should process code-mixed phrasing without translating into stiff English", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "ELMO, boleh tak you tolong check status projek hari ini?",
      });

      expect(res.responseLanguage).toBe("ms");
      expect(res.text).toContain("Salam sejahtera");
      expect(res.text.toLowerCase()).toContain("status operasi syarikat");
    });
  });

  // =========================================================================
  // 5. Context Retention Across Languages (Campaign Follow-up)
  // =========================================================================
  describe("5. Context Retention Across Language Boundaries", () => {
    it("should understand follow-up requests referring to earlier context in another language", async () => {
      // Turn 1: Discuss property marketing campaign in English
      const t1 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Help me create a property marketing campaign.",
      });
      const convId = t1.conversationId;

      // Turn 2: Follow-up in Malay asking for the Malay version of the same campaign
      const t2 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "Sekarang bagi saya versi Bahasa Melayu.",
      });
      expect(t2.conversationId).toBe(convId);
      expect(t2.responseLanguage).toBe("ms");
      expect(t2.text).toContain("Pelan Kempen Pemasaran Hartanah");
      expect(t2.text).toContain("Penyasaran Khalayak");

      // Turn 3: Follow-up in Mandarin asking for the Chinese version of the same campaign
      const t3 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "现在给我一个中文版本。",
      });
      expect(t3.conversationId).toBe(convId);
      expect(t3.responseLanguage).toBe("zh");
      expect(t3.text).toContain("房地产营销活动方案");
      expect(t3.text).toContain("目标客群定位");
    });
  });

  // =========================================================================
  // 6. Translation Requests vs Direct Inquiries
  // =========================================================================
  describe("6. Translation Requests vs Regular Inquiries", () => {
    it("should perform an accurate translation when explicitly asked to translate", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Translate this into Japanese: The quarterly meeting is at 2 PM",
      });

      expect(res.isTranslation).toBe(true);
      expect(res.text).toContain("四半期ミーティングは午後2時です");
    });

    it("should answer a question in Japanese directly rather than mistaking it for a translation request", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "今日は何をすればいいですか？",
      });

      expect(res.isTranslation).toBe(false);
      expect(res.responseLanguage).toBe("ja");
      expect(res.text).toContain("ELMO");
      expect(res.text).toContain("全システムは安定稼働しており");
    });
  });

  // =========================================================================
  // 7. Clarification Behavior in the User's Response Language
  // =========================================================================
  describe("7. Clarification Behavior in the User's Language", () => {
    it("should ask a clarifying question in Malay when user request in Malay is ambiguous", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Saya mahu buat kempen.",
      });

      expect(res.responseLanguage).toBe("ms");
      expect(res.responseType).toBe("QUESTION");
      expect(res.text).toContain("Boleh saya tahu");
      expect(res.text).toContain("bajet");
    });
  });

  // =========================================================================
  // 8. AI Usage Tracking & Telemetry
  // =========================================================================
  describe("8. AI Usage Tracking", () => {
    it("should log usage records with tokens, model, provider, and requestType", async () => {
      intelligenceService.clearUsageHistory();

      await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Outline our strategic goals for Q3.",
      });

      const usage = intelligenceService.getAIUsageHistory(orgId);
      expect(usage).toHaveLength(1);
      expect(usage[0].organization_id).toBe(orgId);
      expect(usage[0].user_id).toBe(userId);
      expect(usage[0].provider).toBe("gemini");
      expect(usage[0].totalTokens).toBeGreaterThan(0);
      expect(usage[0].requestType).toBe("conversation");
    });
  });

  // =========================================================================
  // 9. Tenant Isolation & Security
  // =========================================================================
  describe("9. Multi-Tenant Security & Isolation", () => {
    it("should reject message processing if the user does not belong to the target organization", async () => {
      await expect(
        intelligenceService.processMessage({
          userId,
          organizationId: otherOrgId, // Unauthorized org
          message: "Attempting cross-tenant access.",
        })
      ).rejects.toThrow(/Security Violation/);
    });
  });

  // =========================================================================
  // 10. Streaming & Duplicate Prevention
  // =========================================================================
  describe("10. SSE Streaming & Message Integrity", () => {
    it("should stream successive tokens and persist exactly one user and one assistant message", async () => {
      const streamGen = intelligenceService.streamMessage({
        userId,
        organizationId: orgId,
        message: "Provide an executive summary.",
      });

      let tokenCount = 0;
      let convIdFromStream = "";
      let langEventReceived = false;

      for await (const event of streamGen) {
        if (event.event === "conversation") {
          convIdFromStream = (event.data as any).conversationId;
        } else if (event.event === "language") {
          langEventReceived = true;
        } else if (event.event === "token") {
          tokenCount++;
        }
      }

      expect(convIdFromStream).toBeTruthy();
      expect(langEventReceived).toBe(true);
      expect(tokenCount).toBeGreaterThan(0);

      // Verify no duplicate assistant messages were persisted
      const chatService = ChatService.getInstance();
      const msgs = await chatService.listMessages(userId, orgId, convIdFromStream);
      expect(msgs.data).toHaveLength(2); // 1 user + 1 assistant
      expect(msgs.data[0].role).toBe("user");
      expect(msgs.data[1].role).toBe("assistant");
      expect(msgs.data[1].metadata.status).toBe("complete");
    });
  });

  // =========================================================================
  // 11. Error Handling & Provider Failure Recovery
  // =========================================================================
  describe("11. Error Handling & Resilient Recovery", () => {
    it("should reject empty messages with clear user-friendly validation error", async () => {
      await expect(
        intelligenceService.processMessage({
          userId,
          organizationId: orgId,
          message: "   ",
        })
      ).rejects.toThrow("Message content cannot be empty.");
    });

    it("should handle provider failure gracefully without crashing the service", async () => {
      const failingProvider: LLMProvider = {
        name: "mock-failing",
        async generateResponse() {
          throw new Error("Provider rate limit reached (429)");
        },
        async *generateStream() {
          throw new Error("Provider rate limit reached (429)");
        },
      };

      ELMOIntelligenceService.resetInstance();
      const failingService = ELMOIntelligenceService.getInstance(failingProvider);

      await expect(
        failingService.processMessage({
          userId,
          organizationId: orgId,
          message: "Test provider failure.",
        })
      ).rejects.toThrow(/ELMO Intelligence Engine Error.*rate limit/);
    });
  });
});
