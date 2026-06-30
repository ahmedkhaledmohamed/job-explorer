import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Adding pipeline fields to user_jobs...");
  await sql`ALTER TABLE user_jobs ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'discovered'`;
  await sql`ALTER TABLE user_jobs ADD COLUMN IF NOT EXISTS pipeline_history JSONB DEFAULT '[]'`;
  await sql`ALTER TABLE user_jobs ADD COLUMN IF NOT EXISTS outcome TEXT`;
  await sql`ALTER TABLE user_jobs ADD COLUMN IF NOT EXISTS outcome_reason TEXT`;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_user_jobs_pipeline ON user_jobs(user_id, pipeline_stage)`);

  // Sync pipeline_stage from status for existing rows
  await sql`UPDATE user_jobs SET pipeline_stage = status WHERE pipeline_stage = 'discovered' AND status != 'new'`;

  console.log("Creating interview_prep table...");
  await sql`
    CREATE TABLE IF NOT EXISTS interview_prep (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      content TEXT,
      key_questions JSONB DEFAULT '[]',
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_interview_prep_job ON interview_prep(user_id, job_id)`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
