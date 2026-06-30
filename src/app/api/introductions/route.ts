import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

const WEEKLY_LIMIT = 3;

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

  const sent = await sql`
    SELECT i.*, j.title as job_title, j.company as job_company, c.name as company_name, c.slug as company_slug
    FROM introductions i
    LEFT JOIN jobs j ON j.id = i.job_id
    LEFT JOIN companies c ON c.id = i.company_id
    WHERE i.candidate_id = ${userId}
    ORDER BY i.created_at DESC
  `;

  // Rate limit info
  const weekCount = await sql`
    SELECT COUNT(*) as count FROM introductions
    WHERE candidate_id = ${userId} AND initiated_by = 'candidate'
      AND created_at >= NOW() - INTERVAL '7 days'
  `;
  const usedThisWeek = parseInt(weekCount[0]?.count as string || "0", 10);

  return NextResponse.json({
    introductions: sent,
    rateLimit: { used: usedThisWeek, limit: WEEKLY_LIMIT, remaining: Math.max(0, WEEKLY_LIMIT - usedThisWeek) },
  });
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const body = await request.json();
  const { job_id, message } = body;

  if (!job_id) {
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
  }

  // Rate limit check
  const weekCount = await sql`
    SELECT COUNT(*) as count FROM introductions
    WHERE candidate_id = ${userId} AND initiated_by = 'candidate'
      AND created_at >= NOW() - INTERVAL '7 days'
  `;
  const usedThisWeek = parseInt(weekCount[0]?.count as string || "0", 10);
  if (usedThisWeek >= WEEKLY_LIMIT) {
    return NextResponse.json(
      { error: `Weekly limit reached (${WEEKLY_LIMIT}/week). Resets in ${7 - new Date().getDay()} days.` },
      { status: 429 }
    );
  }

  // Get job and company
  const job = await sql`SELECT * FROM jobs WHERE id = ${job_id}`;
  if (job.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const company = await sql`SELECT id FROM companies WHERE LOWER(name) = LOWER(${job[0].company as string})`;
  if (company.length === 0) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Check for existing introduction to same job
  const existing = await sql`
    SELECT id FROM introductions WHERE candidate_id = ${userId} AND job_id = ${job_id}
  `;
  if (existing.length > 0) {
    return NextResponse.json({ error: "Already expressed interest in this job" }, { status: 409 });
  }

  // Get match score and fit narrative if available
  const userJob = await sql`SELECT match_score FROM user_jobs WHERE user_id = ${userId} AND job_id = ${job_id}`;
  const matchScore = userJob[0]?.match_score as number | null;

  const fitNarrative = await sql`SELECT id FROM fit_narratives WHERE job_id = ${job_id} AND published = TRUE ORDER BY created_at DESC LIMIT 1`;
  const fitNarrativeId = fitNarrative.length > 0 ? fitNarrative[0].id as number : null;

  const result = await sql`
    INSERT INTO introductions (candidate_id, company_id, job_id, initiated_by, match_score, fit_narrative_id, message)
    VALUES (${userId}, ${company[0].id}, ${job_id}, 'candidate', ${matchScore}, ${fitNarrativeId}, ${message || null})
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}
