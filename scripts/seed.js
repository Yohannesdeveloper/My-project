const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing SUPABASE_DB_URL or DATABASE_URL environment variable.");
  process.exit(1);
}

const sqlPath = path.resolve(__dirname, "..", "schema.sql");
let sql;
try {
  sql = fs.readFileSync(sqlPath, "utf8");
} catch (error) {
  console.error(`Unable to read schema.sql at ${sqlPath}:`, error.message || error);
  process.exit(1);
}

(async () => {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Seeding database from schema.sql...");
    await client.query(sql);
    console.log("Seed completed successfully.");
  } catch (error) {
    console.error("Seed failed:", error.message || error);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
