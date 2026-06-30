import { neon } from "@neondatabase/serverless";

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log("Running Smart Apply migration...");

  await sql.query(`
    CREATE TABLE IF NOT EXISTS application_forms (
      job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
      fields JSONB NOT NULL,
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ready BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  console.log("  Created application_forms table");

  await sql.query(`
    CREATE TABLE IF NOT EXISTS profile_answers (
      id SERIAL PRIMARY KEY,
      question_pattern TEXT NOT NULL UNIQUE,
      answer TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      used_count INTEGER DEFAULT 1
    )
  `);
  console.log("  Created profile_answers table");

  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_profile_answers_pattern ON profile_answers(question_pattern)
  `);
  console.log("  Created index on profile_answers(question_pattern)");

  console.log("Smart Apply migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
