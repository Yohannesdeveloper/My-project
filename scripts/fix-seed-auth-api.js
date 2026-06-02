/**
 * Repair seed users via Supabase Auth Admin API (no direct DB URL required).
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Project Settings → API → service_role)."
  );
  process.exit(1);
}

const SEED_USERS = [
  { id: "11111111-1111-1111-1111-111111111111", email: "seed1@aspio.io" },
  { id: "22222222-2222-2222-2222-222222222222", email: "seed2@aspio.io" },
  { id: "33333333-3333-3333-3333-333333333333", email: "seed3@aspio.io" },
  { id: "44444444-4444-4444-4444-444444444444", email: "seed4@aspio.io" },
];
const PASSWORD = "SeedPass123!";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function repairUser({ id, email }) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = listed.users.find((u) => u.id === id || u.email === email);

  if (existing) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(existing.id);
    if (deleteError) throw deleteError;
    console.log(`Deleted broken user ${email} (${existing.id})`);
  }

  const { data, error: createError } = await admin.auth.admin.createUser({
    id,
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createError) throw createError;
  console.log(`Created user ${email} (${data.user.id})`);
}

(async () => {
  try {
    for (const user of SEED_USERS) {
      await repairUser(user);
    }
    console.log("Seed auth repair completed via Admin API.");
  } catch (error) {
    console.error("Seed auth repair failed:", error.message || error);
    process.exit(1);
  }
})();
