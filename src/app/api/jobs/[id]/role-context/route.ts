import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const result = await sql`SELECT * FROM role_context WHERE job_id = ${id} LIMIT 1`;
  if (result.length === 0) return NextResponse.json(null);
  return NextResponse.json(result[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const sql = getDb();
  const userId = parseInt(session.user.id);

  const job = await sql`SELECT id, company FROM jobs WHERE id = ${id}`;
  if (job.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Find company_id
  const company = await sql`SELECT id FROM companies WHERE LOWER(name) = LOWER(${job[0].company as string})`;
  const companyId = company.length > 0 ? company[0].id as number : null;

  const { success_criteria, first_90_days, team_context, challenges, structured_requirements } = body;

  const existing = await sql`SELECT id FROM role_context WHERE job_id = ${id}`;

  let result;
  if (existing.length > 0) {
    result = await sql`
      UPDATE role_context SET
        success_criteria = ${success_criteria || null},
        first_90_days = ${first_90_days || null},
        team_context = ${team_context || null},
        challenges = ${challenges || null},
        structured_requirements = ${JSON.stringify(structured_requirements || [])},
        updated_at = NOW()
      WHERE job_id = ${id}
      RETURNING *
    `;
  } else {
    result = await sql`
      INSERT INTO role_context (job_id, company_id, success_criteria, first_90_days, team_context, challenges, structured_requirements, created_by)
      VALUES (${id}, ${companyId}, ${success_criteria || null}, ${first_90_days || null}, ${team_context || null}, ${challenges || null}, ${JSON.stringify(structured_requirements || [])}, ${userId})
      RETURNING *
    `;
  }

  return NextResponse.json(result[0]);
}
