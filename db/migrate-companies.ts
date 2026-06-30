import { neon } from "@neondatabase/serverless";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating companies table...");
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      domain TEXT,
      logo_url TEXT,
      description TEXT,
      industry TEXT,
      size_category TEXT,
      culture_signals JSONB DEFAULT '{}',
      tech_stack TEXT[] DEFAULT '{}',
      hiring_velocity JSONB DEFAULT '{}',
      auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)`);

  // Auto-populate from existing job data
  console.log("Populating companies from job data...");
  const companies = await sql`
    SELECT company, COUNT(*) as job_count,
           COUNT(DISTINCT source) as source_count,
           MIN(first_seen) as first_seen,
           MAX(last_seen) as last_seen,
           array_agg(DISTINCT location) FILTER (WHERE location IS NOT NULL) as locations
    FROM jobs
    GROUP BY company
    HAVING COUNT(*) >= 1
    ORDER BY COUNT(*) DESC
  `;

  let inserted = 0;
  for (const c of companies) {
    const name = c.company as string;
    const slug = slugify(name);
    const jobCount = parseInt(c.job_count as string, 10);
    const locations = (c.locations as string[]) || [];

    const velocity = {
      total_jobs: jobCount,
      sources: parseInt(c.source_count as string, 10),
      first_seen: c.first_seen,
      last_seen: c.last_seen,
    };

    const existing = await sql`SELECT id FROM companies WHERE slug = ${slug}`;
    if (existing.length === 0) {
      await sql`
        INSERT INTO companies (name, slug, hiring_velocity, auto_generated)
        VALUES (${name}, ${slug}, ${JSON.stringify(velocity)}, TRUE)
      `;
      inserted++;
    }

    // Suppress unused variable warning
    void locations;
  }

  console.log(`Inserted ${inserted} companies from ${companies.length} unique company names.`);
  console.log("Migration complete.");
}

migrate().catch(console.error);
