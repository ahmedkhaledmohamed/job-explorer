export const dynamic = "force-dynamic";

import { getDb, type Company } from "@/lib/db";
import { Nav } from "@/components/nav";
import Link from "next/link";

export default async function CompaniesPage() {
  const sql = getDb();

  const result = await sql`
    SELECT c.*, COUNT(j.id) as open_roles
    FROM companies c
    LEFT JOIN jobs j ON LOWER(j.company) = LOWER(c.name) AND j.last_seen >= NOW() - INTERVAL '14 days'
    GROUP BY c.id
    ORDER BY open_roles DESC, c.name
    LIMIT 100
  `;

  const companies = result as unknown as (Company & { open_roles: number })[];

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Companies</h1>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {companies.map((c) => (
            <Link
              key={c.id}
              href={`/companies/${c.slug}`}
              className="rounded-lg border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{c.name}</h2>
                  {c.industry && (
                    <p className="text-xs text-gray-500 mt-0.5">{c.industry}</p>
                  )}
                </div>
                {parseInt(String(c.open_roles)) > 0 && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {c.open_roles} open
                  </span>
                )}
              </div>
              {c.tech_stack?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.tech_stack.slice(0, 4).map((t) => (
                    <span key={t} className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {companies.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">
            No companies yet. Companies are auto-generated from job data.
          </p>
        )}
      </main>
    </div>
  );
}
