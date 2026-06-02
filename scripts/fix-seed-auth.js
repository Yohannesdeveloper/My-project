const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing SUPABASE_DB_URL or DATABASE_URL environment variable.");
  process.exit(1);
}

const sqlPath = path.resolve(__dirname, "fix-seed-auth.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

(async () => {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Repairing seed auth users (auth.users + auth.identities)...");
    await client.query(sql);
    console.log("Seed auth repair completed. Try signing in with seed1@aspio.io / SeedPass123!");
  } catch (error) {
    console.error("Seed auth repair failed:", error.message || error);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
