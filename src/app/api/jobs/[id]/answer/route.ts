import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { FormField } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { answers } = body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json(
      { error: "answers must be a non-empty array" },
      { status: 400 }
    );
  }

  const sql = getDb();

  // Fetch current form
  const formResult =
    await sql`SELECT * FROM application_forms WHERE job_id = ${id}`;
  if (formResult.length === 0) {
    return NextResponse.json(
      { error: "No prepared form found for this job" },
      { status: 404 }
    );
  }

  const form = formResult[0];
  const fields: FormField[] =
    typeof form.fields === "string"
      ? JSON.parse(form.fields as string)
      : (form.fields as unknown as FormField[]);

  // Update each field with the provided answer
  for (const answer of answers) {
    const { fieldName, value, label } = answer;
    const fieldIndex = fields.findIndex((f) => f.name === fieldName);
    if (fieldIndex !== -1) {
      fields[fieldIndex].value = value;
      fields[fieldIndex].matched = true;
    }

    // Save to profile_answers (upsert by normalized label)
    const normalizedLabel = (label || fieldName).toLowerCase().trim();
    await sql`
      INSERT INTO profile_answers (question_pattern, answer)
      VALUES (${normalizedLabel}, ${value})
      ON CONFLICT (question_pattern) DO UPDATE SET
        answer = ${value},
        used_count = profile_answers.used_count + 1
    `;
  }

  // Recheck ready status
  const requiredMissing = fields.filter((f) => f.required && !f.matched);
  const ready = requiredMissing.length === 0;

  // Update the form
  await sql`
    UPDATE application_forms
    SET fields = ${JSON.stringify(fields)}, ready = ${ready}
    WHERE job_id = ${id}
  `;

  return NextResponse.json({
    ready,
    remainingMissing: requiredMissing.map((f) => ({
      name: f.name,
      label: f.label,
    })),
  });
}
