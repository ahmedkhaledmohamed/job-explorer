import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generate } from "@/lib/ai";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const result = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (result[0]?.id as number) || 1;
}

const SYSTEM_PROMPT = `You are a bilateral job-candidate matching expert. Given a candidate's profile, preferences, and case studies alongside a job's requirements and company context, compute a mutual match.

Evaluate TWO directions:
1. Candidate→Job: How well does the candidate fit what the job needs?
2. Job→Candidate: How well does the job fit what the candidate wants?

For each direction, consider skills, experience, work style, growth priorities, and deal breakers.

Return a JSON object:
{
  "candidate_to_job": {
    "score": 0.0-1.0,
    "strengths": ["array of 2-3 strong fit reasons"],
    "gaps": ["array of 0-2 potential concerns"]
  },
  "job_to_candidate": {
    "score": 0.0-1.0,
    "strengths": ["array of 2-3 reasons this job fits the candidate's goals"],
    "concerns": ["array of 0-2 reasons it might not be ideal"]
  },
  "overall_score": 0.0-1.0,
  "summary": "2-sentence bilateral fit summary"
}`;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const userId = await getUserId();

  const job = await sql`SELECT * FROM jobs WHERE id = ${id}`;
  if (job.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const profile = await sql`SELECT * FROM apply_profile WHERE user_id = ${userId} ORDER BY id LIMIT 1`;
  const prefs = await sql`SELECT * FROM candidate_preferences WHERE user_id = ${userId}`;
  const caseStudies = await sql`SELECT title, company, role, skills FROM case_studies WHERE user_id = ${userId} AND published = TRUE`;
  const requirements = await sql`SELECT requirement, category, type FROM job_requirements WHERE job_id = ${id}`;

  // Company preferences if available
  const companyName = job[0].company as string;
  const company = await sql`SELECT id FROM companies WHERE LOWER(name) = LOWER(${companyName})`;
  let companyPrefs = null;
  if (company.length > 0) {
    const cp = await sql`SELECT * FROM company_preferences WHERE company_id = ${company[0].id} AND (job_id = ${id} OR job_id IS NULL) ORDER BY job_id DESC NULLS LAST LIMIT 1`;
    if (cp.length > 0) companyPrefs = cp[0];
  }

  const p = profile[0];
  const candidateCtx = [
    p ? `${p.current_title} at ${p.current_company}, ${p.years_of_experience || "?"} years exp` : "",
    p ? `Location: ${[p.location_city, p.location_country].filter(Boolean).join(", ")}` : "",
    prefs.length > 0 ? `Work style: ${JSON.stringify(prefs[0].work_style)}` : "",
    prefs.length > 0 ? `Team prefs: ${JSON.stringify(prefs[0].team_preferences)}` : "",
    prefs.length > 0 && (prefs[0].growth_priorities as string[])?.length > 0 ? `Growth priorities: ${(prefs[0].growth_priorities as string[]).join(", ")}` : "",
    prefs.length > 0 && (prefs[0].deal_breakers as string[])?.length > 0 ? `Deal breakers: ${(prefs[0].deal_breakers as string[]).join(", ")}` : "",
    caseStudies.length > 0 ? `Case studies: ${caseStudies.map((cs) => `${cs.title} (${cs.role} @ ${cs.company})`).join("; ")}` : "",
  ].filter(Boolean).join("\n");

  const jobCtx = [
    `${job[0].title} at ${job[0].company}`,
    `Location: ${job[0].location || "Not specified"}`,
    requirements.length > 0 ? `Requirements:\n${requirements.map((r) => `[${r.category}] ${r.requirement}`).join("\n")}` : "",
    companyPrefs ? `Company work style: ${JSON.stringify(companyPrefs.work_style)}` : "",
    companyPrefs && (companyPrefs.anti_patterns as string[])?.length > 0 ? `Anti-patterns: ${(companyPrefs.anti_patterns as string[]).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  try {
    const { content, model } = await generate(
      SYSTEM_PROMPT,
      `## Candidate\n${candidateCtx}\n\n## Job\n${jobCtx}`
    );

    const parsed = JSON.parse(content);

    // Store in user_jobs
    await sql`
      INSERT INTO user_jobs (user_id, job_id, match_score, match_details)
      VALUES (${userId}, ${id}, ${parsed.overall_score || null}, ${JSON.stringify({ ...parsed, model, mutual: true })})
      ON CONFLICT (user_id, job_id) DO UPDATE SET
        match_score = ${parsed.overall_score || null},
        match_details = ${JSON.stringify({ ...parsed, model, mutual: true })}
    `;

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Matching failed" },
      { status: 502 }
    );
  }
}
