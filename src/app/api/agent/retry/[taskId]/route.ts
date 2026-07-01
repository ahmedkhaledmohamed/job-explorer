import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { matchFields } from "@/lib/field-matcher";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const sql = getDb();
  const id = parseInt(taskId, 10);

  const task = await sql`SELECT * FROM agent_tasks WHERE id = ${id}`;
  if (task.length === 0) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const t = task[0];
  if (t.status !== "needs_input") {
    return NextResponse.json({ error: `Task is '${t.status}', not 'needs_input'` }, { status: 400 });
  }

  // Re-match fields with updated profile
  const form = await sql`SELECT fields FROM application_forms WHERE job_id = ${t.job_id}`;
  if (form.length === 0) return NextResponse.json({ error: "No form found" }, { status: 400 });

  const fields = typeof form[0].fields === "string" ? JSON.parse(form[0].fields as string) : form[0].fields;
  const profile = await sql`SELECT * FROM apply_profile WHERE user_id = ${t.user_id} ORDER BY id LIMIT 1`;

  const matched = await matchFields(fields as never[], profile[0] as never, sql);
  const gaps = matched.filter((f) => f.required && !f.matched).map((f) => ({ field: f.name, label: f.label, required: f.required }));
  const ready = gaps.length === 0;

  await sql`UPDATE application_forms SET fields = ${JSON.stringify(matched)}, ready = ${ready} WHERE job_id = ${t.job_id}`;

  if (gaps.length > 0) {
    await sql`UPDATE agent_tasks SET gaps = ${JSON.stringify(gaps)}, updated_at = NOW() WHERE id = ${id}`;
    return NextResponse.json({ status: "needs_input", gaps, remaining: gaps.length });
  }

  await sql`UPDATE agent_tasks SET status = 'ready', gaps = '[]'::jsonb, updated_at = NOW() WHERE id = ${id}`;
  return NextResponse.json({ status: "ready", message: "All gaps resolved — ready for submission" });
}
