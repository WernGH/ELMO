import fs from 'fs';
import path from 'path';

function makeIdempotent(sql) {
  let modified = sql;

  // 1. Triggers:
  // Matches:
  // CREATE TRIGGER <trigger_name>
  //     BEFORE/AFTER ... ON <table_name>
  // Or CREATE TRIGGER <trigger_name> ON <table_name>
  // We want to prepend DROP TRIGGER IF EXISTS <trigger_name> ON <table_name>;
  const triggerRegex = /(?<!DROP\s+TRIGGER\s+IF\s+EXISTS\s+[^\n;]+;\s*)CREATE\s+TRIGGER\s+(\w+)\s+([\s\S]*?ON\s+(public\.\w+|auth\.\w+|\w+))/gi;

  modified = modified.replace(triggerRegex, (match, triggerName, rest, tableName) => {
    // If it's already preceded by DROP TRIGGER IF EXISTS, don't duplicate
    return `DROP TRIGGER IF EXISTS ${triggerName} ON ${tableName};\nCREATE TRIGGER ${triggerName} ${rest}`;
  });

  // 2. Policies:
  // Matches:
  // CREATE POLICY ("[^"]+"|\w+)
  //     ON (public\.\w+|\w+)
  // Or CREATE POLICY ("[^"]+"|\w+) ON (public\.\w+|\w+)
  const policyRegex = /(?<!DROP\s+POLICY\s+IF\s+EXISTS\s+[^\n;]+;\s*)CREATE\s+POLICY\s+("[^"]+"|\w+)\s+([\s\S]*?ON\s+(public\.\w+|\w+))/gi;

  modified = modified.replace(policyRegex, (match, policyName, rest, tableName) => {
    // If it's already preceded by DROP POLICY IF EXISTS, don't duplicate
    return `DROP POLICY IF EXISTS ${policyName} ON ${tableName};\nCREATE POLICY ${policyName} ${rest}`;
  });

  return modified;
}

// Process all files in supabase/migrations/
const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

console.log(`Processing ${migrationFiles.length} migration files in ${migrationsDir}...`);

let combinedRollup = `-- ==============================================================================
-- ELMO COMPLETE SUPABASE SCHEMA & MIGRATIONS (CHRONOLOGICAL ROLLUP)
-- Run this in Supabase SQL Editor to provision all tables, RLS policies, & indexes
-- ==============================================================================
`;

for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const idempotent = makeIdempotent(content);
  fs.writeFileSync(filePath, idempotent, 'utf8');
  console.log(`Updated: ${file}`);

  combinedRollup += `\n-- >>> MIGRATION: ${file} <<<\n${idempotent}\n`;
}

// Write to apply_all_migrations.sql
const applyPath = path.resolve(process.cwd(), 'supabase/apply_all_migrations.sql');
fs.writeFileSync(applyPath, combinedRollup, 'utf8');
console.log(`Updated: apply_all_migrations.sql (${combinedRollup.length} bytes)`);
