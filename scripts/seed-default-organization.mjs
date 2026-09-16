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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log("Checking for default organization in Supabase...");
  const defaultOrgId = "11111111-1111-1111-1111-111111111111";

  const { data: existing, error: selectErr } = await adminClient
    .from("organizations")
    .select("id, name")
    .eq("id", defaultOrgId)
    .maybeSingle();

  if (selectErr) {
    console.error("Error querying organizations:", selectErr.message);
    return;
  }

  if (existing) {
    console.log("Default organization already exists:", existing);
  } else {
    console.log("Creating default organization...");
    const { data: newOrg, error: insertErr } = await adminClient
      .from("organizations")
      .insert({
        id: defaultOrgId,
        name: "ELMO Executive Organization",
        slug: "elmo-executive",
        settings: {
          autonomy_mode: "supervised",
          elmo_status: "active"
        }
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to insert default organization:", insertErr.message);
    } else {
      console.log("SUCCESS: Created default organization:", newOrg.id, newOrg.name);
    }
  }
}

seed().catch(console.error);
