import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generate } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a career fit analyst. Given a job's requirements and a candidate's case studies and profile, create a compelling fit narrative that maps the candidate's demonstrated experience to each requirement.

For each requirement, find the most relevant case study or experience and explain why the candidate is a fit. Be specific — reference actual decisions, outcomes, and skills from the case studies.

Return a JSON object:
{
  "mappings": [
    {
      "requirement": "the requirement text",
      "case_study_slug": "slug of the most relevant case study (or null if from resume)",
      "case_study_title": "title of the case study (or the experience being referenced)",
      "explanation": "2-3 sentences connecting the candidate's experience to this requirement. Be specific.",
      "confidence": "high|medium|low"
    }
  ],
  "overall_narrative": "3-4 paragraph fit narrative that a hiring manager can read in 30 seconds. Lead with the strongest connection. Be genuine — acknowledge gaps honestly rather than stretching.",
  "confidence_score": 0.0-1.0
}`;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const result = await sql`SELECT * FROM fit_narratives WHERE job_id = ${id} ORDER BY created_at DESC LIMIT 1`;
  if (result.length === 0) return NextResponse.json(null);
  return NextResponse.json(result[0]);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const jobResult = await sql`SELECT * FROM jobs WHERE id = ${id}`;
  if (jobResult.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  const job = jobResult[0];

  // Fetch requirements
  const reqs = await sql`SELECT * FROM job_requirements WHERE job_id = ${id} ORDER BY CASE category WHEN 'must_have' THEN 1 WHEN 'nice_to_have' THEN 2 ELSE 3 END`;
  if (reqs.length === 0) {
    return NextResponse.json({ error: "No requirements extracted — parse requirements first" }, { status: 400 });
  }

  // Fetch case studies
  const caseStudies = await sql`SELECT * FROM case_studies WHERE published = TRUE ORDER BY created_at DESC`;

  // Fetch profile
  const profileResult = await sql`SELECT * FROM apply_profile ORDER BY id LIMIT 1`;
  const profile = profileResult[0];

  const reqList = reqs.map((r) => `[${r.category}] ${r.requirement}`).join("\n");
  const csText = caseStudies.length > 0
    ? caseStudies.map((cs) => `### ${cs.title} (slug: ${cs.slug})\nRole: ${cs.role} @ ${cs.company}\nSituation: ${cs.situation}\nApproach: ${cs.approach}\nDecisions: ${JSON.stringify(cs.decisions)}\nMetrics: ${JSON.stringify(cs.metrics)}\nSkills: ${(cs.skills as string[])?.join(", ")}`).join("\n\n")
    : "No case studies available.";

  const profileText = profile
    ? `Current: ${profile.current_title} at ${profile.current_company}. ${profile.years_of_experience || ""} years experience. Education: ${profile.degree} from ${profile.university}.`
    : "";

  try {
    const { content, model } = await generate(
      SYSTEM_PROMPT,
      `## Job\n${job.title} at ${job.company}\n${job.location || ""}\n\n## Requirements\n${reqList}\n\n## Candidate Case Studies\n${csText}\n\n## Candidate Profile\n${profileText}`
    );

    const parsed = JSON.parse(content);

    // Generate slug
    const baseSlug = slugify(`${job.company}-${job.title}`);
    const existing = await sql`SELECT slug FROM fit_narratives WHERE slug LIKE ${baseSlug + "%"}`;
    let slug = baseSlug;
    if (existing.length > 0) {
      const slugs = new Set(existing.map((r) => r.slug));
      let i = 2;
      while (slugs.has(slug)) slug = `${baseSlug}-${i++}`;
    }

    // Delete existing for this job and insert new
    await sql`DELETE FROM fit_narratives WHERE job_id = ${id}`;

    const result = await sql`
      INSERT INTO fit_narratives (job_id, slug, requirements, mappings, overall_narrative, confidence_score, generation_model)
      VALUES (
        ${id},
        ${slug},
        ${JSON.stringify(reqs.map((r) => r.requirement))},
        ${JSON.stringify(parsed.mappings || [])},
        ${parsed.overall_narrative || null},
        ${parsed.confidence_score || null},
        ${model}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 502 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const sql = getDb();

  const existing = await sql`SELECT id FROM fit_narratives WHERE job_id = ${id}`;
  if (existing.length === 0) {
    return NextResponse.json({ error: "No fit narrative found" }, { status: 404 });
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (body.overall_narrative !== undefined) {
    setClauses.push(`overall_narrative = $${idx++}`);
    values.push(body.overall_narrative);
  }
  if (body.mappings !== undefined) {
    setClauses.push(`mappings = $${idx++}`);
    values.push(JSON.stringify(body.mappings));
  }
  if (body.published !== undefined) {
    setClauses.push(`published = $${idx++}`);
    values.push(body.published);
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  setClauses.push("updated_at = NOW()");
  values.push(existing[0].id);
  const query = `UPDATE fit_narratives SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`;
  const result = await sql.query(query, values);

  return NextResponse.json(result[0]);
}
