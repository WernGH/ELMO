import { AIEmployee, EmployeeRoleCategory } from "@/types/future/employee.types";

/**
 * Interface contract for Specialist AI Employees (Phase 2+)
 */
export interface ISpecialistEmployeeRegistry {
  getEmployees(organizationId: string): Promise<AIEmployee[]>;
  hireEmployee(employee: Omit<AIEmployee, "id" | "createdAt" | "updatedAt">): Promise<AIEmployee>;
  assignTask(employeeId: string, taskId: string): Promise<boolean>;
  listAvailableSpecializations(): EmployeeRoleCategory[];
}

export class EmployeeRegistryMockStub implements ISpecialistEmployeeRegistry {
  async getEmployees(_orgId: string): Promise<AIEmployee[]> {
    return [];
  }

  async hireEmployee(employee: Omit<AIEmployee, "id" | "createdAt" | "updatedAt">): Promise<AIEmployee> {
    return {
      ...employee,
      id: `emp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async assignTask(_employeeId: string, _taskId: string): Promise<boolean> {
    return true;
  }

  listAvailableSpecializations(): EmployeeRoleCategory[] {
    return [
      "engineering",
      "marketing",
      "sales",
      "operations",
      "finance",
      "support",
      "research",
    ];
  }
}
