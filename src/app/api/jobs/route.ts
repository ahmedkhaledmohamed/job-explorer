import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.API_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { jobs } = body;

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return NextResponse.json(
      { error: "Request body must contain a non-empty jobs array" },
      { status: 400 }
    );
  }

  const sql = getDb();
  let inserted = 0;
  let updated = 0;

  for (const job of jobs) {
    if (!job.id || !job.title || !job.company || !job.url) {
      continue;
    }

    const result = await sql`
      INSERT INTO jobs (id, title, company, location, url, source, description, ats_job_id, posted_date)
      VALUES (${job.id}, ${job.title}, ${job.company}, ${job.location || null}, ${job.url}, ${job.source || null}, ${job.description || null}, ${job.ats_job_id || null}, ${job.posted_date || null})
      ON CONFLICT (id) DO UPDATE SET
        last_seen = NOW(),
        title = EXCLUDED.title,
        description = COALESCE(EXCLUDED.description, jobs.description),
        location = COALESCE(EXCLUDED.location, jobs.location)
      RETURNING (xmax = 0) AS is_insert
    `;

    if (result[0]?.is_insert) {
      inserted++;
    } else {
      updated++;
    }
  }

  return NextResponse.json({ inserted, updated, total: inserted + updated });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const source = searchParams.get("source") || "";
  const company = searchParams.get("company") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const sort = searchParams.get("sort") || "first_seen";
  const order = searchParams.get("order") === "asc" ? "ASC" : "DESC";

  const offset = (page - 1) * limit;
  const sql = getDb();

  // Build WHERE conditions
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(
      `(LOWER(title) LIKE $${paramIndex} OR LOWER(company) LIKE $${paramIndex})`
    );
    params.push(`%${q.toLowerCase()}%`);
    paramIndex++;
  }

  if (status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (source) {
    conditions.push(`source = $${paramIndex}`);
    params.push(source);
    paramIndex++;
  }

  if (company) {
    conditions.push(`LOWER(company) = $${paramIndex}`);
    params.push(company.toLowerCase());
    paramIndex++;
  }

  if (from) {
    conditions.push(`first_seen >= $${paramIndex}`);
    params.push(from);
    paramIndex++;
  }

  if (to) {
    conditions.push(`first_seen <= $${paramIndex}`);
    params.push(to);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  // Validate sort column to prevent injection
  const allowedSorts = [
    "title",
    "company",
    "location",
    "source",
    "first_seen",
    "status",
    "posted_date",
  ];
  const sortColumn = allowedSorts.includes(sort) ? sort : "first_seen";

  const countQuery = `SELECT COUNT(*) as total FROM jobs WHERE ${whereClause}`;
  const dataQuery = `SELECT jobs.*, af.ready as form_ready FROM jobs LEFT JOIN application_forms af ON af.job_id = jobs.id WHERE ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  const countResult = await sql.query(countQuery, params);
  const total = parseInt(countResult[0]?.total || "0", 10);

  const dataResult = await sql.query(dataQuery, [
    ...params,
    limit,
    offset,
  ]);

  return NextResponse.json({
    jobs: dataResult,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
