import {
  ELMODirective,
  ELMOExecutiveBriefing,
  ELMOOperationalStatus,
} from "@/types/future/ai-ceo.types";
import { IELMOCEOCognitiveEngine } from "./elmo-ceo.interface";
import { GeminiService } from "@/services/gemini.service";

export class ELMOGeminiCognitiveEngine implements IELMOCEOCognitiveEngine {
  private geminiService = GeminiService.getInstance();

  async getStatus(_organizationId: string): Promise<ELMOOperationalStatus> {
    return "planning";
  }

  async receiveDirective(
    directive: Omit<ELMODirective, "id" | "createdAt" | "updatedAt">
  ): Promise<ELMODirective> {
    return {
      ...directive,
      id: `dir-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async generateExecutiveBriefing(organizationId: string): Promise<ELMOExecutiveBriefing> {
    const prompt = `Generate an executive status headline and 2 operational recommendations for organization ID: ${organizationId}.`;
    const response = await this.geminiService.generateResponse({
      prompt,
      systemInstruction:
        "You are ELMO, AI CEO. Provide an executive summary of enterprise foundation status.",
    });

    return {
      id: `brf-${Date.now()}`,
      organizationId,
      timestamp: new Date().toISOString(),
      headline: response.text.slice(0, 120),
      workforceSummary: {
        activeEmployees: 0,
        tasksInProgress: 0,
        approvalsPending: 0,
        anomaliesDetected: 0,
      },
      recommendations: [
        "Phase 2 AI CEO Brain operational with Gemini neural reasoning.",
        "Specialist workforce scaffolding in place for Phase 3 onboarding.",
      ],
    };
  }

  async evaluatePendingApprovals(_organizationId: string): Promise<{ pendingCount: number }> {
    return { pendingCount: 0 };
  }
}
