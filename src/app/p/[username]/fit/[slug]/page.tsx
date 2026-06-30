export const dynamic = "force-dynamic";

import { getDb, type FitNarrative, type FitMapping } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

type Props = { params: Promise<{ username: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  const sql = getDb();

  const pub = await sql`SELECT * FROM public_profiles WHERE username = ${username}`;
  if (pub.length === 0) return { title: "Not Found" };

  const fn = await sql`SELECT * FROM fit_narratives WHERE slug = ${slug} AND published = TRUE`;
  if (fn.length === 0) return { title: "Not Found" };

  const job = await sql`SELECT title, company FROM jobs WHERE id = ${fn[0].job_id}`;
  const profile = pub[0].profile_id
    ? await sql`SELECT full_name FROM apply_profile WHERE id = ${pub[0].profile_id}`
    : [];

  const name = profile[0]?.full_name || username;
  const jobTitle = job[0] ? `${job[0].title} at ${job[0].company}` : "Role";

  return {
    title: `${name} — Fit for ${jobTitle}`,
    description: fn[0].overall_narrative?.slice(0, 160) || `Why ${name} is a fit for ${jobTitle}`,
    openGraph: {
      title: `${name} — Fit for ${jobTitle}`,
      description: fn[0].overall_narrative?.slice(0, 160) || `Fit narrative`,
    },
  };
}

export default async function FitNarrativePage({ params }: Props) {
  const { username, slug } = await params;
  const sql = getDb();

  const pub = await sql`SELECT * FROM public_profiles WHERE username = ${username}`;
  if (pub.length === 0 || !pub[0].is_public) notFound();

  const fnResult = await sql`SELECT * FROM fit_narratives WHERE slug = ${slug} AND published = TRUE`;
  if (fnResult.length === 0) notFound();
  const fn = fnResult[0] as unknown as FitNarrative;

  const job = await sql`SELECT title, company, location FROM jobs WHERE id = ${fn.job_id}`;
  const profile = pub[0].profile_id
    ? await sql`SELECT full_name, current_title, current_company FROM apply_profile WHERE id = ${pub[0].profile_id}`
    : [];

  const name = profile[0]?.full_name || username;
  const mappings = (typeof fn.mappings === "string" ? JSON.parse(fn.mappings) : fn.mappings) as FitMapping[];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <Link href={`/p/${username}`} className="text-sm text-blue-600 hover:underline mb-4 inline-block">
            &larr; {name}&apos;s Profile
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Why {name} is a fit for
          </h1>
          <p className="text-xl text-gray-600 mt-1">
            {job[0]?.title} at {job[0]?.company}
          </p>
          {job[0]?.location && (
            <p className="text-sm text-gray-400 mt-1">{job[0].location as string}</p>
          )}
          {fn.confidence_score != null && (
            <div className="mt-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                fn.confidence_score >= 0.7 ? "bg-green-100 text-green-800" :
                fn.confidence_score >= 0.4 ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}>
                {Math.round(fn.confidence_score * 100)}% confidence
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        {/* Overall narrative */}
        {fn.overall_narrative && (
          <section>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
              {fn.overall_narrative}
            </div>
          </section>
        )}

        {/* Requirement mappings */}
        {mappings.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Requirement-by-Requirement Fit
            </h2>
            <div className="space-y-4">
              {mappings.map((m, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                      m.confidence === "high" ? "bg-green-500" :
                      m.confidence === "medium" ? "bg-yellow-500" :
                      "bg-red-400"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {m.requirement}
                      </p>
                      {m.case_study_title && (
                        <p className="text-xs text-blue-600 mt-1">
                          Evidence: {m.case_study_title}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        {m.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-3xl px-6 py-6 text-center text-xs text-gray-400">
          Fit narrative by {name} &middot; Powered by Job Explorer
        </div>
      </footer>
    </div>
  );
}
