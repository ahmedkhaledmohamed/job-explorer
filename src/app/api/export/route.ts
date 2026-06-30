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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  const sql = getDb();
  const userId = await getUserId();

  const profile = await sql`SELECT * FROM apply_profile WHERE user_id = ${userId} ORDER BY id LIMIT 1`;
  const caseStudies = await sql`SELECT * FROM case_studies WHERE user_id = ${userId} AND published = TRUE ORDER BY created_at DESC`;
  const publicProfile = await sql`SELECT * FROM public_profiles WHERE user_id = ${userId}`;

  const exportData = {
    profile: profile[0] || null,
    case_studies: caseStudies,
    public_profile: publicProfile[0] || null,
    exported_at: new Date().toISOString(),
  };

  if (format === "markdown") {
    const p = profile[0];
    const md = [
      `# ${p?.full_name || "Profile"}`,
      p?.current_title ? `> ${p.current_title}${p?.current_company ? ` at ${p.current_company}` : ""}` : "",
      "",
      publicProfile[0]?.summary ? `${publicProfile[0].summary}\n` : "",
      "## Contact",
      p?.email ? `- Email: ${p.email}` : "",
      p?.phone ? `- Phone: ${p.phone}` : "",
      p?.linkedin_url ? `- LinkedIn: ${p.linkedin_url}` : "",
      p?.github_url ? `- GitHub: ${p.github_url}` : "",
      p?.location_city ? `- Location: ${[p.location_city, p.location_country].filter(Boolean).join(", ")}` : "",
      "",
      caseStudies.length > 0 ? "## Case Studies\n" : "",
      ...caseStudies.map((cs) => [
        `### ${cs.title}`,
        cs.role && cs.company ? `*${cs.role} at ${cs.company}*\n` : "",
        cs.situation ? `**Situation:** ${cs.situation}\n` : "",
        cs.approach ? `**Approach:** ${cs.approach}\n` : "",
        (cs.skills as string[])?.length > 0 ? `**Skills:** ${(cs.skills as string[]).join(", ")}\n` : "",
        "",
      ].join("\n")),
    ].filter(Boolean).join("\n");

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${(p?.full_name || "profile").replace(/\s/g, "-").toLowerCase()}-profile.md"`,
      },
    });
  }

  return NextResponse.json(exportData, {
    headers: {
      "Content-Disposition": "attachment; filename=profile-export.json",
    },
  });
}
