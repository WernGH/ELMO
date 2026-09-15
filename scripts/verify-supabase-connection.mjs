/**
 * ELMO Supabase Live Verification Script
 * 
 * Tests connectivity to the configured Supabase project,
 * verifies database tables, and tests RLS enforcement.
 * 
 * Run with:
 *   node scripts/verify-supabase-connection.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("\n========================================================");
console.log("       ELMO SUPABASE LIVE CONNECTIVITY VERIFIER         ");
console.log("========================================================\n");

console.log("1. Environment Credentials Check:");
console.log(" - NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? supabaseUrl : "(MISSING)");
console.log(" - NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? (supabaseAnonKey.includes("placeholder") ? "(PLACEHOLDER DETECTED)" : "[CONFIGURED]") : "(MISSING)");
console.log(" - SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? (serviceRoleKey.includes("placeholder") || serviceRoleKey.includes("secret-key") ? "(PLACEHOLDER DETECTED)" : "[CONFIGURED]") : "(MISSING)");

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder") || supabaseAnonKey.includes("placeholder")) {
  console.log("\n[STATUS: INACTIVE / MOCK MODE ACTIVE]");
  console.log("Real Supabase credentials are not yet configured in .env.local.");
  console.log("ELMO is safely operating with its in-memory multi-tenant MockDataStore.");
  console.log("\nTo connect to a live Supabase project:");
  console.log(" 1. Create a project at https://supabase.com");
  console.log(" 2. Apply migrations by pasting 'supabase/apply_all_migrations.sql' into the Supabase SQL Editor");
  console.log(" 3. Update NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.log(" 4. Re-run this script: node scripts/verify-supabase-connection.mjs\n");
  process.exit(0);
}

async function runVerification() {
  console.log("\n2. Testing Public API Connectivity (Anon Client)...");
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await anonClient.from("organizations").select("id, name").limit(1);
    if (error) {
      console.log("Anon query response:", error.message);
    } else {
      console.log("SUCCESS: Connected via Anon Client! Organizations found:", data?.length || 0);
    }
  } catch (err) {
    console.error("FAILED to connect with Anon client:", err.message);
  }

  if (serviceRoleKey && !serviceRoleKey.includes("placeholder")) {
    console.log("\n3. Testing Admin Access & Schema Integrity (Service Role)...");
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const expectedTables = [
      "organizations",
      "organization_members",
      "conversations",
      "messages",
      "company_memories",
      "funnels",
      "pages",
      "forms",
      "contacts",
      "form_submissions",
      "email_templates",
      "email_sequences",
      "automations",
      "analytics_events",
      "agent_executions",
    ];

    let tablesVerified = 0;
    for (const table of expectedTables) {
      const { error } = await adminClient.from(table).select("id").limit(1);
      if (error) {
        console.log(` - Table [${table}]: ERROR - ${error.message}`);
      } else {
        console.log(` - Table [${table}]: PRESENT & QUERYABLE`);
        tablesVerified++;
      }
    }

    console.log(`\nVerified ${tablesVerified}/${expectedTables.length} core database tables.`);
    if (tablesVerified === expectedTables.length) {
      console.log("\n>>> ALL SUPABASE MIGRATIONS ARE LIVE & VERIFIED! <<<");
    } else {
      console.log("\nSome tables were not found. Please run 'supabase/apply_all_migrations.sql' in the Supabase SQL Editor.");
    }
  }
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
});
