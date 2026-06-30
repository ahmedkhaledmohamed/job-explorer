import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const sql = getDb();

  const existing = await sql`SELECT * FROM introductions WHERE id = ${parseInt(id, 10)}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { status, response_message } = body;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (status) {
    setClauses.push(`status = $${idx++}`);
    values.push(status);
    if (status === "viewed" && !existing[0].viewed_at) {
      setClauses.push("viewed_at = NOW()");
    }
    if ((status === "responded" || status === "declined") && !existing[0].responded_at) {
      setClauses.push("responded_at = NOW()");
    }
  }
  if (response_message !== undefined) {
    setClauses.push(`response_message = $${idx++}`);
    values.push(response_message);
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: "No fields" }, { status: 400 });
  }

  values.push(parseInt(id, 10));
  const query = `UPDATE introductions SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`;
  const result = await sql.query(query, values);

  return NextResponse.json(result[0]);
}
