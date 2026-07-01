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

  const boards = await sql`
    SELECT * FROM connected_boards WHERE user_id = ${userId} ORDER BY created_at DESC
  `;

  return NextResponse.json(boards);
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const body = await request.json();
  const { name, board_type, config } = body;

  if (!name || !board_type) {
    return NextResponse.json({ error: "name and board_type required" }, { status: 400 });
  }

  const validTypes = ["greenhouse", "lever", "ashby", "linkedin", "custom"];
  if (!validTypes.includes(board_type)) {
    return NextResponse.json({ error: `board_type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO connected_boards (user_id, name, board_type, config)
    VALUES (${userId}, ${name}, ${board_type}, ${JSON.stringify(config || {})})
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("id");

  if (!boardId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await sql`DELETE FROM connected_boards WHERE id = ${parseInt(boardId)} AND user_id = ${userId}`;
  return NextResponse.json({ deleted: true });
}
