import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Running job-explorer evolution migration...\n");

  // Phase 1: top_match boolean flag
  console.log("Phase 1: Adding top_match column to jobs...");
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS top_match BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_jobs_top_match ON jobs(top_match) WHERE top_match = TRUE`
  );
  const migrated =
    await sql`UPDATE jobs SET top_match = TRUE, status = 'new' WHERE status = 'top_match' RETURNING id, title, company`;
  if (migrated.length > 0) {
    console.log(`  Migrated ${migrated.length} jobs from status=top_match to top_match=true:`);
    for (const j of migrated) {
      console.log(`    - ${j.title} @ ${j.company}`);
    }
  } else {
    console.log("  No existing top_match status jobs to migrate.");
  }

  // Phase 2: Expanded profile columns
  console.log("\nPhase 2: Expanding apply_profile...");
  const profileColumns = [
    "first_name TEXT",
    "last_name TEXT",
    "pronouns TEXT",
    "location_city TEXT",
    "location_state TEXT",
    "location_country TEXT",
    "current_company TEXT",
    "current_title TEXT",
    "github_url TEXT",
    "portfolio_url TEXT",
    "personal_website TEXT",
    "visa_sponsorship_needed BOOLEAN DEFAULT FALSE",
    "citizenship TEXT",
    "desired_salary_min INTEGER",
    "desired_salary_max INTEGER",
    "salary_currency TEXT DEFAULT 'CAD'",
    "notice_period TEXT",
    "earliest_start_date DATE",
    "willing_to_relocate BOOLEAN DEFAULT FALSE",
    "preferred_locations TEXT",
    "years_of_experience INTEGER",
    "highest_education TEXT",
    "university TEXT",
    "degree TEXT",
    "field_of_study TEXT",
    "graduation_year INTEGER",
    "gender TEXT DEFAULT 'Decline to self-identify'",
    "race_ethnicity TEXT DEFAULT 'Decline to self-identify'",
    "veteran_status TEXT DEFAULT 'I am not a protected veteran'",
    "disability_status TEXT DEFAULT 'Prefer not to say'",
    "pm_resume_md TEXT",
    "em_resume_md TEXT",
    "how_did_you_hear TEXT DEFAULT 'Company website'",
  ];

  for (const col of profileColumns) {
    const colName = col.split(" ")[0];
    await sql.query(
      `ALTER TABLE apply_profile ADD COLUMN IF NOT EXISTS ${col}`
    );
    console.log(`  + ${colName}`);
  }

  // Backfill first_name/last_name from full_name
  await sql`
    UPDATE apply_profile SET
      first_name = SPLIT_PART(full_name, ' ', 1),
      last_name = SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    WHERE first_name IS NULL AND full_name IS NOT NULL
  `;
  console.log("  Backfilled first_name/last_name from full_name.");

  // Phase 4: job_materials table
  console.log("\nPhase 4: Creating job_materials table...");
  await sql`
    CREATE TABLE IF NOT EXISTS job_materials (
      id SERIAL PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      resume_variant TEXT NOT NULL,
      tailored_resume TEXT,
      cover_letter TEXT,
      generation_model TEXT,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(job_id, resume_variant)
    )
  `;
  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id)`
  );
  console.log("  Created job_materials table.");

  console.log("\nMigration complete!");
}

migrate().catch(console.error);
