import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sql = getDb();

  const company = await sql`SELECT * FROM companies WHERE slug = ${slug}`;
  if (company.length === 0) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const roles = await sql`
    SELECT id, title, location, source, first_seen
    FROM jobs WHERE LOWER(company) = LOWER(${company[0].name as string})
      AND last_seen >= NOW() - INTERVAL '14 days'
    ORDER BY first_seen DESC
  `;

  return NextResponse.json({
    name: company[0].name,
    slug: company[0].slug,
    industry: company[0].industry,
    tech_stack: company[0].tech_stack,
    culture_signals: company[0].culture_signals,
    open_roles: roles.length,
    roles: roles.map((r) => ({ id: r.id, title: r.title, location: r.location, source: r.source })),
  }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
