import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function learnFromOutcome(introId: number) {
  const sql = getDb();

  const intro = await sql`
    SELECT i.*, j.company, j.source, j.title
    FROM introductions i
    LEFT JOIN jobs j ON j.id = i.job_id
    WHERE i.id = ${introId}
  `;
  if (intro.length === 0) return;

  const row = intro[0];
  const isPositive = ["interview", "offer", "hired"].includes(row.outcome as string);

  // Get candidate's skills/profile for signal extraction
  const profile = await sql`SELECT current_title, years_of_experience FROM apply_profile WHERE user_id = ${row.candidate_id} ORDER BY id LIMIT 1`;
  const caseStudies = await sql`SELECT skills FROM case_studies WHERE user_id = ${row.candidate_id} AND published = TRUE`;

  const signals: Array<{ type: string; key: string; value: string }> = [];

  // Company signal
  if (row.company) signals.push({ type: "company", key: "name", value: row.company as string });
  // Source signal
  if (row.source) signals.push({ type: "source", key: "name", value: row.source as string });
  // Seniority from title
  if (profile[0]?.current_title) {
    const title = (profile[0].current_title as string).toLowerCase();
    if (title.includes("senior")) signals.push({ type: "seniority", key: "level", value: "senior" });
    if (title.includes("staff")) signals.push({ type: "seniority", key: "level", value: "staff" });
    if (title.includes("director")) signals.push({ type: "seniority", key: "level", value: "director" });
  }
  // Skills from case studies
  for (const cs of caseStudies) {
    for (const skill of (cs.skills as string[]) || []) {
      signals.push({ type: "skill", key: "name", value: skill });
    }
  }

  // Upsert signals
  for (const s of signals) {
    if (isPositive) {
      await sql`
        INSERT INTO match_signals (signal_type, signal_key, signal_value, positive_count, weight, computed_at)
        VALUES (${s.type}, ${s.key}, ${s.value}, 1, 1.0, NOW())
        ON CONFLICT (signal_type, signal_key, signal_value) DO UPDATE SET
          positive_count = match_signals.positive_count + 1,
          weight = CASE
            WHEN (match_signals.positive_count + match_signals.negative_count + 1) > 0
            THEN (match_signals.positive_count + 1)::float / (match_signals.positive_count + match_signals.negative_count + 1)::float
            ELSE 1.0
          END,
          computed_at = NOW()
      `;
    } else {
      await sql`
        INSERT INTO match_signals (signal_type, signal_key, signal_value, negative_count, weight, computed_at)
        VALUES (${s.type}, ${s.key}, ${s.value}, 1, 0.0, NOW())
        ON CONFLICT (signal_type, signal_key, signal_value) DO UPDATE SET
          negative_count = match_signals.negative_count + 1,
          weight = CASE
            WHEN (match_signals.positive_count + match_signals.negative_count + 1) > 0
            THEN match_signals.positive_count::float / (match_signals.positive_count + match_signals.negative_count + 1)::float
            ELSE 0.0
          END,
          computed_at = NOW()
      `;
    }
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const sql = getDb();
  const introId = parseInt(id, 10);

  const existing = await sql`SELECT * FROM introductions WHERE id = ${introId}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { status, response_message, outcome } = body;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (status) {
    setClauses.push(`status = $${idx++}`);
    values.push(status);
    if (status === "viewed" && !existing[0].viewed_at) {
      setClauses.push("viewed_at = NOW()");
    }
    if ((status === "responded" || status === "declined") && !existing[0].responded_at) {
      setClauses.push("responded_at = NOW()");
    }
  }
  if (response_message !== undefined) {
    setClauses.push(`response_message = $${idx++}`);
    values.push(response_message);
  }
  if (outcome !== undefined) {
    setClauses.push(`outcome = $${idx++}`);
    values.push(outcome);
    setClauses.push("outcome_at = NOW()");
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: "No fields" }, { status: 400 });
  }

  values.push(introId);
  const query = `UPDATE introductions SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`;
  const result = await sql.query(query, values);

  // Learn from outcome if one was set
  if (outcome) {
    await learnFromOutcome(introId);
  }

  return NextResponse.json(result[0]);
}
