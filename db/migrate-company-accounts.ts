import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating company_accounts table...");
  await sql`
    CREATE TABLE IF NOT EXISTS company_accounts (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      domain TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_company_accounts_company ON company_accounts(company_id)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_company_accounts_user ON company_accounts(admin_user_id)`);

  console.log("Creating role_context table...");
  await sql`
    CREATE TABLE IF NOT EXISTS role_context (
      id SERIAL PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      success_criteria TEXT,
      first_90_days TEXT,
      team_context TEXT,
      challenges TEXT,
      structured_requirements JSONB DEFAULT '[]',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_role_context_job ON role_context(job_id)`);

  console.log("Creating company_case_studies table...");
  await sql`
    CREATE TABLE IF NOT EXISTS company_case_studies (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      problem TEXT,
      approach TEXT,
      outcome TEXT,
      tech_used TEXT[] DEFAULT '{}',
      created_by INTEGER REFERENCES users(id),
      published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_company_case_studies_company ON company_case_studies(company_id)`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
