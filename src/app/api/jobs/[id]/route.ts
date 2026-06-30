import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const result = await sql`SELECT * FROM jobs WHERE id = ${id}`;

  if (result.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status, notes, top_match, resume_version } = body;

  const sql = getDb();

  const existing = await sql`SELECT * FROM jobs WHERE id = ${id}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    values.push(status);
    if (status === "applied" && !existing[0].applied_at) {
      setClauses.push("applied_at = NOW()");
    }
  }
  if (notes !== undefined) {
    setClauses.push(`notes = $${paramIdx++}`);
    values.push(notes);
  }
  if (top_match !== undefined) {
    setClauses.push(`top_match = $${paramIdx++}`);
    values.push(top_match);
  }
  if (resume_version !== undefined) {
    setClauses.push(`resume_version = $${paramIdx++}`);
    values.push(resume_version);
  }

  if (setClauses.length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  values.push(id);
  const query = `UPDATE jobs SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`;
  const result = await sql.query(query, values);

  return NextResponse.json(result[0]);
}
