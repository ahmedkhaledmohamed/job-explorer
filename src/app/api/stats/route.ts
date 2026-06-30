import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();

  // Total jobs
  const totalResult = await sql`SELECT COUNT(*) as count FROM jobs`;
  const total = parseInt(totalResult[0]?.count || "0", 10);

  // New this week
  const newThisWeekResult = await sql`
    SELECT COUNT(*) as count FROM jobs
    WHERE first_seen >= NOW() - INTERVAL '7 days'
  `;
  const newThisWeek = parseInt(newThisWeekResult[0]?.count || "0", 10);

  // Applied count
  const appliedResult = await sql`
    SELECT COUNT(*) as count FROM jobs WHERE status = 'applied'
  `;
  const applied = parseInt(appliedResult[0]?.count || "0", 10);

  // Companies tracked
  const companiesResult = await sql`
    SELECT COUNT(DISTINCT company) as count FROM jobs
  `;
  const companiesTracked = parseInt(companiesResult[0]?.count || "0", 10);

  // Jobs by status
  const statusResult = await sql`
    SELECT status, COUNT(*) as count FROM jobs GROUP BY status ORDER BY count DESC
  `;
  const byStatus: Record<string, number> = {};
  for (const row of statusResult) {
    byStatus[row.status] = parseInt(row.count, 10);
  }

  // Jobs by source
  const sourceResult = await sql`
    SELECT COALESCE(source, 'unknown') as source, COUNT(*) as count
    FROM jobs GROUP BY source ORDER BY count DESC
  `;
  const bySource: Record<string, number> = {};
  for (const row of sourceResult) {
    bySource[row.source] = parseInt(row.count, 10);
  }

  // Top 10 companies
  const topCompaniesResult = await sql`
    SELECT company, COUNT(*) as count FROM jobs
    GROUP BY company ORDER BY count DESC LIMIT 10
  `;
  const topCompanies = topCompaniesResult.map((row) => ({
    company: row.company,
    count: parseInt(row.count, 10),
  }));

  // Jobs per week (last 8 weeks)
  const jobsPerWeekResult = await sql`
    SELECT
      DATE_TRUNC('week', first_seen)::date as week,
      COUNT(*) as count
    FROM jobs
    WHERE first_seen >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', first_seen)
    ORDER BY week ASC
  `;
  const jobsPerWeek = jobsPerWeekResult.map((row) => ({
    week: row.week,
    count: parseInt(row.count, 10),
  }));

  // Recent 5 jobs
  const recentResult = await sql`
    SELECT * FROM jobs ORDER BY first_seen DESC LIMIT 5
  `;

  return NextResponse.json({
    total,
    newThisWeek,
    applied,
    companiesTracked,
    byStatus,
    bySource,
    topCompanies,
    jobsPerWeek,
    recentJobs: recentResult,
  });
}
