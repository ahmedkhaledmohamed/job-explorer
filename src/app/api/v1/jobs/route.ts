import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get("company") || "";
  const q = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const sql = getDb();

  const conditions: string[] = ["last_seen >= NOW() - INTERVAL '14 days'"];
  const params: unknown[] = [];
  let idx = 1;

  if (company) {
    conditions.push(`LOWER(company) = $${idx++}`);
    params.push(company.toLowerCase());
  }
  if (q) {
    conditions.push(`(LOWER(title) LIKE $${idx} OR LOWER(company) LIKE $${idx})`);
    params.push(`%${q.toLowerCase()}%`);
    idx++;
  }

  const where = conditions.join(" AND ");
  const countResult = await sql.query(`SELECT COUNT(*) as total FROM jobs WHERE ${where}`, params);
  const total = parseInt(countResult[0]?.total || "0", 10);

  const dataResult = await sql.query(
    `SELECT id, title, company, location, source, posted_date, first_seen FROM jobs WHERE ${where} ORDER BY first_seen DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return NextResponse.json({
    jobs: dataResult,
    total,
    limit,
    offset,
  }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
