import { describe, it, expect, vi, afterEach } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

describe("Security Guardrails & Secret Isolation", () => {
  afterEach(() => {
    // Clean up simulated browser environment
    // @ts-expect-error - vitest cleanup
    delete global.window;
  });

  it("should throw a Critical Security Violation if createAdminClient is called in a browser environment", () => {
    // Simulate browser window object
    // @ts-expect-error - simulate browser
    global.window = {};

    expect(() => createAdminClient()).toThrowError(
      /CRITICAL SECURITY VIOLATION/
    );
  });

  it("browser client should instantiate safely without leaking service-role key", () => {
    const client = createBrowserClient();
    expect(client).toBeDefined();

    // Verify public environment variable naming convention
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(anonKey).toBeDefined();
    // Anon key must differ from service role key
    if (serviceKey && anonKey) {
      expect(anonKey).not.toEqual(serviceKey);
    }
  });
});
