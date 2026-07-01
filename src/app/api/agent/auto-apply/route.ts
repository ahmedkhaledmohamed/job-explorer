import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const r = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (r[0]?.id as number) || 1;
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const body = await request.json();

  const settings = await sql`SELECT agent_settings FROM users WHERE id = ${userId}`;
  const agentSettings = (settings[0]?.agent_settings || { threshold: 0.5, max_per_day: 5 }) as { threshold: number; max_per_day: number };

  let jobIds: string[] = body.job_ids || [];

  // If no specific jobs, find top matches above threshold
  if (jobIds.length === 0) {
    const topJobs = await sql`
      SELECT uj.job_id FROM user_jobs uj
      JOIN jobs j ON j.id = uj.job_id
      WHERE uj.user_id = ${userId}
        AND uj.match_score >= ${agentSettings.threshold}
        AND j.ats_job_id IS NOT NULL
        AND LOWER(j.source) IN ('greenhouse', 'lever', 'ashby')
        AND NOT EXISTS (SELECT 1 FROM agent_tasks at WHERE at.user_id = ${userId} AND at.job_id = uj.job_id AND at.status IN ('submitted', 'submitting'))
      ORDER BY uj.match_score DESC
      LIMIT ${agentSettings.max_per_day}
    `;
    jobIds = topJobs.map((r) => r.job_id as string);
  }

  if (jobIds.length === 0) {
    return NextResponse.json({ results: [], message: "No jobs above threshold to apply to" });
  }

  // Trigger apply for each job
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const results = [];

  for (const jobId of jobIds.slice(0, agentSettings.max_per_day)) {
    try {
      const res = await fetch(`${baseUrl}/api/agent/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });
      const data = await res.json();
      results.push({ job_id: jobId, ...data });
    } catch (e) {
      results.push({ job_id: jobId, status: "error", error: (e as Error).message });
    }
  }

  return NextResponse.json({ results, total: results.length });
}
