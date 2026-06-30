import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const result = await sql`SELECT * FROM apply_profile ORDER BY id LIMIT 1`;

  if (result.length === 0) {
    return NextResponse.json(null);
  }

  return NextResponse.json(result[0]);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const {
    full_name,
    email,
    phone,
    linkedin_url,
    resume_url,
    work_authorization,
    default_cover_letter,
  } = body;

  if (!full_name || !email) {
    return NextResponse.json(
      { error: "full_name and email are required" },
      { status: 400 }
    );
  }

  const sql = getDb();

  // Check if profile exists
  const existing = await sql`SELECT id FROM apply_profile ORDER BY id LIMIT 1`;

  let result;
  if (existing.length > 0) {
    result = await sql`
      UPDATE apply_profile SET
        full_name = ${full_name},
        email = ${email},
        phone = ${phone || null},
        linkedin_url = ${linkedin_url || null},
        resume_url = ${resume_url || null},
        work_authorization = ${work_authorization || null},
        default_cover_letter = ${default_cover_letter || null},
        updated_at = NOW()
      WHERE id = ${existing[0].id}
      RETURNING *
    `;
  } else {
    result = await sql`
      INSERT INTO apply_profile (full_name, email, phone, linkedin_url, resume_url, work_authorization, default_cover_letter)
      VALUES (${full_name}, ${email}, ${phone || null}, ${linkedin_url || null}, ${resume_url || null}, ${work_authorization || null}, ${default_cover_letter || null})
      RETURNING *
    `;
  }

  return NextResponse.json(result[0]);
}
