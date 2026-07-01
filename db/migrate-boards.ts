import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating connected_boards table...");
  await sql`
    CREATE TABLE IF NOT EXISTS connected_boards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      board_type TEXT NOT NULL,
      config JSONB DEFAULT '{}',
      last_synced TIMESTAMPTZ,
      job_count INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_connected_boards_user ON connected_boards(user_id)`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
