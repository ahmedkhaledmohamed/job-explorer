import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generate } from "@/lib/ai";
import { readFileSync } from "fs";
import { join } from "path";

const SYSTEM_PROMPT = `You are a resume tailoring expert. Given a base resume (in markdown) and a job description, produce:

1. A tailored resume (in markdown) that emphasizes the most relevant experience, skills, and achievements for this specific role. Keep the same structure but reorder bullet points, adjust emphasis, and surface the most relevant content. Do not fabricate experience.

2. A targeted cover letter (3-4 paragraphs) that connects the candidate's background to the role's requirements. Be specific and genuine — no generic filler.

Return a JSON object with exactly two keys:
- "tailored_resume": the full tailored resume in markdown
- "cover_letter": the cover letter text`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  const materials =
    await sql`SELECT * FROM job_materials WHERE job_id = ${id} ORDER BY resume_variant`;

  return NextResponse.json(materials);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const variant: string = body.variant;

  if (variant !== "pm" && variant !== "em") {
    return NextResponse.json(
      { error: 'variant must be "pm" or "em"' },
      { status: 400 }
    );
  }

  const sql = getDb();

  const jobResult = await sql`SELECT * FROM jobs WHERE id = ${id}`;
  if (jobResult.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  const job = jobResult[0];

  if (!job.description) {
    return NextResponse.json(
      { error: "Job has no description — cannot generate materials" },
      { status: 400 }
    );
  }

  // Read base resume — try profile first, then filesystem
  const profileResult =
    await sql`SELECT * FROM apply_profile ORDER BY id LIMIT 1`;
  const profile = profileResult[0];

  let baseResume: string;
  const profileField =
    variant === "pm" ? profile?.pm_resume_md : profile?.em_resume_md;

  if (profileField) {
    baseResume = profileField as string;
  } else {
    try {
      const filename = variant === "pm" ? "pm-resume.md" : "em-resume.md";
      baseResume = readFileSync(
        join(process.cwd(), "public", "resumes", filename),
        "utf-8"
      );
    } catch {
      return NextResponse.json(
        { error: `No ${variant.toUpperCase()} resume found in profile or filesystem` },
        { status: 400 }
      );
    }
  }

  const profileContext = profile
    ? `\n\nCandidate context: ${profile.current_title || ""} at ${profile.current_company || ""}. Located in ${profile.location_city || ""}, ${profile.location_country || ""}. ${profile.years_of_experience || ""} years of experience.`
    : "";

  const userMessage = `## Base Resume (${variant.toUpperCase()} variant)\n\n${baseResume}\n\n## Job Posting\n\n**${job.title}** at **${job.company}**\nLocation: ${job.location || "Not specified"}\n\n${job.description}${profileContext}`;

  try {
    const { content, model } = await generate(SYSTEM_PROMPT, userMessage);

    let parsed: { tailored_resume: string; cover_letter: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: content },
        { status: 502 }
      );
    }

    // Upsert into job_materials
    await sql`
      INSERT INTO job_materials (job_id, resume_variant, tailored_resume, cover_letter, generation_model)
      VALUES (${id}, ${variant}, ${parsed.tailored_resume}, ${parsed.cover_letter}, ${model})
      ON CONFLICT (job_id, resume_variant) DO UPDATE SET
        tailored_resume = EXCLUDED.tailored_resume,
        cover_letter = EXCLUDED.cover_letter,
        generation_model = EXCLUDED.generation_model,
        generated_at = NOW()
    `;

    return NextResponse.json({
      job_id: id,
      resume_variant: variant,
      tailored_resume: parsed.tailored_resume,
      cover_letter: parsed.cover_letter,
      generation_model: model,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI generation failed" },
      { status: 502 }
    );
  }
}
