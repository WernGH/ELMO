/**
 * Specialist AI Employee Types
 * For future phases: Represents autonomous specialist AI workers managed by ELMO
 */

export type EmployeeRoleCategory =
  | "engineering"
  | "marketing"
  | "sales"
  | "operations"
  | "finance"
  | "support"
  | "research";

export type EmployeeStatus = "idle" | "working" | "paused" | "offline" | "error";

export interface AIEmployee {
  id: string;
  organizationId: string;
  name: string;
  avatarUrl?: string;
  title: string;
  category: EmployeeRoleCategory;
  modelProvider: "gemini" | "custom";
  status: EmployeeStatus;
  currentTaskId?: string;
  skills: string[];
  toolsEnabled: string[];
  assignedByELMO: boolean;
  createdAt: string;
  updatedAt: string;
}
