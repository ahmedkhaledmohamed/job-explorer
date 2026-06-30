"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, STATUS_OPTIONS } from "@/lib/utils";
import type { Job } from "@/lib/db";

const ATS_SOURCES = ["greenhouse", "lever", "ashby"];

export function JobDetail({ job: initialJob }: { job: Job }) {
  const [job, setJob] = useState<Job>(initialJob);
  const [notes, setNotes] = useState(job.notes || "");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const canAutoApply =
    job.ats_job_id &&
    ATS_SOURCES.includes((job.source || "").toLowerCase());

  async function updateStatus(newStatus: string) {
    setSaving(true);
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setJob(updated);
    }
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      const updated = await res.json();
      setJob(updated);
    }
    setSaving(false);
  }

  async function handleApply() {
    setApplying(true);
    setApplyResult(null);

    const res = await fetch(`/api/apply/${job.id}`, {
      method: "POST",
    });
    const result = await res.json();

    setApplyResult(result);

    if (result.success || res.ok) {
      const jobRes = await fetch(`/api/jobs/${job.id}`);
      if (jobRes.ok) {
        const updated = await jobRes.json();
        setJob(updated);
      }
    }

    setApplying(false);
  }

  return (
    <div>
      <Link
        href="/jobs"
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Back to Jobs
      </Link>

      {/* Header */}
      <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-lg text-gray-600 mt-1">{job.company}</p>
            {job.location && (
              <p className="text-sm text-gray-500 mt-1">{job.location}</p>
            )}
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {job.source && (
            <span>
              Source: <span className="font-medium">{job.source}</span>
            </span>
          )}
          <span>
            First seen:{" "}
            <span className="font-medium">{formatDate(job.first_seen)}</span>
          </span>
          <span>
            Last seen:{" "}
            <span className="font-medium">{formatDate(job.last_seen)}</span>
          </span>
          {job.applied_at && (
            <span>
              Applied:{" "}
              <span className="font-medium">
                {formatDate(job.applied_at)}
              </span>
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            View Original Posting &rarr;
          </a>

          {canAutoApply && job.status !== "applied" && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {applying ? "Applying..." : "Auto-Apply"}
            </button>
          )}
        </div>

        {applyResult && (
          <div
            className={`mt-3 rounded-md p-3 text-sm ${
              applyResult.success
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {applyResult.success
              ? applyResult.message
              : applyResult.error || "Application failed"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Description */}
        <div className="lg:col-span-2 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            Description
          </h2>
          {job.description ? (
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          ) : (
            <p className="text-sm text-gray-400">No description available</p>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Status</h2>
            <select
              value={job.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={saving}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Add notes about this job..."
              rows={6}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {saving && (
              <p className="text-xs text-gray-400 mt-1">Saving...</p>
            )}
          </div>

          {/* Details */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Job ID</dt>
                <dd className="text-gray-900 font-mono text-xs">{job.id}</dd>
              </div>
              {job.ats_job_id && (
                <div>
                  <dt className="text-gray-500">ATS Job ID</dt>
                  <dd className="text-gray-900 font-mono text-xs">
                    {job.ats_job_id}
                  </dd>
                </div>
              )}
              {job.posted_date && (
                <div>
                  <dt className="text-gray-500">Posted</dt>
                  <dd className="text-gray-900">
                    {formatDate(job.posted_date)}
                  </dd>
                </div>
              )}
              {job.resume_version && (
                <div>
                  <dt className="text-gray-500">Resume Version</dt>
                  <dd className="text-gray-900">{job.resume_version}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
