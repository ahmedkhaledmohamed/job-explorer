import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generate } from "@/lib/ai";
import { auth } from "@/auth";

const PARSE_PROMPT = `You are a job description analyst. Extract structured requirements from the given job description.

For each requirement, categorize it as:
- category: "must_have" (explicitly required), "nice_to_have" (preferred/bonus), or "inferred" (implied but not stated)
- type: "skill" (technical ability), "experience" (years/domain), "domain" (industry knowledge), "trait" (soft skill/quality), or "tool" (specific technology)

Return a JSON object:
{
  "requirements": [
    {"requirement": "string", "category": "must_have|nice_to_have|inferred", "type": "skill|experience|domain|trait|tool"}
  ]
}

Extract 8-20 requirements. Be specific — "5+ years PM experience" not "experience required". Separate compound requirements into individual items.`;

const MATCH_PROMPT = `You are a job-candidate matching expert. Given a list of job requirements and a candidate profile, determine how well the candidate matches each requirement.

For each requirement, return:
- match_status: "matched" (candidate clearly has this), "partial" (some evidence), or "unmatched" (no evidence)
- match_evidence: Brief explanation of why (1 sentence). Reference specific experience, skills, or projects.

Return a JSON object:
{
  "matches": [
    {"requirement_id": number, "match_status": "matched|partial|unmatched", "match_evidence": "string"}
  ],
  "overall_score": number (0.0 to 1.0, weighted: must_have=0.7, nice_to_have=0.2, inferred=0.1),
  "summary": "1-2 sentence fit summary"
}`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const requirements = await sql`
    SELECT * FROM job_requirements WHERE job_id = ${id} ORDER BY
      CASE category WHEN 'must_have' THEN 1 WHEN 'nice_to_have' THEN 2 ELSE 3 END,
      id
  `;

  const job = await sql`SELECT match_score, match_details FROM jobs WHERE id = ${id}`;

  return NextResponse.json({
    requirements,
    match_score: job[0]?.match_score || null,
    match_details: job[0]?.match_details || null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const action = body.action || "parse";

  const sql = getDb();

  const jobResult = await sql`SELECT * FROM jobs WHERE id = ${id}`;
  if (jobResult.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  const job = jobResult[0];

  if (action === "parse") {
    if (!job.description) {
      return NextResponse.json(
        { error: "Job has no description" },
        { status: 400 }
      );
    }

    try {
      const { content } = await generate(
        PARSE_PROMPT,
        `Job: ${job.title} at ${job.company}\nLocation: ${job.location || "Not specified"}\n\n${job.description}`
      );

      const parsed = JSON.parse(content);
      const reqs = parsed.requirements || [];

      // Delete existing and insert new
      await sql`DELETE FROM job_requirements WHERE job_id = ${id}`;

      for (const req of reqs) {
        await sql`
          INSERT INTO job_requirements (job_id, requirement, category, type)
          VALUES (${id}, ${req.requirement}, ${req.category}, ${req.type})
        `;
      }

      const inserted = await sql`
        SELECT * FROM job_requirements WHERE job_id = ${id} ORDER BY
          CASE category WHEN 'must_have' THEN 1 WHEN 'nice_to_have' THEN 2 ELSE 3 END, id
      `;

      return NextResponse.json({ requirements: inserted, count: inserted.length });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Parsing failed" },
        { status: 502 }
      );
    }
  }

  if (action === "match") {
    // Fetch requirements
    const reqs = await sql`SELECT * FROM job_requirements WHERE job_id = ${id}`;
    if (reqs.length === 0) {
      return NextResponse.json(
        { error: "No requirements extracted yet — parse first" },
        { status: 400 }
      );
    }

    // Fetch profile
    const profileResult = await sql`SELECT * FROM apply_profile ORDER BY id LIMIT 1`;
    if (profileResult.length === 0) {
      return NextResponse.json(
        { error: "No profile found" },
        { status: 400 }
      );
    }
    const profile = profileResult[0];

    // Fetch case studies for richer matching
    const caseStudies = await sql`SELECT title, company, role, situation, skills FROM case_studies WHERE published = TRUE`;

    const reqList = reqs.map((r) => ({
      id: r.id,
      requirement: r.requirement,
      category: r.category,
      type: r.type,
    }));

    const profileSummary = [
      `Name: ${profile.full_name}`,
      `Current: ${profile.current_title} at ${profile.current_company}`,
      `Location: ${[profile.location_city, profile.location_country].filter(Boolean).join(", ")}`,
      `Experience: ${profile.years_of_experience || "unknown"} years`,
      `Education: ${profile.degree} from ${profile.university}`,
      `Skills: ${profile.linkedin_url ? "LinkedIn available" : ""}`,
      caseStudies.length > 0
        ? `Case Studies: ${caseStudies.map((cs) => `${cs.title} (${cs.role} @ ${cs.company}, skills: ${(cs.skills as string[])?.join(", ")})`).join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { content } = await generate(
        MATCH_PROMPT,
        `## Requirements\n${JSON.stringify(reqList, null, 2)}\n\n## Candidate Profile\n${profileSummary}`
      );

      const parsed = JSON.parse(content);

      // Update each requirement's match status
      for (const match of parsed.matches || []) {
        await sql`
          UPDATE job_requirements
          SET match_status = ${match.match_status}, match_evidence = ${match.match_evidence}
          WHERE id = ${match.requirement_id}
        `;
      }

      // Update user_jobs match score
      const session = await auth();
      const uid = session?.user?.id ? parseInt(session.user.id) : (await sql`SELECT id FROM users ORDER BY id LIMIT 1`)[0]?.id as number || 1;
      await sql`
        INSERT INTO user_jobs (user_id, job_id, match_score, match_details)
        VALUES (${uid}, ${id}, ${parsed.overall_score || null}, ${JSON.stringify({ summary: parsed.summary })})
        ON CONFLICT (user_id, job_id) DO UPDATE SET
          match_score = ${parsed.overall_score || null},
          match_details = ${JSON.stringify({ summary: parsed.summary })}
      `;

      const updated = await sql`
        SELECT * FROM job_requirements WHERE job_id = ${id} ORDER BY
          CASE category WHEN 'must_have' THEN 1 WHEN 'nice_to_have' THEN 2 ELSE 3 END, id
      `;

      return NextResponse.json({
        requirements: updated,
        match_score: parsed.overall_score,
        summary: parsed.summary,
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Matching failed" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
