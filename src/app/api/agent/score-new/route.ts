import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generate } from "@/lib/ai";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const r = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (r[0]?.id as number) || 1;
}

const SCORE_PROMPT = `Score this job for a candidate. Return JSON: {"score": 0.0-1.0, "reasons": ["2-3 reasons"], "verdict": "strong_match"|"good_match"|"partial_match"|"weak_match"}`;

export async function POST() {
  const sql = getDb();
  const userId = await getUserId();

  const profile = await sql`SELECT current_title, current_company, years_of_experience FROM apply_profile WHERE user_id = ${userId} ORDER BY id LIMIT 1`;
  const p = profile[0];
  const candidateCtx = p ? `${p.current_title} at ${p.current_company}, ${p.years_of_experience || "?"} years` : "Unknown candidate";

  // Find unscored jobs with descriptions
  const unscored = await sql`
    SELECT j.id, j.title, j.company, j.location, j.description
    FROM jobs j
    WHERE j.description IS NOT NULL AND length(j.description) > 200
      AND NOT EXISTS (SELECT 1 FROM user_jobs uj WHERE uj.user_id = ${userId} AND uj.job_id = j.id AND uj.match_score IS NOT NULL)
      AND (
        LOWER(j.title) LIKE '%product%' OR LOWER(j.title) LIKE '%engineering manager%' OR
        LOWER(j.title) LIKE '%platform%' OR LOWER(j.title) LIKE '%head of%' OR
        LOWER(j.title) LIKE '%director%' OR LOWER(j.title) LIKE '%lead%' OR
        LOWER(j.title) LIKE '%principal%' OR LOWER(j.title) LIKE '%staff%'
      )
    ORDER BY j.first_seen DESC
    LIMIT 10
  `;

  if (unscored.length === 0) {
    return NextResponse.json({ scored: 0, message: "No unscored relevant jobs found" });
  }

  const results = [];
  for (const job of unscored) {
    try {
      const desc = (job.description as string).replace(/<[^>]+>/g, " ").slice(0, 2000);
      const { content } = await generate(
        SCORE_PROMPT + `\n\nCandidate: ${candidateCtx}`,
        `${job.title} at ${job.company}\n${job.location || ""}\n\n${desc}`
      );
      const parsed = JSON.parse(content);

      await sql`
        INSERT INTO user_jobs (user_id, job_id, match_score, match_details)
        VALUES (${userId}, ${job.id}, ${parsed.score}, ${JSON.stringify(parsed)})
        ON CONFLICT (user_id, job_id) DO UPDATE SET match_score = ${parsed.score}, match_details = ${JSON.stringify(parsed)}
      `;

      results.push({ id: job.id, title: job.title, company: job.company, score: parsed.score, verdict: parsed.verdict });
    } catch (e) {
      results.push({ id: job.id, title: job.title, company: job.company, error: (e as Error).message });
      break; // Stop on first AI error (likely rate limit)
    }
  }

  return NextResponse.json({ scored: results.filter((r) => !("error" in r)).length, results });
}
