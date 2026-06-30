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

const STAGES = ["discovered", "saved", "applied", "screen", "interview", "offer", "accepted", "rejected"];

export async function GET() {
  const sql = getDb();
  const userId = await getUserId();

  // Jobs by pipeline stage
  const stageResult = await sql`
    SELECT COALESCE(uj.pipeline_stage, 'discovered') as stage, COUNT(*) as count
    FROM jobs j LEFT JOIN user_jobs uj ON uj.job_id = j.id AND uj.user_id = ${userId}
    WHERE uj.user_id = ${userId} OR uj.user_id IS NULL
    GROUP BY COALESCE(uj.pipeline_stage, 'discovered')
  `;
  const byStage: Record<string, number> = {};
  for (const s of STAGES) byStage[s] = 0;
  for (const row of stageResult) {
    byStage[row.stage as string] = parseInt(row.count as string, 10);
  }

  // Jobs in active pipeline (not discovered/rejected)
  const activeJobs = await sql`
    SELECT j.id, j.title, j.company, j.location, j.source,
           uj.pipeline_stage, uj.match_score, uj.applied_at, uj.notes,
           uj.pipeline_history, uj.outcome
    FROM user_jobs uj JOIN jobs j ON j.id = uj.job_id
    WHERE uj.user_id = ${userId}
      AND uj.pipeline_stage NOT IN ('discovered', 'rejected')
    ORDER BY
      CASE uj.pipeline_stage
        WHEN 'offer' THEN 1 WHEN 'interview' THEN 2 WHEN 'screen' THEN 3
        WHEN 'applied' THEN 4 WHEN 'saved' THEN 5 ELSE 6
      END,
      uj.applied_at DESC NULLS LAST
  `;

  // Analytics: response rate (applied -> any further stage)
  const appliedCount = await sql`
    SELECT COUNT(*) as count FROM user_jobs
    WHERE user_id = ${userId} AND pipeline_stage IN ('applied', 'screen', 'interview', 'offer', 'accepted', 'rejected')
  `;
  const respondedCount = await sql`
    SELECT COUNT(*) as count FROM user_jobs
    WHERE user_id = ${userId} AND pipeline_stage IN ('screen', 'interview', 'offer', 'accepted', 'rejected')
  `;
  const totalApplied = parseInt(appliedCount[0]?.count as string || "0", 10);
  const totalResponded = parseInt(respondedCount[0]?.count as string || "0", 10);
  const responseRate = totalApplied > 0 ? Math.round((totalResponded / totalApplied) * 100) : 0;

  // Top sources by conversion
  const sourceConversion = await sql`
    SELECT j.source,
           COUNT(*) FILTER (WHERE uj.pipeline_stage IN ('applied','screen','interview','offer','accepted','rejected')) as applied,
           COUNT(*) FILTER (WHERE uj.pipeline_stage IN ('screen','interview','offer','accepted')) as advanced
    FROM user_jobs uj JOIN jobs j ON j.id = uj.job_id
    WHERE uj.user_id = ${userId} AND j.source IS NOT NULL
    GROUP BY j.source
    HAVING COUNT(*) FILTER (WHERE uj.pipeline_stage IN ('applied','screen','interview','offer','accepted','rejected')) > 0
    ORDER BY applied DESC
    LIMIT 5
  `;

  return NextResponse.json({
    stages: STAGES,
    byStage,
    activeJobs,
    analytics: {
      totalApplied,
      totalResponded,
      responseRate,
      sourceConversion,
    },
  });
}
