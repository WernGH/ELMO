import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

/**
 * Creates a browser-safe Supabase client using public environment variables.
 * Safe for use in client components (browser).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
/**
 * Checks whether live Supabase credentials are configured (non-empty and non-placeholder).
 */
export function isSupabaseConfigured(): boolean {
  if (process.env.VITEST === "true" && process.env.TEST_REAL_SUPABASE !== "true") {
    return false;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    !url.includes("placeholder") &&
    key &&
    !key.includes("placeholder")
  );
}
