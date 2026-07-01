import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const r = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (r[0]?.id as number) || 1;
}

export async function GET() {
  const sql = getDb();
  const userId = await getUserId();

  const tasks = await sql`
    SELECT t.*, j.title as job_title, j.company as job_company, j.url as job_url, j.source as job_source
    FROM agent_tasks t JOIN jobs j ON j.id = t.job_id
    WHERE t.user_id = ${userId}
    ORDER BY
      CASE t.status WHEN 'needs_input' THEN 1 WHEN 'queued' THEN 2 WHEN 'scoring' THEN 3
        WHEN 'preparing' THEN 4 WHEN 'ready' THEN 5 WHEN 'submitting' THEN 6
        WHEN 'submitted' THEN 7 WHEN 'failed' THEN 8 END,
      t.updated_at DESC
  `;

  const stats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
      COUNT(*) FILTER (WHERE status = 'needs_input') as needs_input,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status IN ('queued','scoring','preparing','ready','submitting')) as in_progress,
      COUNT(*) as total
    FROM agent_tasks WHERE user_id = ${userId}
  `;

  const settings = await sql`SELECT agent_settings FROM users WHERE id = ${userId}`;
  const agentSettings = settings[0]?.agent_settings || { threshold: 0.5, max_per_day: 5, digest_enabled: false, digest_email: "" };

  return NextResponse.json({ tasks, stats: stats[0], settings: agentSettings });
}
