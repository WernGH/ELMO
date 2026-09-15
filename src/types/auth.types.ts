import { Profile } from "./organization.types";

export interface UserSession {
  user: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  profile: Profile | null;
  activeOrganizationId: string | null;
}

export interface SignUpPayload {
  email: string;
  password: string;
  displayName: string;
  organizationName?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface AuthResponse<T = unknown> {
  data: T | null;
  error: string | null;
}
