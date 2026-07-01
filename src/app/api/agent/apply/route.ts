import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { scrapeApplicationForm } from "@/lib/form-scraper";
import { matchFields } from "@/lib/field-matcher";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const r = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (r[0]?.id as number) || 1;
}

async function updateTask(sql: ReturnType<typeof getDb>, taskId: number, status: string, extra: Record<string, unknown> = {}) {
  const sets = [`status = '${status}'`, "updated_at = NOW()"];
  if (extra.score !== undefined) sets.push(`score = ${extra.score}`);
  if (extra.gaps !== undefined) sets.push(`gaps = '${JSON.stringify(extra.gaps)}'::jsonb`);
  if (extra.result !== undefined) sets.push(`result = '${JSON.stringify(extra.result)}'::jsonb`);
  if (extra.error !== undefined) sets.push(`error = '${String(extra.error)}'`);
  await sql.query(`UPDATE agent_tasks SET ${sets.join(", ")} WHERE id = ${taskId}`);
}

export async function POST(request: NextRequest) {
  const sql = getDb();
  const userId = await getUserId();
  const body = await request.json();
  const { job_id } = body;

  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const job = await sql`SELECT * FROM jobs WHERE id = ${job_id}`;
  if (job.length === 0) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const j = job[0];

  // Create or get agent task
  await sql`
    INSERT INTO agent_tasks (user_id, job_id, status) VALUES (${userId}, ${job_id}, 'queued')
    ON CONFLICT (user_id, job_id) DO UPDATE SET status = 'queued', error = NULL, updated_at = NOW()
  `;
  const taskResult = await sql`SELECT id FROM agent_tasks WHERE user_id = ${userId} AND job_id = ${job_id}`;
  const taskId = taskResult[0].id as number;

  // Step 1: Check if we can scrape the form
  const source = (j.source as string || "").toLowerCase();
  const atsJobId = j.ats_job_id as string;
  const jobUrl = j.url as string;

  if (!atsJobId || !["greenhouse", "lever", "ashby"].includes(source)) {
    await updateTask(sql, taskId, "failed", { error: `Cannot auto-apply: source '${source}' not supported or no ATS job ID` });
    return NextResponse.json({ taskId, status: "failed", error: "ATS not supported for this job" });
  }

  // Step 2: Scrape form
  await updateTask(sql, taskId, "preparing");
  let fields;
  try {
    fields = await scrapeApplicationForm({ source, url: jobUrl, ats_job_id: atsJobId } as never);
  } catch (e) {
    await updateTask(sql, taskId, "failed", { error: `Form scrape failed: ${(e as Error).message}` });
    return NextResponse.json({ taskId, status: "failed", error: "Form scrape failed" });
  }

  // Step 3: Match fields against profile
  const profile = await sql`SELECT * FROM apply_profile WHERE user_id = ${userId} ORDER BY id LIMIT 1`;
  if (profile.length === 0) {
    await updateTask(sql, taskId, "failed", { error: "No profile found" });
    return NextResponse.json({ taskId, status: "failed", error: "No profile" });
  }

  const matched = await matchFields(fields, profile[0] as never, sql);

  // Step 4: Check for gaps
  const gaps = matched
    .filter((f) => f.required && !f.matched)
    .map((f) => ({ field: f.name, label: f.label, required: f.required }));

  // Upsert application_forms
  const ready = gaps.length === 0;
  await sql`
    INSERT INTO application_forms (job_id, fields, ready)
    VALUES (${job_id}, ${JSON.stringify(matched)}, ${ready})
    ON CONFLICT (job_id) DO UPDATE SET fields = ${JSON.stringify(matched)}, ready = ${ready}, scraped_at = NOW()
  `;

  if (gaps.length > 0) {
    await updateTask(sql, taskId, "needs_input", {
      gaps,
      result: { totalFields: matched.length, matchedFields: matched.filter((f) => f.matched).length, missingFields: gaps.length },
    });
    return NextResponse.json({
      taskId,
      status: "needs_input",
      gaps,
      totalFields: matched.length,
      matchedFields: matched.filter((f) => f.matched).length,
    });
  }

  // Step 5: Submit
  await updateTask(sql, taskId, "submitting");

  try {
    const submitModule = await import("@/app/api/jobs/submit/route");
    // Use the submit logic directly — build a mock request
    // For simplicity, call the submit endpoint internally
    const submitRes = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/jobs/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobIds: [job_id] }),
    });

    if (submitRes.ok) {
      const submitData = await submitRes.json();
      const jobResult = submitData.results?.[0];
      if (jobResult?.success) {
        await updateTask(sql, taskId, "submitted", { result: jobResult });
        await sql`
          INSERT INTO user_jobs (user_id, job_id, status, pipeline_stage, applied_at)
          VALUES (${userId}, ${job_id}, 'applied', 'applied', NOW())
          ON CONFLICT (user_id, job_id) DO UPDATE SET status = 'applied', pipeline_stage = 'applied', applied_at = COALESCE(user_jobs.applied_at, NOW())
        `;
        return NextResponse.json({ taskId, status: "submitted", result: jobResult });
      } else {
        await updateTask(sql, taskId, "failed", { error: jobResult?.error || "Submit returned failure", result: jobResult });
        return NextResponse.json({ taskId, status: "failed", error: jobResult?.error });
      }
    } else {
      await updateTask(sql, taskId, "ready", { result: { note: "Form ready but submit endpoint unavailable — queued for manual submit" } });
      return NextResponse.json({ taskId, status: "ready" });
    }
  } catch {
    await updateTask(sql, taskId, "ready", { result: { note: "Form ready — queued for submission" } });
    return NextResponse.json({ taskId, status: "ready" });
  }
}
