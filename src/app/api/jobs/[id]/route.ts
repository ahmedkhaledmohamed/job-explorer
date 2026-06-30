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
  const { status, notes } = body;

  const sql = getDb();

  // Check job exists
  const existing = await sql`SELECT * FROM jobs WHERE id = ${id}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (status === undefined && notes === undefined) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  let result;

  if (status !== undefined && notes !== undefined) {
    // Both status and notes
    if (status === "applied" && !existing[0].applied_at) {
      result =
        await sql`UPDATE jobs SET status = ${status}, notes = ${notes}, applied_at = NOW() WHERE id = ${id} RETURNING *`;
    } else {
      result =
        await sql`UPDATE jobs SET status = ${status}, notes = ${notes} WHERE id = ${id} RETURNING *`;
    }
  } else if (status !== undefined) {
    // Only status
    if (status === "applied" && !existing[0].applied_at) {
      result =
        await sql`UPDATE jobs SET status = ${status}, applied_at = NOW() WHERE id = ${id} RETURNING *`;
    } else {
      result =
        await sql`UPDATE jobs SET status = ${status} WHERE id = ${id} RETURNING *`;
    }
  } else {
    // Only notes
    result =
      await sql`UPDATE jobs SET notes = ${notes} WHERE id = ${id} RETURNING *`;
  }

  return NextResponse.json(result[0]);
}
