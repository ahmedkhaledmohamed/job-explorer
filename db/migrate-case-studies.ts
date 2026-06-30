import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating case_studies table...");

  await sql`
    CREATE TABLE IF NOT EXISTS case_studies (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      company TEXT,
      role TEXT,
      situation TEXT,
      approach TEXT,
      decisions JSONB DEFAULT '[]',
      metrics JSONB DEFAULT '{}',
      reflections TEXT,
      skills TEXT[] DEFAULT '{}',
      published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_case_studies_slug ON case_studies(slug)`
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_case_studies_published ON case_studies(published) WHERE published = TRUE`
  );

  console.log("case_studies table created.");
}

migrate().catch(console.error);
