import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { randomBytes } from "crypto";

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

  const hooks = await sql`
    SELECT * FROM webhooks WHERE account_type = 'user' AND account_id = ${userId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json(hooks);
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const body = await request.json();
  const { url, events } = body;

  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  const secret = `whsec_${randomBytes(16).toString("hex")}`;
  const validEvents = (events || ["introduction.created", "introduction.updated"]).filter(
    (e: string) => ["introduction.created", "introduction.updated", "match.computed", "job.new"].includes(e)
  );

  const result = await sql`
    INSERT INTO webhooks (account_type, account_id, url, events, secret)
    VALUES ('user', ${userId}, ${url}, ${validEvents}, ${secret})
    RETURNING *
  `;

  return NextResponse.json({ ...result[0], secret }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const { searchParams } = new URL(request.url);
  const hookId = searchParams.get("id");

  if (!hookId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await sql`DELETE FROM webhooks WHERE id = ${parseInt(hookId)} AND account_type = 'user' AND account_id = ${userId}`;
  return NextResponse.json({ deleted: true });
}
