import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const result = await sql`SELECT * FROM case_studies ORDER BY created_at DESC`;
  return NextResponse.json(result);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, company, role, situation, approach, decisions, metrics, reflections, skills, published } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const sql = getDb();
  const baseSlug = slugify(title);

  // Ensure unique slug
  const existing = await sql`SELECT slug FROM case_studies WHERE slug LIKE ${baseSlug + "%"}`;
  let slug = baseSlug;
  if (existing.length > 0) {
    const slugs = new Set(existing.map((r) => r.slug));
    let i = 2;
    while (slugs.has(slug)) {
      slug = `${baseSlug}-${i++}`;
    }
  }

  const result = await sql`
    INSERT INTO case_studies (slug, title, company, role, situation, approach, decisions, metrics, reflections, skills, published)
    VALUES (
      ${slug},
      ${title},
      ${company || null},
      ${role || null},
      ${situation || null},
      ${approach || null},
      ${JSON.stringify(decisions || [])},
      ${JSON.stringify(metrics || {})},
      ${reflections || null},
      ${skills || []},
      ${published || false}
    )
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}
