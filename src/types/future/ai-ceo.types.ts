/**
 * ELMO AI CEO Future Phase Architecture Types
 * Defines the cognitive interfaces, autonomy policies, and executive briefing formats
 * so future phases can integrate without refactoring the foundation.
 */

export type ELMOAutonomyLevel = "supervised" | "hybrid" | "autonomous";

export type ELMOOperationalStatus = "idle" | "planning" | "orchestrating" | "reviewing" | "awaiting_approval";

export interface ELMODirective {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "draft" | "active" | "completed" | "paused";
  issuedByUserId: string; // The human superior (Owner / CEO's superior)
  targetCompletionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ELMOExecutiveBriefing {
  id: string;
  organizationId: string;
  timestamp: string;
  headline: string;
  workforceSummary: {
    activeEmployees: number;
    tasksInProgress: number;
    approvalsPending: number;
    anomaliesDetected: number;
  };
  recommendations: string[];
}
