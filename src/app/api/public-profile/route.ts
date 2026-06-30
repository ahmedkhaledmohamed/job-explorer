import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const result = await sql`SELECT * FROM public_profiles ORDER BY created_at LIMIT 1`;
  if (result.length === 0) return NextResponse.json(null);
  return NextResponse.json(result[0]);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { username, headline, summary, experience, skills, theme, is_public } = body;

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const sql = getDb();
  const profile = await sql`SELECT id FROM apply_profile ORDER BY id LIMIT 1`;
  const profileId = profile.length > 0 ? profile[0].id : null;

  const existing = await sql`SELECT username FROM public_profiles LIMIT 1`;

  let result;
  if (existing.length > 0) {
    result = await sql`
      UPDATE public_profiles SET
        username = ${username},
        profile_id = ${profileId},
        headline = ${headline || null},
        summary = ${summary || null},
        experience = ${JSON.stringify(experience || [])},
        skills = ${JSON.stringify(skills || [])},
        theme = ${theme || 'default'},
        is_public = ${is_public !== false},
        updated_at = NOW()
      WHERE username = ${existing[0].username}
      RETURNING *
    `;
  } else {
    result = await sql`
      INSERT INTO public_profiles (username, profile_id, headline, summary, experience, skills, theme, is_public)
      VALUES (${username}, ${profileId}, ${headline || null}, ${summary || null}, ${JSON.stringify(experience || [])}, ${JSON.stringify(skills || [])}, ${theme || 'default'}, ${is_public !== false})
      RETURNING *
    `;
  }

  return NextResponse.json(result[0]);
}
