export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { formatRelativeDate } from "@/lib/utils";
import { Nav } from "@/components/nav";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { BarChart } from "@/components/bar-chart";
import Link from "next/link";
import { auth } from "@/auth";

async function getUserId(): Promise<number> {
  const session = await auth();
  if (session?.user?.id) return parseInt(session.user.id);
  const sql = getDb();
  const result = await sql`SELECT id FROM users ORDER BY id LIMIT 1`;
  return (result[0]?.id as number) || 1;
}

async function getStats() {
  const sql = getDb();
  const userId = await getUserId();

  const [totalResult, newThisWeekResult, appliedResult, companiesResult, topMatchResult] =
    await Promise.all([
      sql`SELECT COUNT(*) as count FROM jobs`,
      sql`SELECT COUNT(*) as count FROM jobs WHERE first_seen >= NOW() - INTERVAL '7 days'`,
      sql`SELECT COUNT(*) as count FROM user_jobs WHERE user_id = ${userId} AND status = 'applied'`,
      sql`SELECT COUNT(DISTINCT company) as count FROM jobs`,
      sql`SELECT COUNT(*) as count FROM user_jobs WHERE user_id = ${userId} AND top_match = TRUE`,
    ]);

  const total = parseInt(totalResult[0]?.count || "0", 10);
  const newThisWeek = parseInt(newThisWeekResult[0]?.count || "0", 10);
  const applied = parseInt(appliedResult[0]?.count || "0", 10);
  const companiesTracked = parseInt(companiesResult[0]?.count || "0", 10);
  const topMatches = parseInt(topMatchResult[0]?.count || "0", 10);

  const topCompanies = await sql`
    SELECT company, COUNT(*) as count FROM jobs
    GROUP BY company ORDER BY count DESC LIMIT 10
  `;

  const jobsPerWeek = await sql`
    SELECT DATE_TRUNC('week', first_seen)::date as week, COUNT(*) as count
    FROM jobs WHERE first_seen >= NOW() - INTERVAL '8 weeks'
    GROUP BY DATE_TRUNC('week', first_seen) ORDER BY week ASC
  `;

  const recentJobs = await sql`SELECT * FROM jobs ORDER BY first_seen DESC LIMIT 5`;

  // Top matches by score for this user
  const topMatchJobs = await sql`
    SELECT j.id, j.title, j.company, j.source, j.first_seen, uj.match_score
    FROM user_jobs uj JOIN jobs j ON j.id = uj.job_id
    WHERE uj.user_id = ${userId} AND uj.match_score IS NOT NULL AND uj.match_score > 0
    ORDER BY uj.match_score DESC LIMIT 5
  `;

  return {
    total, newThisWeek, applied, companiesTracked, topMatches,
    topCompanies: topCompanies.map((r) => ({ company: r.company as string, count: parseInt(r.count as string, 10) })),
    jobsPerWeek: jobsPerWeek.map((r) => ({ week: r.week as string, count: parseInt(r.count as string, 10) })),
    recentJobs,
    topMatchJobs,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <StatCard label="Total Jobs" value={stats.total} />
          <StatCard label="New This Week" value={stats.newThisWeek} />
          <StatCard label="Top Matches" value={stats.topMatches} />
          <StatCard label="Applied" value={stats.applied} />
          <StatCard label="Companies" value={stats.companiesTracked} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Jobs Per Week (Last 8 Weeks)
            </h2>
            <BarChart data={stats.jobsPerWeek} />
          </div>

          {/* Top scored matches */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Your Top Matches
            </h2>
            {stats.topMatchJobs.length === 0 ? (
              <p className="text-sm text-gray-400">
                Parse requirements on jobs to see match scores here.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.topMatchJobs.map((job) => (
                  <Link
                    key={job.id as string}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.title as string}</p>
                      <p className="text-xs text-gray-500">{job.company as string}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      (job.match_score as number) >= 0.7 ? "bg-green-100 text-green-800" :
                      (job.match_score as number) >= 0.4 ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {Math.round((job.match_score as number) * 100)}%
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Top Companies</h2>
            {stats.topCompanies.length === 0 ? (
              <p className="text-sm text-gray-400">No data yet</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="pb-2">Company</th>
                    <th className="pb-2 text-right">Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topCompanies.map((c) => (
                    <tr key={c.company} className="border-b last:border-0">
                      <td className="py-2 text-sm text-gray-900">{c.company}</td>
                      <td className="py-2 text-sm text-gray-600 text-right">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-500">Recent Jobs</h2>
              <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-800">View all</Link>
            </div>
            {stats.recentJobs.length === 0 ? (
              <p className="text-sm text-gray-400">No jobs yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.recentJobs.map((job) => (
                  <Link
                    key={job.id as string}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.title as string}</p>
                      <p className="text-xs text-gray-500">{job.company as string} &middot; {formatRelativeDate(job.first_seen as string)}</p>
                    </div>
                    <StatusBadge status={(job.status as string) || "new"} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
