import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating fit_narratives table...");

  await sql`
    CREATE TABLE IF NOT EXISTS fit_narratives (
      id SERIAL PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      slug TEXT UNIQUE NOT NULL,
      requirements JSONB DEFAULT '[]',
      mappings JSONB DEFAULT '[]',
      overall_narrative TEXT,
      confidence_score FLOAT,
      generation_model TEXT,
      published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_fit_narratives_job_id ON fit_narratives(job_id)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_fit_narratives_slug ON fit_narratives(slug)`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
