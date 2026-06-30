export const dynamic = "force-dynamic";

import { getDb, type CaseStudy } from "@/lib/db";
import { Nav } from "@/components/nav";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function CaseStudiesPage() {
  const sql = getDb();
  const result = await sql`SELECT * FROM case_studies ORDER BY created_at DESC`;
  const studies = result as unknown as CaseStudy[];

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Case Studies</h1>
          <Link
            href="/case-studies/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            New Case Study
          </Link>
        </div>

        {studies.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 shadow-sm text-center">
            <p className="text-gray-500 mb-4">
              No case studies yet. Case studies demonstrate your thinking to
              hiring managers — not just what you did, but how you decided and
              why.
            </p>
            <Link
              href="/case-studies/new"
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Create your first case study &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {studies.map((study) => (
              <Link
                key={study.id}
                href={`/case-studies/${study.id}`}
                className="block rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {study.title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {[study.role, study.company].filter(Boolean).join(" @ ") ||
                        "No role/company"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {study.published ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
                {study.situation && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {study.situation}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  {study.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {study.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {study.skills.length > 4 && (
                        <span className="text-xs text-gray-400">
                          +{study.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatDate(study.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
