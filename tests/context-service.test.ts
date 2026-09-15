import { describe, it, expect, beforeEach } from "vitest";
import { ContextService } from "@/services/context.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("ContextService - Executive Context Assembly", () => {
  let contextService: ContextService;
  let mockStore: MockDataStore;

  const defaultUserId = "00000000-0000-0000-0000-000000000001";
  const defaultOrgId = "11111111-1111-1111-1111-111111111111";
  const defaultConvId = "33333333-3333-3333-3333-333333333333";

  beforeEach(() => {
    mockStore = MockDataStore.getInstance();
    mockStore.reset();
    contextService = ContextService.getInstance();
  });

  it("should assemble complete executive context including user, org, and conversation", async () => {
    const context = await contextService.buildChatContext({
      userId: defaultUserId,
      organizationId: defaultOrgId,
      conversationId: defaultConvId,
    });

    expect(context.user.id).toBe(defaultUserId);
    expect(context.user.displayName).toBe("Executive Superior");
    expect(context.user.role).toBe("owner");

    expect(context.organization.id).toBe(defaultOrgId);
    expect(context.organization.name).toBe("ELMO Holdings");
    expect(context.organization.autonomyMode).toBe("supervised");

    expect(context.conversation.id).toBe(defaultConvId);
    expect(context.conversation.title).toBe("Executive Strategic Briefing");

    expect(context.recentMessages.length).toBeGreaterThan(0);
    expect(context.recentMessages[0].role).toBe("assistant");
  });

  it("should inject non-hallucination boundaries and executive role hierarchy in system prompt", async () => {
    const context = await contextService.buildChatContext({
      userId: defaultUserId,
      organizationId: defaultOrgId,
      conversationId: defaultConvId,
    });

    const sysPrompt = context.systemInstruction;
    expect(sysPrompt).toContain("ELMO, the AI CEO");
    expect(sysPrompt).toContain("subordinate directly to the human owner");
    expect(sysPrompt).toContain("NEVER pretend an action was executed");
    expect(sysPrompt).toContain("CLEARLY DISTINGUISH between thinking/planning and actual execution");
    expect(sysPrompt).toContain("Specialist AI Employees");
    expect(sysPrompt).toContain("NOT currently connected");
  });
});
