import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const result = await sql`SELECT * FROM case_studies WHERE id = ${parseInt(id, 10)}`;
  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const sql = getDb();

  const existing = await sql`SELECT id FROM case_studies WHERE id = ${parseInt(id, 10)}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  const fields = ["title", "company", "role", "situation", "approach", "reflections", "published"] as const;
  for (const field of fields) {
    if (body[field] !== undefined) {
      setClauses.push(`${field} = $${paramIdx++}`);
      values.push(body[field] === "" ? null : body[field]);
    }
  }

  if (body.decisions !== undefined) {
    setClauses.push(`decisions = $${paramIdx++}`);
    values.push(JSON.stringify(body.decisions));
  }
  if (body.metrics !== undefined) {
    setClauses.push(`metrics = $${paramIdx++}`);
    values.push(JSON.stringify(body.metrics));
  }
  if (body.skills !== undefined) {
    setClauses.push(`skills = $${paramIdx++}`);
    values.push(body.skills);
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  setClauses.push("updated_at = NOW()");
  values.push(parseInt(id, 10));
  const query = `UPDATE case_studies SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`;
  const result = await sql.query(query, values);

  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  await sql`DELETE FROM case_studies WHERE id = ${parseInt(id, 10)}`;
  return NextResponse.json({ deleted: true });
}
