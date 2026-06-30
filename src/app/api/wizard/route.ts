import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const result = await sql`SELECT wizard_progress FROM users WHERE id = ${parseInt(session.user.id)}`;
  return NextResponse.json(result[0]?.wizard_progress || {});
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const sql = getDb();

  await sql`
    UPDATE users SET wizard_progress = ${JSON.stringify(body)}
    WHERE id = ${parseInt(session.user.id)}
  `;

  return NextResponse.json({ saved: true });
}
