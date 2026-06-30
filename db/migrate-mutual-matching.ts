import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating candidate_preferences table...");
  await sql`
    CREATE TABLE IF NOT EXISTS candidate_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      work_style JSONB DEFAULT '{}',
      team_preferences JSONB DEFAULT '{}',
      growth_priorities TEXT[] DEFAULT '{}',
      deal_breakers TEXT[] DEFAULT '{}',
      values TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Creating company_preferences table...");
  await sql`
    CREATE TABLE IF NOT EXISTS company_preferences (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
      ideal_candidate JSONB DEFAULT '{}',
      work_style JSONB DEFAULT '{}',
      anti_patterns TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_company_prefs_company ON company_preferences(company_id)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_company_prefs_job ON company_preferences(job_id)`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
