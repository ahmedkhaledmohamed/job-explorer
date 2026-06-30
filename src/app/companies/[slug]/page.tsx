export const dynamic = "force-dynamic";

import { getDb, type Company } from "@/lib/db";
import { Nav } from "@/components/nav";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sql = getDb();
  const result = await sql`SELECT name, description FROM companies WHERE slug = ${slug}`;
  if (result.length === 0) return { title: "Not Found" };
  return {
    title: `${result[0].name} — Company Profile`,
    description: (result[0].description as string) || `Jobs and culture at ${result[0].name}`,
  };
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params;
  const sql = getDb();

  const result = await sql`SELECT * FROM companies WHERE slug = ${slug}`;
  if (result.length === 0) notFound();
  const company = result[0] as unknown as Company;

  const roles = await sql`
    SELECT id, title, location, source, first_seen, posted_date
    FROM jobs
    WHERE LOWER(company) = LOWER(${company.name})
      AND last_seen >= NOW() - INTERVAL '14 days'
    ORDER BY first_seen DESC
  `;

  const requirements = await sql`
    SELECT jr.requirement, jr.category, jr.type, COUNT(*) as frequency
    FROM job_requirements jr JOIN jobs j ON j.id = jr.job_id
    WHERE LOWER(j.company) = LOWER(${company.name})
    GROUP BY jr.requirement, jr.category, jr.type
    ORDER BY frequency DESC LIMIT 15
  `;

  const locations = await sql`
    SELECT location, COUNT(*) as count
    FROM jobs WHERE LOWER(company) = LOWER(${company.name}) AND location IS NOT NULL
    GROUP BY location ORDER BY count DESC
  `;

  const totalJobs = await sql`
    SELECT COUNT(*) as count FROM jobs WHERE LOWER(company) = LOWER(${company.name})
  `;

  const velocity = company.hiring_velocity as Record<string, unknown> || {};
  const cultureSignals = company.culture_signals as Record<string, unknown> || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/companies" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          &larr; All Companies
        </Link>

        {/* Header */}
        <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                {company.industry && <span>{company.industry}</span>}
                {company.size_category && <span>&middot; {company.size_category}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{roles.length}</div>
              <div className="text-xs text-gray-500">Open Roles</div>
            </div>
          </div>
          {company.description && (
            <p className="text-sm text-gray-600 mt-3">{company.description}</p>
          )}

          {/* Quick stats */}
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
            <span>{parseInt(totalJobs[0]?.count as string || "0")} total jobs tracked</span>
            {velocity.first_seen ? (
              <span>Tracking since {formatDate(velocity.first_seen as string)}</span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Open Roles */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="text-sm font-medium text-gray-500 mb-4">Open Roles</h2>
              {roles.length === 0 ? (
                <p className="text-sm text-gray-400">No currently open roles.</p>
              ) : (
                <div className="space-y-3">
                  {roles.map((role) => (
                    <Link
                      key={role.id as string}
                      href={`/jobs/${role.id}`}
                      className="block rounded-md border p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{role.title as string}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {(role.location as string) || "Location not specified"}
                            {role.source && <span> &middot; {role.source as string}</span>}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(role.posted_date as string || role.first_seen as string)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Common Requirements */}
            {requirements.length > 0 && (
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-sm font-medium text-gray-500 mb-4">
                  Common Requirements Across Roles
                </h2>
                <div className="space-y-2">
                  {requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] ${
                        req.category === "must_have" ? "bg-red-50 text-red-600" :
                        req.category === "nice_to_have" ? "bg-yellow-50 text-yellow-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {(req.category as string).replace("_", " ")}
                      </span>
                      <span className="text-gray-700">{req.requirement as string}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {req.frequency as number}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Locations */}
            {locations.length > 0 && (
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-sm font-medium text-gray-500 mb-3">Locations</h2>
                <div className="space-y-1">
                  {locations.map((loc, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{loc.location as string}</span>
                      <span className="text-xs text-gray-400">{loc.count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tech Stack */}
            {company.tech_stack?.length > 0 && (
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-sm font-medium text-gray-500 mb-3">Tech Stack</h2>
                <div className="flex flex-wrap gap-2">
                  {company.tech_stack.map((t) => (
                    <span key={t} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Culture Signals */}
            {Object.keys(cultureSignals).length > 0 && (
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h2 className="text-sm font-medium text-gray-500 mb-3">Culture Signals</h2>
                <div className="space-y-2">
                  {Object.entries(cultureSignals).map(([signal, count]) => (
                    <div key={signal} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{signal}</span>
                      <span className="text-xs text-gray-400">{String(count)}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
