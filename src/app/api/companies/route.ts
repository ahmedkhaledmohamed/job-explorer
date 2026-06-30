import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const sql = getDb();

  if (q) {
    const result = await sql`
      SELECT c.*, COUNT(j.id) as open_roles
      FROM companies c
      LEFT JOIN jobs j ON LOWER(j.company) = LOWER(c.name) AND j.last_seen >= NOW() - INTERVAL '14 days'
      WHERE LOWER(c.name) LIKE ${"%" + q.toLowerCase() + "%"}
      GROUP BY c.id
      ORDER BY open_roles DESC, c.name
      LIMIT ${limit}
    `;
    return NextResponse.json(result);
  }

  const result = await sql`
    SELECT c.*, COUNT(j.id) as open_roles
    FROM companies c
    LEFT JOIN jobs j ON LOWER(j.company) = LOWER(c.name) AND j.last_seen >= NOW() - INTERVAL '14 days'
    GROUP BY c.id
    ORDER BY open_roles DESC, c.name
    LIMIT ${limit}
  `;

  return NextResponse.json(result);
}
