import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const result = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return result[0]?.id as number || 1;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const userId = await getUserId();

  const result = await sql`
    SELECT j.*, uj.status AS status, uj.notes, uj.top_match, uj.match_score, uj.match_details,
           uj.applied_at, uj.resume_version, uj.saved_at
    FROM jobs j
    LEFT JOIN user_jobs uj ON uj.job_id = j.id AND uj.user_id = ${userId}
    WHERE j.id = ${id}
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const job = result[0];
  // Default status if no user_jobs row
  if (job.status === null) job.status = "new";
  if (job.top_match === null) job.top_match = false;

  return NextResponse.json(job);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status, notes, top_match, resume_version } = body;

  const sql = getDb();
  const userId = await getUserId();

  // Verify job exists
  const jobExists = await sql`SELECT id FROM jobs WHERE id = ${id}`;
  if (jobExists.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Ensure user_jobs row exists
  await sql`
    INSERT INTO user_jobs (user_id, job_id) VALUES (${userId}, ${id})
    ON CONFLICT DO NOTHING
  `;

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    values.push(status);
    if (status === "applied") {
      setClauses.push("applied_at = COALESCE(applied_at, NOW())");
    }
    if (status === "saved") {
      setClauses.push("saved_at = COALESCE(saved_at, NOW())");
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
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  values.push(userId, id);
  const query = `UPDATE user_jobs SET ${setClauses.join(", ")} WHERE user_id = $${paramIdx} AND job_id = $${paramIdx + 1}`;
  await sql.query(query, values);

  // Return the merged job + user_jobs data
  const result = await sql`
    SELECT j.*, uj.status AS status, uj.notes, uj.top_match, uj.match_score, uj.match_details,
           uj.applied_at, uj.resume_version, uj.saved_at
    FROM jobs j
    LEFT JOIN user_jobs uj ON uj.job_id = j.id AND uj.user_id = ${userId}
    WHERE j.id = ${id}
  `;

  const job = result[0];
  if (job.status === null) job.status = "new";
  if (job.top_match === null) job.top_match = false;

  return NextResponse.json(job);
}
