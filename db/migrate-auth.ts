import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Setting up auth tables...\n");

  // 1. Create users table
  console.log("Creating users table...");
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      username TEXT UNIQUE,
      avatar_url TEXT,
      provider TEXT,
      provider_id TEXT,
      invite_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login TIMESTAMPTZ
    )
  `;

  // 2. Create invite_codes table
  console.log("Creating invite_codes table...");
  await sql`
    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      created_by INTEGER REFERENCES users(id),
      used_by INTEGER REFERENCES users(id),
      used_at TIMESTAMPTZ
    )
  `;

  // 3. Seed user #1 from existing profile
  const profile = await sql`SELECT * FROM apply_profile ORDER BY id LIMIT 1`;
  let userId: number;

  const existingUser = await sql`SELECT id FROM users WHERE email = 'ahmed.k.abdelhameed@gmail.com'`;
  if (existingUser.length > 0) {
    userId = existingUser[0].id as number;
    console.log(`User #1 already exists (id=${userId})`);
  } else {
    const email = (profile[0]?.email as string) || "ahmed.k.abdelhameed@gmail.com";
    const name = (profile[0]?.full_name as string) || "Ahmed Khaled Mohamed";
    const result = await sql`
      INSERT INTO users (email, name, username, last_login)
      VALUES (${email}, ${name}, 'ahmed-khaled', NOW())
      RETURNING id
    `;
    userId = result[0].id as number;
    console.log(`Created user #1 (id=${userId})`);
  }

  // 4. Add user_id columns to user-specific tables
  const tables = ["apply_profile", "case_studies", "public_profiles"];
  for (const table of tables) {
    console.log(`Adding user_id to ${table}...`);
    await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
    await sql.query(`UPDATE ${table} SET user_id = ${userId} WHERE user_id IS NULL`);
  }

  // 5. Seed some invite codes
  console.log("Seeding invite codes...");
  const codes = ["EARLY-ACCESS-001", "EARLY-ACCESS-002", "EARLY-ACCESS-003"];
  for (const code of codes) {
    await sql`INSERT INTO invite_codes (code, created_by) VALUES (${code}, ${userId}) ON CONFLICT DO NOTHING`;
  }

  console.log("\nAuth migration complete!");
  console.log(`User #1: id=${userId}, email=ahmed.k.abdelhameed@gmail.com`);
  console.log(`Invite codes: ${codes.join(", ")}`);
}

migrate().catch(console.error);
