import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Adding job_requirements table and match_score to jobs...");

  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match_score FLOAT`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match_details JSONB`;
  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_jobs_match_score ON jobs(match_score DESC NULLS LAST)`
  );

  await sql`
    CREATE TABLE IF NOT EXISTS job_requirements (
      id SERIAL PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      requirement TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      match_status TEXT DEFAULT 'pending',
      match_evidence TEXT,
      extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_job_requirements_job_id ON job_requirements(job_id)`
  );

  console.log("Migration complete.");
}

migrate().catch(console.error);
