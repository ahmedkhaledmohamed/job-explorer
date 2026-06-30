import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Adding outcome fields to introductions...");
  await sql`ALTER TABLE introductions ADD COLUMN IF NOT EXISTS outcome TEXT`;
  await sql`ALTER TABLE introductions ADD COLUMN IF NOT EXISTS outcome_at TIMESTAMPTZ`;

  console.log("Creating match_signals table...");
  await sql`
    CREATE TABLE IF NOT EXISTS match_signals (
      id SERIAL PRIMARY KEY,
      signal_type TEXT NOT NULL,
      signal_key TEXT NOT NULL,
      signal_value TEXT NOT NULL,
      weight FLOAT NOT NULL DEFAULT 1.0,
      positive_count INTEGER NOT NULL DEFAULT 0,
      negative_count INTEGER NOT NULL DEFAULT 0,
      computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(signal_type, signal_key, signal_value)
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_match_signals_type ON match_signals(signal_type)`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
