import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating public_profiles table...");

  await sql`
    CREATE TABLE IF NOT EXISTS public_profiles (
      username TEXT PRIMARY KEY,
      profile_id INTEGER REFERENCES apply_profile(id),
      headline TEXT,
      summary TEXT,
      experience JSONB DEFAULT '[]',
      skills JSONB DEFAULT '[]',
      theme TEXT DEFAULT 'default',
      is_public BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Seed from existing profile if one exists
  const profile = await sql`SELECT * FROM apply_profile ORDER BY id LIMIT 1`;
  if (profile.length > 0) {
    const p = profile[0];
    const username = "ahmed-khaled";
    const headline = [p.current_title, p.current_company]
      .filter(Boolean)
      .join(" at ") || "Product & Engineering Leader";

    const existing = await sql`SELECT username FROM public_profiles WHERE username = ${username}`;
    if (existing.length === 0) {
      await sql`
        INSERT INTO public_profiles (username, profile_id, headline, summary, experience, skills, is_public)
        VALUES (
          ${username},
          ${p.id},
          ${headline},
          ${"Product leader with engineering depth. 12 years across engineering, management, and product. MSc Computer Science."},
          ${"[]"},
          ${"[]"},
          TRUE
        )
      `;
      console.log(`Seeded public profile: /p/${username}`);
    }
  }

  console.log("Migration complete.");
}

migrate().catch(console.error);
