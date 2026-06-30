import { NextRequest, NextResponse } from "next/server";
import { generate } from "@/lib/ai";

const SYSTEM_PROMPT = `You are a resume parser. Extract structured profile data from the given resume text.

Return a JSON object with these fields (use null for anything not found):

{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "location_city": "string",
  "location_state": "string",
  "location_country": "string",
  "current_company": "string (most recent employer)",
  "current_title": "string (most recent job title)",
  "linkedin_url": "string",
  "github_url": "string",
  "portfolio_url": "string",
  "personal_website": "string",
  "years_of_experience": "number (total years in industry)",
  "highest_education": "string (High School, Associate's, Bachelor's, Master's, Doctorate, Professional)",
  "university": "string (most advanced degree institution)",
  "degree": "string (e.g. MSc Computer Science)",
  "field_of_study": "string",
  "graduation_year": "number",
  "summary": "string (2-3 sentence professional summary)",
  "skills": ["array of skill strings extracted from the resume"],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "start": "string (year or year-month)",
      "end": "string (year or 'Present')",
      "highlights": ["array of key achievement strings, max 3 per role"]
    }
  ]
}

Be precise. Extract actual data, don't fabricate. For experience, include all roles found. For skills, extract both explicit skill mentions and implied technical/domain skills.`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text } = body;

  if (!text || text.trim().length < 50) {
    return NextResponse.json(
      { error: "Provide resume text of at least 50 characters" },
      { status: 400 }
    );
  }

  try {
    const { content, model } = await generate(
      SYSTEM_PROMPT,
      `Parse this resume:\n\n${text}`
    );

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw: content },
        { status: 502 }
      );
    }

    return NextResponse.json({ ...parsed, _model: model });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI extraction failed" },
      { status: 502 }
    );
  }
}
