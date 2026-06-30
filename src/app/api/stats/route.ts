import { NextResponse } from "next/server";
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

  const totalResult = await sql`SELECT COUNT(*) as count FROM jobs`;
  const total = parseInt(totalResult[0]?.count || "0", 10);

  const newThisWeekResult = await sql`
    SELECT COUNT(*) as count FROM jobs WHERE first_seen >= NOW() - INTERVAL '7 days'
  `;
  const newThisWeek = parseInt(newThisWeekResult[0]?.count || "0", 10);

  const appliedResult = await sql`
    SELECT COUNT(*) as count FROM user_jobs WHERE user_id = ${userId} AND status = 'applied'
  `;
  const applied = parseInt(appliedResult[0]?.count || "0", 10);

  const topMatchResult = await sql`
    SELECT COUNT(*) as count FROM user_jobs WHERE user_id = ${userId} AND top_match = TRUE
  `;
  const topMatches = parseInt(topMatchResult[0]?.count || "0", 10);

  const companiesResult = await sql`SELECT COUNT(DISTINCT company) as count FROM jobs`;
  const companiesTracked = parseInt(companiesResult[0]?.count || "0", 10);

  const statusResult = await sql`
    SELECT COALESCE(uj.status, 'new') as status, COUNT(*) as count
    FROM jobs j LEFT JOIN user_jobs uj ON uj.job_id = j.id AND uj.user_id = ${userId}
    GROUP BY COALESCE(uj.status, 'new') ORDER BY count DESC
  `;
  const byStatus: Record<string, number> = {};
  for (const row of statusResult) {
    byStatus[row.status as string] = parseInt(row.count as string, 10);
  }

  const sourceResult = await sql`
    SELECT COALESCE(source, 'unknown') as source, COUNT(*) as count
    FROM jobs GROUP BY source ORDER BY count DESC
  `;
  const bySource: Record<string, number> = {};
  for (const row of sourceResult) {
    bySource[row.source as string] = parseInt(row.count as string, 10);
  }

  const topCompaniesResult = await sql`
    SELECT company, COUNT(*) as count FROM jobs GROUP BY company ORDER BY count DESC LIMIT 10
  `;
  const topCompanies = topCompaniesResult.map((row) => ({
    company: row.company as string,
    count: parseInt(row.count as string, 10),
  }));

  const jobsPerWeekResult = await sql`
    SELECT DATE_TRUNC('week', first_seen)::date as week, COUNT(*) as count
    FROM jobs WHERE first_seen >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', first_seen) ORDER BY week ASC
  `;
  const jobsPerWeek = jobsPerWeekResult.map((row) => ({
    week: row.week as string,
    count: parseInt(row.count as string, 10),
  }));

  // Top matches for this user
  const topMatchJobsResult = await sql`
    SELECT j.id, j.title, j.company, j.source, j.first_seen, uj.match_score
    FROM user_jobs uj JOIN jobs j ON j.id = uj.job_id
    WHERE uj.user_id = ${userId} AND uj.match_score IS NOT NULL
    ORDER BY uj.match_score DESC LIMIT 5
  `;

  const recentResult = await sql`SELECT * FROM jobs ORDER BY first_seen DESC LIMIT 5`;

  return NextResponse.json({
    total,
    newThisWeek,
    applied,
    companiesTracked,
    topMatches,
    byStatus,
    bySource,
    topCompanies,
    jobsPerWeek,
    recentJobs: recentResult,
    topMatchJobs: topMatchJobsResult,
  });
}
