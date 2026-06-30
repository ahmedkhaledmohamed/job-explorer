import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const sql = getDb();
  const userId = parseInt(session.user.id);

  const company = await sql`SELECT * FROM companies WHERE slug = ${slug}`;
  if (company.length === 0) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const existing = await sql`SELECT id FROM company_accounts WHERE company_id = ${company[0].id}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "Company already claimed" }, { status: 409 });
  }

  const userResult = await sql`SELECT email FROM users WHERE id = ${userId}`;
  const userEmail = userResult[0]?.email as string || "";
  const emailDomain = userEmail.split("@")[1] || "";

  const result = await sql`
    INSERT INTO company_accounts (company_id, admin_user_id, domain, verified)
    VALUES (${company[0].id}, ${userId}, ${emailDomain}, FALSE)
    RETURNING *
  `;

  await sql`UPDATE companies SET auto_generated = FALSE, updated_at = NOW() WHERE id = ${company[0].id}`;

  return NextResponse.json(result[0], { status: 201 });
}
