"use client";

import { useState, useEffect } from "react";

type Check = { label: string; done: boolean };
type SkillGap = { skill: string; demand: number; hasIt: boolean };
type SourceStat = { source: string; total: number; advanced: number; avg_score: number | null };
type CompanyPattern = { company: string; pipeline_stage: string; match_score: number | null };
type ScoreTier = { tier: string; count: number };
type WeekActivity = { week: string; saved: number; applied: number };

type InsightsData = {
  profileStrength: { score: number; checks: Check[] };
  skillGaps: SkillGap[];
  funnel: Record<string, number>;
  sourceStats: SourceStat[];
  companyPatterns: CompanyPattern[];
  scoreDistribution: ScoreTier[];
  weeklyActivity: WeekActivity[];
  candidateSkillCount: number;
};

const FUNNEL_STAGES = ["saved", "applied", "screen", "interview", "offer", "accepted"];

export function InsightsDashboard() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Loading insights...</div>;
  if (!data) return <div className="text-sm text-gray-400 py-12 text-center">No data available.</div>;

  const { profileStrength, skillGaps, funnel, sourceStats, companyPatterns, scoreDistribution, weeklyActivity } = data;
  const missing = profileStrength.checks.filter((c) => !c.done);
  const gaps = skillGaps.filter((s) => !s.hasIt);
  const covered = skillGaps.filter((s) => s.hasIt);

  return (
    <div className="space-y-6">
      {/* Profile Strength */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-500">Profile Strength</h2>
          <span className={`text-2xl font-bold ${profileStrength.score >= 75 ? "text-green-600" : profileStrength.score >= 50 ? "text-yellow-600" : "text-red-500"}`}>
            {profileStrength.score}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full mb-4">
          <div className={`h-3 rounded-full transition-all ${profileStrength.score >= 75 ? "bg-green-500" : profileStrength.score >= 50 ? "bg-yellow-500" : "bg-red-400"}`} style={{ width: `${profileStrength.score}%` }} />
        </div>
        {missing.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Missing:</p>
            <div className="flex flex-wrap gap-2">
              {missing.map((c) => (
                <span key={c.label} className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-600">
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Skill Gap Analysis */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            Skill Demand vs. Your Profile
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Top required skills across all jobs. Green = you have it, Red = gap.
          </p>
          <div className="space-y-2">
            {skillGaps.slice(0, 12).map((s) => (
              <div key={s.skill} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.hasIt ? "bg-green-500" : "bg-red-400"}`} />
                <span className="text-sm text-gray-700 flex-1 truncate">{s.skill}</span>
                <span className="text-xs text-gray-400">{s.demand}x</span>
              </div>
            ))}
          </div>
          {gaps.length > 0 && (
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t">
              {gaps.length} skill gap{gaps.length !== 1 ? "s" : ""} · {covered.length} covered
            </p>
          )}
        </div>

        {/* Application Funnel */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Application Funnel</h2>
          {Object.values(funnel).some((v) => v > 0) ? (
            <div className="space-y-3">
              {FUNNEL_STAGES.map((stage) => {
                const count = funnel[stage] || 0;
                const maxCount = Math.max(...Object.values(funnel), 1);
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 capitalize">{stage}</span>
                      <span className="text-xs font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No pipeline activity yet.</p>
          )}
        </div>

        {/* Source Effectiveness */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Source Effectiveness</h2>
          {sourceStats.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <th className="pb-2">Source</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Advanced</th>
                  <th className="pb-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {(sourceStats as SourceStat[]).map((s) => (
                  <tr key={s.source} className="border-b last:border-0">
                    <td className="py-2 text-sm text-gray-900">{s.source}</td>
                    <td className="py-2 text-sm text-gray-600 text-right">{s.total}</td>
                    <td className="py-2 text-sm text-gray-600 text-right">{s.advanced}</td>
                    <td className="py-2 text-sm text-right font-medium">
                      {s.total > 0 ? Math.round((s.advanced / s.total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400">Apply to jobs to see source effectiveness.</p>
          )}
        </div>

        {/* Match Score Distribution */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Match Score Distribution</h2>
          {scoreDistribution.length > 0 ? (
            <div className="space-y-2">
              {(scoreDistribution as ScoreTier[]).map((tier) => (
                <div key={tier.tier} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-16">{tier.tier}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded">
                    <div className={`h-4 rounded transition-all ${
                      tier.tier.startsWith("80") ? "bg-green-500" :
                      tier.tier.startsWith("60") ? "bg-green-400" :
                      tier.tier.startsWith("40") ? "bg-yellow-400" :
                      "bg-red-300"
                    }`} style={{ width: `${Math.min(100, (tier.count / Math.max(...(scoreDistribution as ScoreTier[]).map((t) => t.count), 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-900 w-8 text-right">{tier.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Run match scoring on jobs to see distribution.</p>
          )}
        </div>
      </div>

      {/* Companies where you advanced */}
      {companyPatterns.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Where You Advanced</h2>
          <div className="flex flex-wrap gap-3">
            {(companyPatterns as CompanyPattern[]).map((cp, i) => (
              <div key={i} className="rounded-md border p-3 text-center min-w-[120px]">
                <p className="text-sm font-medium text-gray-900">{cp.company}</p>
                <p className="text-xs text-blue-600 capitalize">{cp.pipeline_stage}</p>
                {cp.match_score != null && (
                  <p className="text-xs text-gray-400">{Math.round(cp.match_score * 100)}% match</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Activity */}
      {weeklyActivity.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Weekly Activity</h2>
          <div className="flex items-end gap-2 h-24">
            {(weeklyActivity as WeekActivity[]).map((w) => {
              const total = w.saved + w.applied;
              const maxH = Math.max(...(weeklyActivity as WeekActivity[]).map((x) => x.saved + x.applied), 1);
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center">
                    {w.applied > 0 && (
                      <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(w.applied / maxH) * 80}px` }} />
                    )}
                    {w.saved > 0 && (
                      <div className="w-full bg-yellow-400 rounded-t" style={{ height: `${(w.saved / maxH) * 80}px` }} />
                    )}
                    {total === 0 && <div className="w-full bg-gray-200 rounded" style={{ height: "2px" }} />}
                  </div>
                  <span className="text-[9px] text-gray-400">{new Date(w.week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-yellow-400" /> Saved</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" /> Applied</span>
          </div>
        </div>
      )}
    </div>
  );
}
