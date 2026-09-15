import { describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "@/services/auth.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("AuthService - Phase 1 Foundation", () => {
  let authService: AuthService;
  let mockStore: MockDataStore;

  beforeEach(() => {
    mockStore = MockDataStore.getInstance();
    mockStore.reset();
    authService = AuthService.getInstance();
  });

  it("should successfully sign up a new user, profile, and initial organization with owner role", async () => {
    const email = "founder_test@elmo-ai.com";
    const displayName = "Alpha Superior";
    const orgName = "Alpha Autonomous Corp";

    const response = await authService.signUp({
      email,
      password: "password123!",
      displayName,
      organizationName: orgName,
    });

    expect(response.error).toBeNull();
    expect(response.data).toBeDefined();
    expect(response.data?.user?.email).toBe(email);
    expect(response.data?.user?.displayName).toBe(displayName);
    expect(response.data?.profile?.display_name).toBe(displayName);

    const orgId = response.data?.organizationId;
    expect(orgId).toBeDefined();

    // Verify in mock store that user is owner
    if (response.data?.user?.id && orgId) {
      const role = mockStore.getOrgRole(response.data.user.id, orgId);
      expect(role).toBe("owner");
    }
  });

  it("should prevent duplicate signups with the same email", async () => {
    const payload = {
      email: "duplicate@elmo-ai.com",
      password: "password123!",
      displayName: "Duplicate User",
    };

    const first = await authService.signUp(payload);
    expect(first.error).toBeNull();

    const second = await authService.signUp(payload);
    expect(second.error).toContain("already exists");
  });

  it("should successfully log in with valid credentials", async () => {
    const email = "login_test@elmo-ai.com";
    const password = "securePassword123";

    await authService.signUp({
      email,
      password,
      displayName: "Login Tester",
    });

    const loginRes = await authService.signIn({ email, password });
    expect(loginRes.error).toBeNull();
    expect(loginRes.data?.user?.email).toBe(email);
    expect(loginRes.data?.organizationId).toBeDefined();
  });

  it("should reject login with invalid password", async () => {
    const email = "wrong_pass@elmo-ai.com";
    await authService.signUp({
      email,
      password: "correctPassword",
      displayName: "Tester",
    });

    const loginRes = await authService.signIn({
      email,
      password: "wrongPassword",
    });

    expect(loginRes.error).toBe("Invalid email or password.");
  });

  it("should sign out successfully", async () => {
    const res = await authService.signOut();
    expect(res.error).toBeNull();
    expect(res.data).toBe(true);
  });
});
