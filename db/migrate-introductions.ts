import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating introductions table...");
  await sql`
    CREATE TABLE IF NOT EXISTS introductions (
      id SERIAL PRIMARY KEY,
      candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      initiated_by TEXT NOT NULL,
      match_score FLOAT,
      fit_narrative_id INTEGER REFERENCES fit_narratives(id) ON DELETE SET NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      viewed_at TIMESTAMPTZ,
      responded_at TIMESTAMPTZ,
      response_message TEXT
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_introductions_candidate ON introductions(candidate_id)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_introductions_company ON introductions(company_id)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_introductions_status ON introductions(status)`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
