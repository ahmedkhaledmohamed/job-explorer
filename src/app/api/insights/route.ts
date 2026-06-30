import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const result = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (result[0]?.id as number) || 1;
}

export async function GET() {
  const sql = getDb();
  const userId = await getUserId();

  // --- Profile Strength ---
  const profile = await sql`SELECT * FROM apply_profile WHERE user_id = ${userId} ORDER BY id LIMIT 1`;
  const caseStudies = await sql`SELECT * FROM case_studies WHERE user_id = ${userId}`;
  const publicProfile = await sql`SELECT * FROM public_profiles WHERE user_id = ${userId}`;
  const prefs = await sql`SELECT * FROM candidate_preferences WHERE user_id = ${userId}`;

  const p = profile[0];
  const strengthChecks = [
    { label: "Name & email", done: !!p?.first_name && !!p?.email },
    { label: "Current role", done: !!p?.current_title && !!p?.current_company },
    { label: "Location", done: !!p?.location_city },
    { label: "LinkedIn", done: !!p?.linkedin_url },
    { label: "Years of experience", done: !!p?.years_of_experience },
    { label: "Education", done: !!p?.university },
    { label: "Work authorization", done: !!p?.work_authorization },
    { label: "At least 1 case study", done: caseStudies.length > 0 },
    { label: "Published case study", done: caseStudies.some((cs) => cs.published) },
    { label: "Public profile", done: publicProfile.length > 0 && publicProfile[0].is_public },
    { label: "Work preferences set", done: prefs.length > 0 },
    { label: "Resume uploaded", done: !!p?.resume_url || !!p?.pm_resume_md },
  ];
  const strengthScore = Math.round(
    (strengthChecks.filter((c) => c.done).length / strengthChecks.length) * 100
  );

  // --- Skill Demand Analysis ---
  // What skills appear most in job requirements vs what the candidate has
  const candidateSkills = new Set<string>();
  for (const cs of caseStudies) {
    for (const skill of (cs.skills as string[]) || []) {
      candidateSkills.add(skill.toLowerCase());
    }
  }
  if (publicProfile[0]?.skills) {
    const pubSkills = typeof publicProfile[0].skills === "string"
      ? JSON.parse(publicProfile[0].skills as string)
      : publicProfile[0].skills;
    for (const s of pubSkills as string[]) candidateSkills.add(s.toLowerCase());
  }

  const demandedSkills = await sql`
    SELECT requirement, COUNT(*) as frequency
    FROM job_requirements
    WHERE type = 'skill' AND category = 'must_have'
    GROUP BY requirement
    ORDER BY frequency DESC
    LIMIT 20
  `;

  const skillGaps: Array<{ skill: string; demand: number; hasIt: boolean }> = [];
  for (const row of demandedSkills) {
    const skill = row.requirement as string;
    const hasIt = candidateSkills.has(skill.toLowerCase()) ||
      Array.from(candidateSkills).some((cs) => skill.toLowerCase().includes(cs) || cs.includes(skill.toLowerCase()));
    skillGaps.push({ skill, demand: parseInt(row.frequency as string, 10), hasIt });
  }

  // --- Application Funnel ---
  const funnel = await sql`
    SELECT pipeline_stage, COUNT(*) as count
    FROM user_jobs WHERE user_id = ${userId} AND pipeline_stage != 'discovered'
    GROUP BY pipeline_stage
  `;
  const funnelData: Record<string, number> = {};
  for (const row of funnel) {
    funnelData[row.pipeline_stage as string] = parseInt(row.count as string, 10);
  }

  // --- Source Effectiveness ---
  const sourceStats = await sql`
    SELECT j.source,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE uj.pipeline_stage IN ('screen','interview','offer','accepted')) as advanced,
      AVG(uj.match_score) FILTER (WHERE uj.match_score IS NOT NULL) as avg_score
    FROM user_jobs uj JOIN jobs j ON j.id = uj.job_id
    WHERE uj.user_id = ${userId} AND j.source IS NOT NULL AND uj.pipeline_stage != 'discovered'
    GROUP BY j.source
    ORDER BY total DESC
    LIMIT 8
  `;

  // --- Company Type Patterns ---
  const companyPatterns = await sql`
    SELECT j.company,
      uj.pipeline_stage,
      uj.match_score
    FROM user_jobs uj JOIN jobs j ON j.id = uj.job_id
    WHERE uj.user_id = ${userId} AND uj.pipeline_stage IN ('screen','interview','offer','accepted')
    ORDER BY uj.match_score DESC NULLS LAST
    LIMIT 10
  `;

  // --- Match Score Distribution ---
  const scoreDist = await sql`
    SELECT
      CASE
        WHEN match_score >= 0.8 THEN '80-100%'
        WHEN match_score >= 0.6 THEN '60-79%'
        WHEN match_score >= 0.4 THEN '40-59%'
        WHEN match_score >= 0.2 THEN '20-39%'
        ELSE '0-19%'
      END as tier,
      COUNT(*) as count
    FROM user_jobs
    WHERE user_id = ${userId} AND match_score IS NOT NULL
    GROUP BY tier
    ORDER BY tier DESC
  `;

  // --- Weekly Activity ---
  const weeklyActivity = await sql`
    SELECT
      DATE_TRUNC('week', COALESCE(saved_at, applied_at))::date as week,
      COUNT(*) FILTER (WHERE pipeline_stage = 'saved') as saved,
      COUNT(*) FILTER (WHERE pipeline_stage IN ('applied','screen','interview','offer','accepted')) as applied
    FROM user_jobs
    WHERE user_id = ${userId}
      AND COALESCE(saved_at, applied_at) >= NOW() - INTERVAL '8 weeks'
      AND COALESCE(saved_at, applied_at) IS NOT NULL
    GROUP BY DATE_TRUNC('week', COALESCE(saved_at, applied_at))
    ORDER BY week ASC
  `;

  return NextResponse.json({
    profileStrength: { score: strengthScore, checks: strengthChecks },
    skillGaps,
    funnel: funnelData,
    sourceStats,
    companyPatterns,
    scoreDistribution: scoreDist,
    weeklyActivity,
    candidateSkillCount: candidateSkills.size,
  });
}
