import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sql = getDb();

  const result = await sql`SELECT * FROM companies WHERE slug = ${slug}`;
  if (result.length === 0) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  const company = result[0];

  // Fetch open roles
  const roles = await sql`
    SELECT id, title, location, source, first_seen, posted_date
    FROM jobs
    WHERE LOWER(company) = LOWER(${company.name as string})
      AND last_seen >= NOW() - INTERVAL '14 days'
    ORDER BY first_seen DESC
  `;

  // Common requirements across this company's jobs
  const requirements = await sql`
    SELECT jr.requirement, jr.category, jr.type, COUNT(*) as frequency
    FROM job_requirements jr
    JOIN jobs j ON j.id = jr.job_id
    WHERE LOWER(j.company) = LOWER(${company.name as string})
    GROUP BY jr.requirement, jr.category, jr.type
    ORDER BY frequency DESC
    LIMIT 15
  `;

  // Location patterns
  const locations = await sql`
    SELECT location, COUNT(*) as count
    FROM jobs
    WHERE LOWER(company) = LOWER(${company.name as string}) AND location IS NOT NULL
    GROUP BY location ORDER BY count DESC
  `;

  return NextResponse.json({
    company,
    roles,
    requirements,
    locations,
  });
}
