import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating user_jobs table...");
  await sql`
    CREATE TABLE IF NOT EXISTS user_jobs (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      top_match BOOLEAN NOT NULL DEFAULT FALSE,
      match_score FLOAT,
      match_details JSONB,
      saved_at TIMESTAMPTZ,
      applied_at TIMESTAMPTZ,
      resume_version TEXT,
      PRIMARY KEY (user_id, job_id)
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_user_jobs_user_id ON user_jobs(user_id)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_user_jobs_match_score ON user_jobs(user_id, match_score DESC NULLS LAST)`);

  // Get user #1
  const users = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  if (users.length === 0) {
    console.log("No users found. Skipping data migration.");
    return;
  }
  const userId = users[0].id as number;

  // Migrate existing per-user data from jobs to user_jobs
  const migrated = await sql`
    INSERT INTO user_jobs (user_id, job_id, status, notes, top_match, match_score, match_details, applied_at, resume_version)
    SELECT ${userId}, id, status, notes, top_match, match_score, match_details, applied_at, resume_version
    FROM jobs
    WHERE status != 'new' OR top_match = TRUE OR notes IS NOT NULL OR match_score IS NOT NULL OR applied_at IS NOT NULL
    ON CONFLICT DO NOTHING
  `;
  console.log(`Migrated ${migrated.length || 'existing'} job interactions to user_jobs for user #${userId}`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
