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

const PROFILE_FIELDS = [
  "full_name", "email", "phone", "linkedin_url", "resume_url",
  "work_authorization", "default_cover_letter",
  "first_name", "last_name", "pronouns",
  "location_city", "location_state", "location_country",
  "current_company", "current_title",
  "github_url", "portfolio_url", "personal_website",
  "visa_sponsorship_needed", "citizenship",
  "desired_salary_min", "desired_salary_max", "salary_currency",
  "notice_period", "earliest_start_date", "willing_to_relocate",
  "preferred_locations",
  "years_of_experience", "highest_education", "university",
  "degree", "field_of_study", "graduation_year",
  "gender", "race_ethnicity", "veteran_status", "disability_status",
  "pm_resume_md", "em_resume_md", "how_did_you_hear",
] as const;

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (!body.full_name || !body.email) {
    return NextResponse.json(
      { error: "full_name and email are required" },
      { status: 400 }
    );
  }

  // Auto-derive first_name/last_name from full_name if not explicitly set
  if (body.full_name && !body.first_name) {
    const parts = body.full_name.split(" ");
    body.first_name = parts[0] || "";
    body.last_name = parts.slice(1).join(" ") || "";
  }

  const sql = getDb();
  const existing = await sql`SELECT id FROM apply_profile ORDER BY id LIMIT 1`;

  // Build column list and values from the body
  const setClauses: string[] = [];
  const insertCols: string[] = [];
  const insertPlaceholders: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const field of PROFILE_FIELDS) {
    if (body[field] !== undefined) {
      const val = body[field] === "" ? null : body[field];
      setClauses.push(`${field} = $${paramIdx}`);
      insertCols.push(field);
      insertPlaceholders.push(`$${paramIdx}`);
      values.push(val);
      paramIdx++;
    }
  }

  let result;
  if (existing.length > 0) {
    setClauses.push("updated_at = NOW()");
    values.push(existing[0].id);
    const query = `UPDATE apply_profile SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`;
    result = await sql.query(query, values);
  } else {
    const query = `INSERT INTO apply_profile (${insertCols.join(", ")}) VALUES (${insertPlaceholders.join(", ")}) RETURNING *`;
    result = await sql.query(query, values);
  }

  return NextResponse.json(result[0]);
}
