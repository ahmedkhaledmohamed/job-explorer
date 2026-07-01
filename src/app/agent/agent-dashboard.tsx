"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

type Task = {
  id: number; job_id: string; status: string; score: number | null;
  gaps: Array<{ field: string; label: string; required: boolean }>;
  result: Record<string, unknown>; error: string | null;
  created_at: string; updated_at: string;
  job_title: string; job_company: string; job_url: string;
};
type Stats = { submitted: number; needs_input: number; failed: number; in_progress: number; total: number };
type Settings = { threshold: number; max_per_day: number; digest_enabled: boolean; digest_email: string };

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-100 text-gray-600",
  scoring: "bg-blue-100 text-blue-700",
  preparing: "bg-blue-100 text-blue-700",
  needs_input: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700",
  submitting: "bg-blue-100 text-blue-700",
  submitted: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
};

export function AgentDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<Settings>({ threshold: 0.5, max_per_day: 5, digest_enabled: false, digest_email: "" });
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [autoApplying, setAutoApplying] = useState(false);
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/agent/tasks");
    const data = await res.json();
    setTasks(data.tasks || []);
    setStats(data.stats || null);
    if (data.settings) setSettings(data.settings);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function scoreNew() {
    setScoring(true); setMessage("");
    const res = await fetch("/api/agent/score-new", { method: "POST" });
    const data = await res.json();
    setMessage(data.error || `Scored ${data.scored} jobs`);
    setScoring(false);
    fetchData();
  }

  async function autoApply() {
    setAutoApplying(true); setMessage("");
    const res = await fetch("/api/agent/auto-apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    setMessage(`Processed ${data.total || 0} jobs`);
    setAutoApplying(false);
    fetchData();
  }

  async function retryTask(taskId: number) {
    await fetch(`/api/agent/retry/${taskId}`, { method: "POST" });
    fetchData();
  }

  async function saveSettings() {
    await fetch("/api/agent/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setMessage("Settings saved");
    setTimeout(() => setMessage(""), 2000);
  }

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Loading agent...</div>;

  const needsInput = tasks.filter((t) => t.status === "needs_input");

  return (
    <div className="space-y-6">
      {/* Stats + Actions */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-lg border bg-white p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-gray-900">{stats?.total || 0}</div>
          <div className="text-xs text-gray-500">Total Tasks</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-green-600">{stats?.submitted || 0}</div>
          <div className="text-xs text-gray-500">Submitted</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-orange-600">{stats?.needs_input || 0}</div>
          <div className="text-xs text-gray-500">Needs Input</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-blue-600">{stats?.in_progress || 0}</div>
          <div className="text-xs text-gray-500">In Progress</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-red-500">{stats?.failed || 0}</div>
          <div className="text-xs text-gray-500">Failed</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={scoreNew} disabled={scoring} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
          {scoring ? "Scoring..." : "Score New Jobs"}
        </button>
        <button onClick={autoApply} disabled={autoApplying} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
          {autoApplying ? "Applying..." : "Auto-Apply Top Matches"}
        </button>
        {message && <span className="text-sm text-gray-500">{message}</span>}
      </div>

      {/* Needs Input */}
      {needsInput.length > 0 && (
        <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-orange-800">Needs Your Input ({needsInput.length})</h2>
          <p className="text-xs text-orange-600">These applications are blocked on missing profile fields. Fill them and retry.</p>
          {needsInput.map((t) => (
            <div key={t.id} className="rounded-md border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/jobs/${t.job_id}`} className="text-sm font-medium text-blue-600 hover:underline">{t.job_title}</Link>
                  <p className="text-xs text-gray-500">{t.job_company}</p>
                </div>
                <button onClick={() => retryTask(t.id)} className="rounded-md bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-400">Retry</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.gaps.map((g) => (
                  <span key={g.field} className="rounded bg-red-50 px-2 py-0.5 text-[10px] text-red-600">{g.label}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Queue */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-sm font-medium text-gray-500">Task Queue</h2>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">No tasks yet. Delegate jobs from the job detail page or click &ldquo;Auto-Apply Top Matches&rdquo;.</p>
        ) : (
          <div className="divide-y">
            {tasks.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[t.status] || "bg-gray-100 text-gray-600"}`}>
                  {t.status.replace("_", " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <Link href={`/jobs/${t.job_id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block">{t.job_title}</Link>
                  <span className="text-xs text-gray-500">{t.job_company}</span>
                </div>
                {t.score != null && (
                  <span className="text-xs text-gray-400">{Math.round(t.score * 100)}%</span>
                )}
                <span className="text-xs text-gray-400">{formatDate(t.updated_at)}</span>
                {t.error && <span className="text-xs text-red-500 truncate max-w-[150px]" title={t.error}>{t.error}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent Settings */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">Agent Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Match threshold for auto-apply</label>
            <div className="flex items-center gap-2">
              <input type="range" min="0" max="100" value={settings.threshold * 100} onChange={(e) => setSettings((s) => ({ ...s, threshold: parseInt(e.target.value) / 100 }))} className="flex-1" />
              <span className="text-sm font-medium text-gray-700 w-10">{Math.round(settings.threshold * 100)}%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max applications per day</label>
            <input type="number" value={settings.max_per_day} onChange={(e) => setSettings((s) => ({ ...s, max_per_day: parseInt(e.target.value) || 5 }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.digest_enabled} onChange={(e) => setSettings((s) => ({ ...s, digest_enabled: e.target.checked }))} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Daily email digest</span>
            </label>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Digest email</label>
            <input type="email" value={settings.digest_email} onChange={(e) => setSettings((s) => ({ ...s, digest_email: e.target.value }))}
              placeholder="your@email.com" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={saveSettings} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">Save Settings</button>
      </div>
    </div>
  );
}
