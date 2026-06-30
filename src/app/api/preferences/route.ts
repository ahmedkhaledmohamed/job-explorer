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

  const result = await sql`SELECT * FROM candidate_preferences WHERE user_id = ${userId}`;
  if (result.length === 0) return NextResponse.json(null);
  return NextResponse.json(result[0]);
}

export async function PUT(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const body = await request.json();

  const { work_style, team_preferences, growth_priorities, deal_breakers, values } = body;

  const existing = await sql`SELECT user_id FROM candidate_preferences WHERE user_id = ${userId}`;

  let result;
  if (existing.length > 0) {
    result = await sql`
      UPDATE candidate_preferences SET
        work_style = ${JSON.stringify(work_style || {})},
        team_preferences = ${JSON.stringify(team_preferences || {})},
        growth_priorities = ${growth_priorities || []},
        deal_breakers = ${deal_breakers || []},
        values = ${values || []},
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING *
    `;
  } else {
    result = await sql`
      INSERT INTO candidate_preferences (user_id, work_style, team_preferences, growth_priorities, deal_breakers, values)
      VALUES (${userId}, ${JSON.stringify(work_style || {})}, ${JSON.stringify(team_preferences || {})}, ${growth_priorities || []}, ${deal_breakers || []}, ${values || []})
      RETURNING *
    `;
  }

  return NextResponse.json(result[0]);
}
