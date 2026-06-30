"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type PipelineJob = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  source: string | null;
  pipeline_stage: string;
  match_score: number | null;
  applied_at: string | null;
  notes: string | null;
  outcome: string | null;
};

type Analytics = {
  totalApplied: number;
  totalResponded: number;
  responseRate: number;
  sourceConversion: Array<{ source: string; applied: number; advanced: number }>;
};

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  saved: { label: "Saved", color: "border-yellow-300 bg-yellow-50" },
  applied: { label: "Applied", color: "border-blue-300 bg-blue-50" },
  screen: { label: "Screen", color: "border-purple-300 bg-purple-50" },
  interview: { label: "Interview", color: "border-indigo-300 bg-indigo-50" },
  offer: { label: "Offer", color: "border-green-300 bg-green-50" },
  accepted: { label: "Accepted", color: "border-emerald-300 bg-emerald-50" },
  rejected: { label: "Rejected", color: "border-red-200 bg-red-50" },
};

const ACTIVE_STAGES = ["saved", "applied", "screen", "interview", "offer"];

export function PipelineBoard() {
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [byStage, setByStage] = useState<Record<string, number>>({});
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    const res = await fetch("/api/pipeline");
    const data = await res.json();
    setJobs(data.activeJobs || []);
    setByStage(data.byStage || {});
    setAnalytics(data.analytics || null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  async function moveJob(jobId: string, newStage: string) {
    setMovingId(jobId);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_stage: newStage, status: newStage }),
    });
    await fetchPipeline();
    setMovingId(null);
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Loading pipeline...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Analytics bar */}
      {analytics && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900">{analytics.totalApplied}</div>
            <div className="text-xs text-gray-500">Applied</div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-gray-900">{analytics.totalResponded}</div>
            <div className="text-xs text-gray-500">Responded</div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm text-center">
            <div className={`text-2xl font-bold ${analytics.responseRate >= 20 ? "text-green-600" : analytics.responseRate >= 10 ? "text-yellow-600" : "text-red-500"}`}>
              {analytics.responseRate}%
            </div>
            <div className="text-xs text-gray-500">Response Rate</div>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ACTIVE_STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const stageJobs = jobs.filter((j) => j.pipeline_stage === stage);

          return (
            <div key={stage} className="flex-shrink-0 w-64">
              <div className={`rounded-t-lg border-t-4 ${config.color} px-3 py-2 flex items-center justify-between`}>
                <h3 className="text-sm font-semibold text-gray-700">{config.label}</h3>
                <span className="text-xs text-gray-400 bg-white rounded-full px-2 py-0.5">
                  {byStage[stage] || stageJobs.length}
                </span>
              </div>
              <div className="bg-gray-100 rounded-b-lg p-2 min-h-[200px] space-y-2">
                {stageJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`rounded-md border bg-white p-3 shadow-sm ${movingId === job.id ? "opacity-50" : ""}`}
                  >
                    <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2">
                      {job.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{job.company}</p>
                    {job.match_score != null && (
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-1 ${
                        job.match_score >= 0.7 ? "bg-green-100 text-green-700" :
                        job.match_score >= 0.4 ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {Math.round(job.match_score * 100)}%
                      </span>
                    )}
                    {/* Stage navigation */}
                    <div className="flex items-center gap-1 mt-2 border-t pt-2">
                      {ACTIVE_STAGES.indexOf(stage) > 0 && (
                        <button
                          onClick={() => moveJob(job.id, ACTIVE_STAGES[ACTIVE_STAGES.indexOf(stage) - 1])}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                          title="Move back"
                        >
                          ← {STAGE_CONFIG[ACTIVE_STAGES[ACTIVE_STAGES.indexOf(stage) - 1]].label}
                        </button>
                      )}
                      <span className="flex-1" />
                      {ACTIVE_STAGES.indexOf(stage) < ACTIVE_STAGES.length - 1 && (
                        <button
                          onClick={() => moveJob(job.id, ACTIVE_STAGES[ACTIVE_STAGES.indexOf(stage) + 1])}
                          className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                          title="Advance"
                        >
                          {STAGE_CONFIG[ACTIVE_STAGES[ACTIVE_STAGES.indexOf(stage) + 1]].label} →
                        </button>
                      )}
                      <button
                        onClick={() => moveJob(job.id, "rejected")}
                        className="text-[10px] text-red-400 hover:text-red-600 ml-1"
                        title="Reject"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {stageJobs.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">No jobs</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Source conversion table */}
      {analytics && analytics.sourceConversion.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Conversion by Source</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="pb-2">Source</th>
                <th className="pb-2 text-right">Applied</th>
                <th className="pb-2 text-right">Advanced</th>
                <th className="pb-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics.sourceConversion.map((s) => (
                <tr key={s.source as string} className="border-b last:border-0">
                  <td className="py-2 text-sm text-gray-900">{s.source as string}</td>
                  <td className="py-2 text-sm text-gray-600 text-right">{s.applied as number}</td>
                  <td className="py-2 text-sm text-gray-600 text-right">{s.advanced as number}</td>
                  <td className="py-2 text-sm text-right font-medium">
                    {(s.applied as number) > 0 ? Math.round(((s.advanced as number) / (s.applied as number)) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
