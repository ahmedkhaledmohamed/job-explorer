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

const SYSTEM_PROMPT = `You are an interview preparation coach. Given a job posting, candidate profile, and interview stage, generate targeted preparation materials.

Return a JSON object:
{
  "content": "2-3 paragraphs of preparation advice tailored to this specific role and stage. Include what to research, how to frame experience, and what to emphasize.",
  "key_questions": ["array of 5-8 likely questions for this stage, specific to the role and company"]
}

Be specific to the company and role — no generic interview advice.`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const userId = await getUserId();

  const result = await sql`
    SELECT * FROM interview_prep
    WHERE user_id = ${userId} AND job_id = ${id}
    ORDER BY generated_at DESC
  `;

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const stage = body.stage || "screen";

  const sql = getDb();
  const userId = await getUserId();

  const jobResult = await sql`SELECT * FROM jobs WHERE id = ${id}`;
  if (jobResult.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  const job = jobResult[0];

  const profileResult = await sql`SELECT * FROM apply_profile WHERE user_id = ${userId} ORDER BY id LIMIT 1`;
  const profile = profileResult[0];

  const caseStudies = await sql`SELECT title, company, role, situation, skills FROM case_studies WHERE user_id = ${userId} AND published = TRUE`;

  const profileCtx = profile
    ? `Current: ${profile.current_title} at ${profile.current_company}. ${profile.years_of_experience || ""} years experience.`
    : "";
  const csCtx = caseStudies.length > 0
    ? `Case studies: ${caseStudies.map((cs) => `${cs.title} (${cs.role} @ ${cs.company})`).join("; ")}`
    : "";

  try {
    const { content } = await generate(
      SYSTEM_PROMPT,
      `## Job\n${job.title} at ${job.company}\n${job.location || ""}\n\nDescription:\n${job.description || "Not available"}\n\n## Stage: ${stage}\n\n## Candidate\n${profileCtx}\n${csCtx}`
    );

    const parsed = JSON.parse(content);

    const result = await sql`
      INSERT INTO interview_prep (user_id, job_id, stage, content, key_questions)
      VALUES (${userId}, ${id}, ${stage}, ${parsed.content}, ${JSON.stringify(parsed.key_questions || [])})
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
