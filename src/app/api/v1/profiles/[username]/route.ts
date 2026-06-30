import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createHash } from "crypto";

async function validateApiKey(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer jx_")) return false;

  const key = authHeader.slice(7);
  const prefix = key.slice(0, 10);
  const hash = createHash("sha256").update(key).digest("hex");

  const sql = getDb();
  const result = await sql`
    SELECT id FROM api_keys WHERE key_prefix = ${prefix} AND key_hash = ${hash}
  `;

  if (result.length > 0) {
    await sql`UPDATE api_keys SET last_used = NOW() WHERE id = ${result[0].id}`;
    return true;
  }
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const sql = getDb();

  // Public profiles don't require API key; API key unlocks extra fields
  const hasKey = await validateApiKey(request);

  const pub = await sql`SELECT * FROM public_profiles WHERE username = ${username} AND is_public = TRUE`;
  if (pub.length === 0) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const profile = pub[0].profile_id
    ? await sql`SELECT full_name, current_title, current_company, location_city, location_country, linkedin_url, github_url, years_of_experience FROM apply_profile WHERE id = ${pub[0].profile_id}`
    : [];

  const caseStudies = await sql`
    SELECT slug, title, company, role, situation, approach, skills, metrics
    FROM case_studies WHERE user_id = ${pub[0].user_id} AND published = TRUE
    ORDER BY created_at DESC
  `;

  const response: Record<string, unknown> = {
    username: pub[0].username,
    headline: pub[0].headline,
    summary: pub[0].summary,
    skills: typeof pub[0].skills === "string" ? JSON.parse(pub[0].skills as string) : pub[0].skills,
    experience: typeof pub[0].experience === "string" ? JSON.parse(pub[0].experience as string) : pub[0].experience,
    case_studies: caseStudies.map((cs) => ({
      slug: cs.slug,
      title: cs.title,
      company: cs.company,
      role: cs.role,
      situation: cs.situation,
      skills: cs.skills,
    })),
  };

  if (profile[0]) {
    response.name = profile[0].full_name;
    response.title = profile[0].current_title;
    response.company = profile[0].current_company;
    response.location = [profile[0].location_city, profile[0].location_country].filter(Boolean).join(", ");
  }

  // API key unlocks contact info
  if (hasKey && profile[0]) {
    response.linkedin = profile[0].linkedin_url;
    response.github = profile[0].github_url;
    response.years_of_experience = profile[0].years_of_experience;
  }

  return NextResponse.json(response, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
