import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating api_keys table...");
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      account_type TEXT NOT NULL,
      account_id INTEGER NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      permissions TEXT[] DEFAULT '{}',
      last_used TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix)`);

  console.log("Creating webhooks table...");
  await sql`
    CREATE TABLE IF NOT EXISTS webhooks (
      id SERIAL PRIMARY KEY,
      account_type TEXT NOT NULL,
      account_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      events TEXT[] DEFAULT '{}',
      secret TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_webhooks_account ON webhooks(account_type, account_id)`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
