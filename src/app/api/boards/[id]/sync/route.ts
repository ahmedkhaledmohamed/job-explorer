import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { syncBoard } from "@/lib/board-sync";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const board = await sql`SELECT * FROM connected_boards WHERE id = ${parseInt(id, 10)}`;
  if (board.length === 0) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const b = board[0];
  const config = (typeof b.config === "string" ? JSON.parse(b.config as string) : b.config) as Record<string, string>;

  try {
    const result = await syncBoard(b.board_type as string, config, sql);

    await sql`
      UPDATE connected_boards SET last_synced = NOW(), job_count = ${result.total}
      WHERE id = ${parseInt(id, 10)}
    `;

    return NextResponse.json({
      ...result,
      board: b.name,
      board_type: b.board_type,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 502 }
    );
  }
}
