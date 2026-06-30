import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sql = getDb();

  const company = await sql`SELECT id FROM companies WHERE slug = ${slug}`;
  if (company.length === 0) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const result = await sql`
    SELECT * FROM company_case_studies
    WHERE company_id = ${company[0].id} AND published = TRUE
    ORDER BY created_at DESC
  `;

  return NextResponse.json(result);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const sql = getDb();
  const userId = parseInt(session.user.id);

  const company = await sql`SELECT id FROM companies WHERE slug = ${slug}`;
  if (company.length === 0) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const admin = await sql`SELECT id FROM company_accounts WHERE company_id = ${company[0].id} AND admin_user_id = ${userId}`;
  if (admin.length === 0) {
    return NextResponse.json({ error: "Not a company admin" }, { status: 403 });
  }

  const body = await request.json();
  const { title, problem, approach, outcome, tech_used, published } = body;

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO company_case_studies (company_id, title, problem, approach, outcome, tech_used, created_by, published)
    VALUES (${company[0].id}, ${title}, ${problem || null}, ${approach || null}, ${outcome || null}, ${tech_used || []}, ${userId}, ${published || false})
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}
