import { Database, OrganizationRole } from "./database.types";

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
export type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];

export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type Role = OrganizationRole;

export interface OrganizationWithMemberRole extends Organization {
  role: Role;
}

export interface MemberWithProfile extends OrganizationMember {
  profile: Profile | null;
  email?: string;
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

export interface RolePermissions {
  canDeleteOrg: boolean;
  canUpdateOrgSettings: boolean;
  canManageMembers: boolean;
  canAssignRoles: boolean;
  canManageIntegrations: boolean;
  canDirectELMO: boolean;
  canApproveWorkflows: boolean;
  canViewReports: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  owner: {
    canDeleteOrg: true,
    canUpdateOrgSettings: true,
    canManageMembers: true,
    canAssignRoles: true,
    canManageIntegrations: true,
    canDirectELMO: true,
    canApproveWorkflows: true,
    canViewReports: true,
  },
  admin: {
    canDeleteOrg: false,
    canUpdateOrgSettings: true,
    canManageMembers: true,
    canAssignRoles: true,
    canManageIntegrations: true,
    canDirectELMO: true,
    canApproveWorkflows: true,
    canViewReports: true,
  },
  manager: {
    canDeleteOrg: false,
    canUpdateOrgSettings: false,
    canManageMembers: false,
    canAssignRoles: false,
    canManageIntegrations: false,
    canDirectELMO: true,
    canApproveWorkflows: true,
    canViewReports: true,
  },
  member: {
    canDeleteOrg: false,
    canUpdateOrgSettings: false,
    canManageMembers: false,
    canAssignRoles: false,
    canManageIntegrations: false,
    canDirectELMO: false,
    canApproveWorkflows: false,
    canViewReports: true,
  },
  viewer: {
    canDeleteOrg: false,
    canUpdateOrgSettings: false,
    canManageMembers: false,
    canAssignRoles: false,
    canManageIntegrations: false,
    canDirectELMO: false,
    canApproveWorkflows: false,
    canViewReports: true,
  },
};
