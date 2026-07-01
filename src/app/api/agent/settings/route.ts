import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const r = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (r[0]?.id as number) || 1;
}

export async function PUT(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const body = await request.json();

  await sql`UPDATE users SET agent_settings = ${JSON.stringify(body)} WHERE id = ${userId}`;
  return NextResponse.json({ saved: true });
}
