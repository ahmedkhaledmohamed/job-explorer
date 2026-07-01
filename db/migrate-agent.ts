import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Adding agent_settings to users...");
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_settings JSONB DEFAULT '{"threshold": 0.5, "max_per_day": 5, "digest_enabled": false, "digest_email": ""}'`;

  console.log("Creating agent_tasks table...");
  await sql`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      task_type TEXT NOT NULL DEFAULT 'apply',
      status TEXT NOT NULL DEFAULT 'queued',
      score FLOAT,
      gaps JSONB DEFAULT '[]',
      result JSONB DEFAULT '{}',
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, job_id)
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id, status)`);

  console.log("Creating email_digests table...");
  await sql`
    CREATE TABLE IF NOT EXISTS email_digests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      digest_type TEXT NOT NULL DEFAULT 'daily_matches',
      job_ids TEXT[] DEFAULT '{}',
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Migration complete.");
}

migrate().catch(console.error);
