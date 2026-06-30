import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating subscriptions table...");
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      account_type TEXT NOT NULL,
      account_id INTEGER NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      current_period_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON subscriptions(account_type, account_id)`);

  // Seed free subscriptions for existing users
  const users = await sql`SELECT id FROM users`;
  for (const u of users) {
    const existing = await sql`SELECT id FROM subscriptions WHERE account_type = 'user' AND account_id = ${u.id}`;
    if (existing.length === 0) {
      await sql`INSERT INTO subscriptions (account_type, account_id, plan) VALUES ('user', ${u.id}, 'free')`;
    }
  }
  console.log(`Seeded free subscriptions for ${users.length} users.`);

  console.log("Migration complete.");
}

migrate().catch(console.error);
