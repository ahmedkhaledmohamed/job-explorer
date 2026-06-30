import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const result = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (result[0]?.id as number) || 1;
}

export async function GET() {
  const sql = getDb();
  const userId = await getUserId();

  const sub = await sql`
    SELECT * FROM subscriptions WHERE account_type = 'user' AND account_id = ${userId}
    ORDER BY created_at DESC LIMIT 1
  `;

  if (sub.length === 0) {
    return NextResponse.json({ plan: "free", status: "active", subscription: null });
  }

  return NextResponse.json({
    plan: sub[0].plan,
    status: sub[0].status,
    subscription: sub[0],
  });
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const body = await request.json();
  const { plan } = body;

  if (!["free", "pro"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // For Stripe integration: if STRIPE_SECRET_KEY is set, create checkout session
  // For now, directly update the subscription
  const existing = await sql`
    SELECT id FROM subscriptions WHERE account_type = 'user' AND account_id = ${userId}
  `;

  if (existing.length > 0) {
    const result = await sql`
      UPDATE subscriptions SET plan = ${plan}, status = 'active', updated_at = NOW()
      WHERE account_type = 'user' AND account_id = ${userId}
      RETURNING *
    `;
    return NextResponse.json(result[0]);
  } else {
    const result = await sql`
      INSERT INTO subscriptions (account_type, account_id, plan)
      VALUES ('user', ${userId}, ${plan})
      RETURNING *
    `;
    return NextResponse.json(result[0]);
  }
}
