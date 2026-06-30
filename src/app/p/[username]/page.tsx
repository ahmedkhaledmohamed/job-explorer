export const dynamic = "force-dynamic";

import { getDb, type PublicProfile, type ApplyProfile, type CaseStudy, type ExperienceEntry } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const sql = getDb();
  const result = await sql`SELECT * FROM public_profiles WHERE username = ${username}`;
  if (result.length === 0) return { title: "Not Found" };

  const pub = result[0];
  const profileResult = pub.profile_id
    ? await sql`SELECT full_name, location_city, location_country FROM apply_profile WHERE id = ${pub.profile_id}`
    : [];
  const profile = profileResult[0];
  const name = profile?.full_name || username;

  return {
    title: `${name} — ${pub.headline || "Profile"}`,
    description: pub.summary || `${name}'s professional profile`,
    openGraph: {
      title: `${name} — ${pub.headline || "Profile"}`,
      description: pub.summary || `${name}'s professional profile`,
      type: "profile",
    },
  };
}

function JsonLd({ name, headline, location, url, links }: {
  name: string; headline: string; location: string; url: string;
  links: { linkedin?: string; github?: string; website?: string };
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: headline,
    address: location ? { "@type": "PostalAddress", addressLocality: location } : undefined,
    url,
    sameAs: [links.linkedin, links.github, links.website].filter(Boolean),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const sql = getDb();

  const pubResult = await sql`SELECT * FROM public_profiles WHERE username = ${username}`;
  if (pubResult.length === 0 || !pubResult[0].is_public) notFound();
  const pub = pubResult[0] as unknown as PublicProfile;

  // Fetch the apply_profile for contact/links
  let profile: ApplyProfile | null = null;
  if (pub.profile_id) {
    const pResult = await sql`SELECT * FROM apply_profile WHERE id = ${pub.profile_id}`;
    if (pResult.length > 0) profile = pResult[0] as unknown as ApplyProfile;
  }

  // Fetch published case studies
  const csResult = await sql`SELECT * FROM case_studies WHERE published = TRUE ORDER BY created_at DESC`;
  const caseStudies = csResult as unknown as CaseStudy[];

  const name = profile?.full_name || username;
  const location = [profile?.location_city, profile?.location_state, profile?.location_country]
    .filter(Boolean).join(", ");
  const experience = (typeof pub.experience === "string" ? JSON.parse(pub.experience) : pub.experience) as ExperienceEntry[];
  const skills = (typeof pub.skills === "string" ? JSON.parse(pub.skills) : pub.skills) as string[];

  return (
    <div className="min-h-screen bg-white">
      <JsonLd
        name={name}
        headline={pub.headline || ""}
        location={location}
        url={`/p/${username}`}
        links={{
          linkedin: profile?.linkedin_url || undefined,
          github: profile?.github_url || undefined,
          website: profile?.personal_website || undefined,
        }}
      />

      {/* Header */}
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {name}
          </h1>
          {pub.headline && (
            <p className="text-lg text-gray-600 mt-2">{pub.headline}</p>
          )}
          {location && (
            <p className="text-sm text-gray-400 mt-1">{location}</p>
          )}

          {/* Links */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {profile?.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline">LinkedIn</a>
            )}
            {profile?.github_url && (
              <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:underline">GitHub</a>
            )}
            {profile?.portfolio_url && (
              <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:underline">Portfolio</a>
            )}
            {profile?.personal_website && (
              <a href={profile.personal_website} target="_blank" rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:underline">Website</a>
            )}
            {profile?.email && (
              <a href={`mailto:${profile.email}`}
                className="text-sm text-gray-600 hover:underline">{profile.email}</a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-12">
        {/* Summary */}
        {pub.summary && (
          <section>
            <p className="text-gray-700 leading-relaxed text-base">
              {pub.summary}
            </p>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Experience
            </h2>
            <div className="space-y-6">
              {experience.map((exp, i) => (
                <div key={i} className="relative pl-6 border-l-2 border-gray-200">
                  <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-gray-300" />
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold text-gray-900">{exp.title}</h3>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      {exp.start} – {exp.end || "Present"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{exp.company}</p>
                  {exp.highlights?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.highlights.map((h, j) => (
                        <li key={j} className="text-sm text-gray-600">
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
                  {exp.case_study_slugs?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {exp.case_study_slugs.map((slug) => {
                        const cs = caseStudies.find((c) => c.slug === slug);
                        if (!cs) return null;
                        return (
                          <Link
                            key={slug}
                            href={`/p/${username}/cases/${slug}`}
                            className="inline-flex items-center text-xs text-blue-600 hover:underline"
                          >
                            Case Study: {cs.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Case Studies */}
        {caseStudies.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Case Studies
            </h2>
            <div className="space-y-4">
              {caseStudies.map((cs) => (
                <div key={cs.id} className="rounded-lg border p-5 hover:shadow-sm transition-shadow">
                  <h3 className="font-semibold text-gray-900">{cs.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[cs.role, cs.company].filter(Boolean).join(" @ ")}
                  </p>
                  {cs.situation && (
                    <p className="text-sm text-gray-600 mt-2">
                      {cs.situation}
                    </p>
                  )}
                  {cs.decisions?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {cs.decisions.map((d, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-gray-700">
                            {d.decision}
                          </span>
                          {d.outcome && (
                            <span className="text-gray-500">
                              {" → "}{d.outcome}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {cs.metrics && Object.keys(cs.metrics).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {Object.entries(cs.metrics).map(([key, val]) => (
                        <div key={key} className="text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {val}
                          </div>
                          <div className="text-xs text-gray-400">
                            {key.replace(/_/g, " ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {cs.skills?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {cs.skills.map((s) => (
                        <span key={s} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {profile?.university && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Education
            </h2>
            <div>
              <p className="font-medium text-gray-900">
                {profile.degree || profile.highest_education}
                {profile.field_of_study ? `, ${profile.field_of_study}` : ""}
              </p>
              <p className="text-sm text-gray-500">
                {profile.university}
                {profile.graduation_year ? ` · ${profile.graduation_year}` : ""}
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-3xl px-6 py-6 text-center text-xs text-gray-400">
          Profile powered by Job Explorer
        </div>
      </footer>
    </div>
  );
}
