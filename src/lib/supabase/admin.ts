import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

/**
 * Creates an elevated administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * STRICT SECURITY POLICY:
 * - MUST NEVER be called or imported from browser client components!
 * - Bypasses RLS for trusted system tasks (e.g. system provisioning, background jobs).
 */
export function createAdminClient() {
  // Runtime guard against browser exposure
  if (typeof window !== "undefined") {
    throw new Error(
      "CRITICAL SECURITY VIOLATION: createAdminClient() called in client-side environment. Service-role secrets must never be exposed to the browser!"
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined in server environment variables.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
