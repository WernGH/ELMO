/**
 * ELMO Unified Conversational Intelligence Test Suite
 *
 * Verifies:
 * 1. Semantic intent understanding for casual conversations (e.g., "Sudah makan?" -> natural Malay response, not generic loops)
 * 2. Natural casual greetings and answers across multiple languages (Malay, English, Mandarin, Spanish)
 * 3. Dynamic multilingual switching within ONE continuous conversation
 * 4. Cross-modal continuity: Text turn -> Voice turn -> Text turn with full memory preservation
 * 5. Canonical message data model with input_mode, language_code, language_name, language_confidence, intent
 * 6. Turn telemetry publishing and Section 24 logging
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { LanguageContextService } from "@/services/voice/language-context.service";
import { LanguageDetectionService } from "@/services/voice/language-detection.service";
import { VoiceController } from "@/services/voice/voice-controller";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ChatService } from "@/services/chat.service";

describe("ELMO Unified Text + Voice Conversational Intelligence", () => {
  const orgId = "11111111-1111-1111-1111-111111111111"; // TechCorp Enterprise
  const userId = "00000000-0000-0000-0000-000000000001"; // Executive User

  let intelligenceService: ELMOIntelligenceService;
  let chatService: ChatService;

  beforeEach(() => {
    MockDataStore.getInstance().reset();
    LanguageContextService.resetInstance();
    LanguageDetectionService.resetInstance();
    ELMOIntelligenceService.resetInstance();
    intelligenceService = ELMOIntelligenceService.getInstance();
    chatService = ChatService.getInstance();
  });

  // =========================================================================
  // 1. Natural Casual Conversation (Fixing Repetitive / Generic Response Loops)
  // =========================================================================
  describe("1. Casual Conversation & Semantic Understanding (No Generic Loops)", () => {
    it("should respond naturally in Malay to 'Sudah makan?' without generic canned loops", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "ELMO, sudah makan?",
        inputMode: "text",
      });

      expect(res.detectedLanguageCode).toBe("ms");
      expect(res.responseLanguage).toBe("ms");
      expect(res.intent).toBe("casual_conversation");

      // Verify the response is conversational and NOT a generic canned assistant loop
      const lower = res.text.toLowerCase();
      expect(lower).not.toContain("how can i help you");
      expect(lower).not.toContain("bagaimanakah saya boleh membantu");
      expect(lower).not.toContain("operasi dan perancangan strategik");

      // Should acknowledge eating or being an AI or thanking naturally
      const hasNaturalMalayKeywords =
        lower.includes("belum") ||
        lower.includes("makan") ||
        lower.includes("terima kasih") ||
        lower.includes("kenyang") ||
        lower.includes("tenaga") ||
        lower.includes("dah");
      expect(hasNaturalMalayKeywords).toBe(true);
    });

    it("should respond naturally in Malay to casual greeting 'Apa khabar hari ni?'", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Apa khabar hari ni?",
        inputMode: "text",
      });

      expect(res.detectedLanguageCode).toBe("ms");
      expect(res.responseLanguage).toBe("ms");
      expect(res.intent).toBe("greeting");

      const lower = res.text.toLowerCase();
      expect(lower).not.toContain("how can i help you today");
      const hasGreetingMalayKeywords =
        lower.includes("khabar baik") ||
        lower.includes("baik") ||
        lower.includes("sihat") ||
        lower.includes("terima kasih");
      expect(hasGreetingMalayKeywords).toBe(true);
    });

    it("should respond directly and concisely to simple English questions", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "What's the weather like today?",
        inputMode: "text",
      });

      expect(res.detectedLanguageCode).toBe("en");
      expect(res.responseLanguage).toBe("en");

      const lower = res.text.toLowerCase();
      expect(lower).not.toContain("how can i help you today");
      expect(lower).toContain("weather");
    });

    it("should respond naturally in Mandarin to '你好 ELMO，你吃饭了吗？'", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "你好 ELMO，你吃饭了吗？",
        inputMode: "text",
      });

      expect(res.detectedLanguageCode).toBe("zh");
      expect(res.responseLanguage).toBe("zh");
      expect(res.intent).toBe("casual_conversation");

      const text = res.text;
      const hasNaturalZhKeywords =
        text.includes("还没") ||
        text.includes("吃") ||
        text.includes("谢谢") ||
        text.includes("AI") ||
        text.includes("饱");
      expect(hasNaturalZhKeywords).toBe(true);
      expect(text).not.toContain("How can I help you");
    });

    it("should respond naturally in Spanish to 'Hola ELMO, ¿cómo estás?'", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Hola ELMO, ¿cómo estás?",
        inputMode: "text",
      });

      expect(res.detectedLanguageCode).toBe("es");
      expect(res.responseLanguage).toBe("es");

      const lower = res.text.toLowerCase();
      const hasNaturalEsKeywords =
        lower.includes("bien") ||
        lower.includes("gracias") ||
        lower.includes("hola");
      expect(hasNaturalEsKeywords).toBe(true);
    });
  });

  // =========================================================================
  // 2. Multilingual Switching Across Turns in ONE Continuous Conversation
  // =========================================================================
  describe("2. Dynamic Language Switching in One Continuous Conversation", () => {
    it("should seamlessly switch languages across turns without restarting conversation", async () => {
      // Turn 1: Malay casual inquiry
      const turn1 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Sudah makan?",
        inputMode: "text",
      });
      const convId = turn1.conversationId;
      expect(turn1.detectedLanguageCode).toBe("ms");
      expect(turn1.responseLanguage).toBe("ms");

      // Turn 2: Switch to English on same conversation
      const turn2 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "Okay, what should I focus on tomorrow?",
        inputMode: "text",
      });
      expect(turn2.conversationId).toBe(convId);
      expect(turn2.detectedLanguageCode).toBe("en");
      expect(turn2.responseLanguage).toBe("en");

      // Turn 3: Switch to Mandarin on same conversation
      const turn3 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "你觉得怎么样？",
        inputMode: "text",
      });
      expect(turn3.conversationId).toBe(convId);
      expect(turn3.detectedLanguageCode).toBe("zh");
      expect(turn3.responseLanguage).toBe("zh");

      // Verify all 6 messages exist in the same conversation
      const history = await chatService.listMessages(userId, orgId, convId);
      expect(history.data).toHaveLength(6);
    });
  });

  // =========================================================================
  // 3. Cross-Modal Continuity: TEXT -> VOICE -> TEXT
  // =========================================================================
  describe("3. Cross-Modal Context Continuity (Text -> Voice -> Text)", () => {
    it("should retain context from text input when responding in voice mode, and vice-versa", async () => {
      // Turn 1 (TEXT): User shares plan in Malay
      const turn1 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Saya nak pergi KLCC esok.",
        inputMode: "text",
      });
      const convId = turn1.conversationId;
      expect(turn1.inputMode).toBe("text");
      expect(turn1.responseLanguage).toBe("ms");

      // Turn 2 (VOICE): User follows up via Voice in Malay
      // "Pukul berapa sesuai?" (What time is suitable?)
      const turn2 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "Pukul berapa sesuai?",
        inputMode: "voice",
      });

      expect(turn2.conversationId).toBe(convId);
      expect(turn2.inputMode).toBe("voice");
      expect(turn2.responseLanguage).toBe("ms");

      // ELMO should understand from Turn 1 that this relates to the KLCC trip
      const turn2TextLower = turn2.text.toLowerCase();
      expect(
        turn2TextLower.includes("klcc") ||
        turn2TextLower.includes("pagi") ||
        turn2TextLower.includes("petang") ||
        turn2TextLower.includes("sesak") ||
        turn2TextLower.includes("waktu")
      ).toBe(true);

      // Turn 3 (TEXT): User asks what to bring in English
      const turn3 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "Okay, what should I bring?",
        inputMode: "text",
      });

      expect(turn3.conversationId).toBe(convId);
      expect(turn3.inputMode).toBe("text");
      expect(turn3.responseLanguage).toBe("en");

      // ELMO understands context of trip/outing
      const turn3TextLower = turn3.text.toLowerCase();
      expect(
        turn3TextLower.includes("klcc") ||
        turn3TextLower.includes("bring") ||
        turn3TextLower.includes("card") ||
        turn3TextLower.includes("shoes") ||
        turn3TextLower.includes("umbrella") ||
        turn3TextLower.includes("items")
      ).toBe(true);

      // Verify conversation record reflects both text and voice modes
      const history = await chatService.listMessages(userId, orgId, convId);
      expect(history.data).toHaveLength(6);

      const userMsgs = history.data!.filter((m) => m.role === "user");
      expect(userMsgs[0].metadata?.input_mode).toBe("text");
      expect(userMsgs[1].metadata?.input_mode).toBe("voice");
      expect(userMsgs[2].metadata?.input_mode).toBe("text");
    });
  });

  // =========================================================================
  // 4. Multi-Turn Semantic Memory
  // =========================================================================
  describe("4. Multi-Turn Semantic Memory", () => {
    it("should remember user identity across turns in the same conversation", async () => {
      // Turn 1: User introduces themselves
      const turn1 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Nama saya Wern.",
        inputMode: "text",
      });
      const convId = turn1.conversationId;

      // Turn 2: User asks for their name in Malay
      const turn2 = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        conversationId: convId,
        message: "Siapa nama saya?",
        inputMode: "text",
      });

      expect(turn2.text.toLowerCase()).toContain("wern");
    });
  });

  // =========================================================================
  // 5. Canonical Message Data Model Verification
  // =========================================================================
  describe("5. Canonical Message Data Model & Telemetry", () => {
    it("should persist complete canonical metadata on user and assistant messages", async () => {
      const res = await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "ELMO, sudah makan?",
        inputMode: "voice",
      });

      const userMsg = res.userMessage;
      expect(userMsg.metadata).toBeDefined();
      expect(userMsg.metadata?.input_mode).toBe("voice");
      expect(userMsg.metadata?.language_code).toBe("ms");
      expect(userMsg.metadata?.language_name).toBe("Malay");
      expect(userMsg.metadata?.language_source).toBeDefined();
      expect(userMsg.metadata?.language_confidence).toBeGreaterThan(0.7);
      expect(userMsg.metadata?.intent).toBe("casual_conversation");

      const assistantMsg = res.assistantMessage;
      expect(assistantMsg.metadata).toBeDefined();
      expect(assistantMsg.metadata?.input_mode).toBe("voice");
      expect(assistantMsg.metadata?.language_code).toBe("ms");
      expect(assistantMsg.metadata?.intent).toBe("casual_conversation");
    });

    it("should publish TurnTelemetry to listeners on every turn", async () => {
      let receivedTelemetry: any = null;
      const unsubscribe = ELMOIntelligenceService.subscribeTelemetry((telemetry) => {
        receivedTelemetry = telemetry;
      });

      await intelligenceService.processMessage({
        userId,
        organizationId: orgId,
        message: "Apa khabar?",
        inputMode: "text",
      });

      expect(receivedTelemetry).toBeDefined();
      expect(receivedTelemetry.inputMode).toBe("text");
      expect(receivedTelemetry.languageCode).toBe("ms");
      expect(receivedTelemetry.intent).toBe("greeting");
      expect(receivedTelemetry.userInput).toBe("Apa khabar?");
      expect(receivedTelemetry.elmoResponse.length).toBeGreaterThan(0);

      unsubscribe();
    });
  });
});
