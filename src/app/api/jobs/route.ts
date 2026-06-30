import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const result = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (result[0]?.id as number) || 1;
}

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
  const topMatch = searchParams.get("top_match") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const sort = searchParams.get("sort") || "first_seen";
  const order = searchParams.get("order") === "asc" ? "ASC" : "DESC";

  const offset = (page - 1) * limit;
  const sql = getDb();
  const userId = await getUserId();

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let paramIndex = 1;

  // User ID for the JOIN
  params.push(userId);
  paramIndex++;

  if (q) {
    conditions.push(
      `(LOWER(j.title) LIKE $${paramIndex} OR LOWER(j.company) LIKE $${paramIndex})`
    );
    params.push(`%${q.toLowerCase()}%`);
    paramIndex++;
  }

  if (status) {
    conditions.push(`COALESCE(uj.status, 'new') = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (source) {
    conditions.push(`j.source = $${paramIndex}`);
    params.push(source);
    paramIndex++;
  }

  if (company) {
    conditions.push(`LOWER(j.company) = $${paramIndex}`);
    params.push(company.toLowerCase());
    paramIndex++;
  }

  if (from) {
    conditions.push(`j.first_seen >= $${paramIndex}`);
    params.push(from);
    paramIndex++;
  }

  if (to) {
    conditions.push(`j.first_seen <= $${paramIndex}`);
    params.push(to);
    paramIndex++;
  }

  if (topMatch === "true") {
    conditions.push("uj.top_match = TRUE");
  } else if (topMatch === "false") {
    conditions.push("(uj.top_match IS NULL OR uj.top_match = FALSE)");
  }

  const whereClause = conditions.join(" AND ");

  const allowedSorts: Record<string, string> = {
    title: "j.title",
    company: "j.company",
    location: "j.location",
    source: "j.source",
    first_seen: "j.first_seen",
    status: "COALESCE(uj.status, 'new')",
    posted_date: "j.posted_date",
    match_score: "uj.match_score",
  };
  const sortColumn = allowedSorts[sort] || "j.first_seen";

  const countQuery = `SELECT COUNT(*) as total FROM jobs j LEFT JOIN user_jobs uj ON uj.job_id = j.id AND uj.user_id = $1 WHERE ${whereClause}`;
  const dataQuery = `
    SELECT j.id, j.title, j.company, j.location, j.url, j.source, j.description, j.ats_job_id,
           j.posted_date, j.first_seen, j.last_seen,
           COALESCE(uj.status, 'new') AS status,
           COALESCE(uj.top_match, FALSE) AS top_match,
           uj.notes, uj.match_score, uj.match_details, uj.applied_at, uj.resume_version, uj.saved_at,
           af.ready AS form_ready
    FROM jobs j
    LEFT JOIN user_jobs uj ON uj.job_id = j.id AND uj.user_id = $1
    LEFT JOIN application_forms af ON af.job_id = j.id
    WHERE ${whereClause}
    ORDER BY ${sortColumn} ${order} NULLS LAST
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const countResult = await sql.query(countQuery, params);
  const total = parseInt(countResult[0]?.total || "0", 10);

  const dataResult = await sql.query(dataQuery, [...params, limit, offset]);

  return NextResponse.json({
    jobs: dataResult,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
