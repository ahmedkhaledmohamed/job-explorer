"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, STATUS_OPTIONS } from "@/lib/utils";
import type { Job, JobMaterials, JobRequirement, FitNarrative, FitMapping, RoleContext } from "@/lib/db";

const ATS_SOURCES = ["greenhouse", "lever", "ashby"];

type FormInfo = {
  ready: boolean;
  missingCount: number;
} | null;

export function JobDetail({
  job: initialJob,
  formInfo: initialFormInfo,
  materials: initialMaterials,
  requirements: initialRequirements,
  fitNarrative: initialFitNarrative,
  roleContext,
}: {
  job: Job;
  formInfo?: FormInfo;
  materials?: JobMaterials[];
  requirements?: JobRequirement[];
  fitNarrative?: FitNarrative | null;
  roleContext?: RoleContext | null;
}) {
  const [job, setJob] = useState<Job>(initialJob);
  const [notes, setNotes] = useState(job.notes || "");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [formInfo] = useState<FormInfo>(initialFormInfo || null);
  const [applyResult, setApplyResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const [materials, setMaterials] = useState<JobMaterials[]>(
    initialMaterials || []
  );
  const [requirements, setRequirements] = useState<JobRequirement[]>(
    initialRequirements || []
  );
  const [fitNarrative, setFitNarrative] = useState<FitNarrative | null>(
    initialFitNarrative ?? null
  );
  const [generatingFit, setGeneratingFit] = useState(false);
  const [mutualMatching, setMutualMatching] = useState(false);
  type MutualResult = { candidate_to_job: { score: number; strengths: string[]; gaps: string[] }; job_to_candidate: { score: number; strengths: string[]; concerns: string[] }; overall_score: number; summary: string };
  const [mutualResult, setMutualResult] = useState<MutualResult | null>(
    job.match_details && (job.match_details as Record<string, unknown>).mutual
      ? job.match_details as unknown as MutualResult : null
  );
  const [parsing, setParsing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [genVariant, setGenVariant] = useState<"pm" | "em">("pm");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [expandedSection, setExpandedSection] = useState<
    "resume" | "cover" | null
  >(null);
  const [copied, setCopied] = useState("");

  const canAutoApply =
    job.ats_job_id && ATS_SOURCES.includes((job.source || "").toLowerCase());

  const currentMaterial = materials.find(
    (m) => m.resume_variant === genVariant
  );

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

  async function toggleTopMatch() {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ top_match: !job.top_match }),
    });
    if (res.ok) {
      const updated = await res.json();
      setJob(updated);
    }
  }

  async function updateResumeVersion(version: string) {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_version: version || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setJob(updated);
    }
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

  async function generateMaterials() {
    setGenerating(true);
    setGenError("");

    try {
      const res = await fetch(`/api/jobs/${job.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: genVariant }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGenError(data.error || "Generation failed");
        return;
      }

      setMaterials((prev) => {
        const filtered = prev.filter((m) => m.resume_variant !== genVariant);
        return [...filtered, data as JobMaterials];
      });
      setExpandedSection("resume");
    } catch {
      setGenError("Network error");
    } finally {
      setGenerating(false);
    }
  }

  async function runMutualMatch() {
    setMutualMatching(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/mutual-match`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMutualResult(data);
        setJob((prev) => ({ ...prev, match_score: data.overall_score }));
      }
    } catch { /* ignore */ }
    setMutualMatching(false);
  }

  async function generateFitNarrative() {
    setGeneratingFit(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/fit-narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) setFitNarrative(data);
    } catch { /* ignore */ }
    setGeneratingFit(false);
  }

  async function togglePublishFit() {
    if (!fitNarrative) return;
    const res = await fetch(`/api/jobs/${job.id}/fit-narrative`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !fitNarrative.published }),
    });
    if (res.ok) {
      const data = await res.json();
      setFitNarrative(data);
    }
  }

  async function parseRequirements() {
    setParsing(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse" }),
      });
      const data = await res.json();
      if (res.ok) setRequirements(data.requirements || []);
    } catch { /* ignore */ }
    setParsing(false);
  }

  async function matchRequirements() {
    setMatching(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "match" }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequirements(data.requirements || []);
        setJob((prev) => ({ ...prev, match_score: data.match_score }));
      }
    } catch { /* ignore */ }
    setMatching(false);
  }

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
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
          <div className="flex items-start gap-3">
            <button
              onClick={toggleTopMatch}
              className={`mt-1 text-2xl leading-none transition-colors ${
                job.top_match
                  ? "text-orange-400 hover:text-orange-500"
                  : "text-gray-300 hover:text-orange-400"
              }`}
              title={
                job.top_match ? "Remove top match" : "Mark as top match"
              }
            >
              {job.top_match ? "★" : "☆"}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-lg text-gray-600 mt-1">{job.company}</p>
              {job.location && (
                <p className="text-sm text-gray-500 mt-1">{job.location}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {job.match_score != null && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  job.match_score >= 0.7
                    ? "bg-green-100 text-green-800"
                    : job.match_score >= 0.4
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {Math.round(job.match_score * 100)}% match
              </span>
            )}
            <StatusBadge status={job.status} />
          </div>
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

        {formInfo && (
          <div className="mt-3">
            {formInfo.ready ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                Ready to submit
              </span>
            ) : (
              <Link
                href={`/apply?jobIds=${job.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-red-700 hover:underline"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                {formInfo.missingCount} field
                {formInfo.missingCount !== 1 ? "s" : ""} need
                {formInfo.missingCount === 1 ? "s" : ""} answers &rarr; Review
              </Link>
            )}
          </div>
        )}

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

      {/* Requirements */}
      <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-500">Requirements Analysis</h2>
          <div className="flex items-center gap-2">
            {requirements.length === 0 ? (
              <button
                onClick={parseRequirements}
                disabled={parsing || !job.description}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {parsing ? "Parsing..." : "Parse Requirements"}
              </button>
            ) : (
              <>
                <button
                  onClick={matchRequirements}
                  disabled={matching}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {matching ? "Matching..." : requirements.some((r) => r.match_status !== "pending") ? "Re-Match" : "Match Profile"}
                </button>
                <button
                  onClick={parseRequirements}
                  disabled={parsing}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {parsing ? "..." : "Re-Parse"}
                </button>
              </>
            )}
          </div>
        </div>

        {requirements.length === 0 && !job.description && (
          <p className="text-sm text-gray-400">No description available to parse.</p>
        )}

        {requirements.length === 0 && job.description && (
          <p className="text-sm text-gray-400">Click &ldquo;Parse Requirements&rdquo; to extract structured requirements from the job description.</p>
        )}

        {requirements.length > 0 && (
          <div className="space-y-3">
            {(["must_have", "nice_to_have", "inferred"] as const).map((cat) => {
              const items = requirements.filter((r) => r.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {cat === "must_have" ? "Must Have" : cat === "nice_to_have" ? "Nice to Have" : "Inferred"}
                    <span className="ml-1 text-gray-300">({items.length})</span>
                  </h3>
                  <div className="space-y-1.5">
                    {items.map((req) => (
                      <div key={req.id} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                          req.match_status === "matched" ? "bg-green-500" :
                          req.match_status === "partial" ? "bg-yellow-500" :
                          req.match_status === "unmatched" ? "bg-red-400" :
                          "bg-gray-300"
                        }`} />
                        <div className="flex-1">
                          <span className="text-gray-700">{req.requirement}</span>
                          <span className="ml-1.5 inline-flex items-center rounded px-1 py-0.5 text-[10px] bg-gray-100 text-gray-500">
                            {req.type}
                          </span>
                          {req.match_evidence && (
                            <p className="text-xs text-gray-400 mt-0.5">{req.match_evidence}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {job.match_score != null && (
              <div className="pt-3 border-t text-sm text-gray-600">
                <span className="font-medium">Overall Match:</span>{" "}
                <span className={`font-bold ${
                  job.match_score >= 0.7 ? "text-green-700" :
                  job.match_score >= 0.4 ? "text-yellow-700" :
                  "text-red-600"
                }`}>
                  {Math.round(job.match_score * 100)}%
                </span>
                {job.match_details && typeof job.match_details === "object" && "summary" in job.match_details && (
                  <span className="text-gray-400 ml-2">
                    — {String(job.match_details.summary)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Context (company-authored) */}
      {roleContext && (
        <div className="rounded-lg border bg-white p-6 shadow-sm mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-4">What Success Looks Like</h2>
          <div className="space-y-4 text-sm">
            {roleContext.first_90_days && (
              <div>
                <h3 className="font-medium text-gray-700 mb-1">First 90 Days</h3>
                <p className="text-gray-600">{roleContext.first_90_days}</p>
              </div>
            )}
            {roleContext.team_context && (
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Team Context</h3>
                <p className="text-gray-600">{roleContext.team_context}</p>
              </div>
            )}
            {roleContext.challenges && (
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Key Challenges</h3>
                <p className="text-gray-600">{roleContext.challenges}</p>
              </div>
            )}
            {roleContext.success_criteria && (
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Success Criteria</h3>
                <p className="text-gray-600">{roleContext.success_criteria}</p>
              </div>
            )}
          </div>
        </div>
      )}

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

          {/* Pipeline Stage */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Pipeline</h2>
            <select
              value={job.pipeline_stage || "discovered"}
              onChange={async (e) => {
                const res = await fetch(`/api/jobs/${job.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pipeline_stage: e.target.value, status: e.target.value }),
                });
                if (res.ok) setJob(await res.json());
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {["discovered", "saved", "applied", "screen", "interview", "offer", "accepted", "rejected"].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Mutual Match */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Mutual Match</h2>
            <button
              onClick={runMutualMatch}
              disabled={mutualMatching}
              className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 mb-3"
            >
              {mutualMatching ? "Matching..." : mutualResult ? "Re-Match" : "Run Mutual Match"}
            </button>
            {mutualResult && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">You → Job</span>
                  <span className={`font-bold ${mutualResult.candidate_to_job.score >= 0.7 ? "text-green-600" : mutualResult.candidate_to_job.score >= 0.4 ? "text-yellow-600" : "text-red-500"}`}>
                    {Math.round(mutualResult.candidate_to_job.score * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Job → You</span>
                  <span className={`font-bold ${mutualResult.job_to_candidate.score >= 0.7 ? "text-green-600" : mutualResult.job_to_candidate.score >= 0.4 ? "text-yellow-600" : "text-red-500"}`}>
                    {Math.round(mutualResult.job_to_candidate.score * 100)}%
                  </span>
                </div>
                <div className="border-t pt-2">
                  <p className="text-xs text-gray-600">{mutualResult.summary}</p>
                </div>
                {mutualResult.candidate_to_job.strengths.length > 0 && (
                  <div>
                    <p className="text-xs text-green-700 font-medium">Strengths</p>
                    {mutualResult.candidate_to_job.strengths.map((s, i) => (
                      <p key={i} className="text-xs text-gray-500 mt-0.5">+ {s}</p>
                    ))}
                  </div>
                )}
                {mutualResult.job_to_candidate.concerns.length > 0 && (
                  <div>
                    <p className="text-xs text-red-600 font-medium">Concerns</p>
                    {mutualResult.job_to_candidate.concerns.map((c, i) => (
                      <p key={i} className="text-xs text-gray-500 mt-0.5">- {c}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resume Variant */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Resume</h2>
            <select
              value={job.resume_version || ""}
              onChange={(e) => updateResumeVersion(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select resume...</option>
              <option value="pm">PM Resume</option>
              <option value="em">EM Resume</option>
              <option value="custom">Custom (generated)</option>
            </select>
          </div>

          {/* AI Materials */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              AI Materials
            </h2>
            <div className="flex items-center gap-2 mb-3">
              <select
                value={genVariant}
                onChange={(e) => setGenVariant(e.target.value as "pm" | "em")}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm flex-1"
              >
                <option value="pm">PM variant</option>
                <option value="em">EM variant</option>
              </select>
              <button
                onClick={generateMaterials}
                disabled={generating || !job.description}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {generating
                  ? "Generating..."
                  : currentMaterial
                    ? "Regenerate"
                    : "Generate"}
              </button>
            </div>
            {!job.description && (
              <p className="text-xs text-gray-400">
                No job description — generation unavailable
              </p>
            )}
            {genError && (
              <p className="text-xs text-red-600 mb-2">{genError}</p>
            )}
            {currentMaterial && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Generated via {currentMaterial.generation_model}
                </p>
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "resume" ? null : "resume"
                    )
                  }
                  className="w-full text-left text-sm font-medium text-blue-600 hover:underline"
                >
                  {expandedSection === "resume"
                    ? "▾ Tailored Resume"
                    : "▸ Tailored Resume"}
                </button>
                {expandedSection === "resume" &&
                  currentMaterial.tailored_resume && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          copyText(currentMaterial.tailored_resume!, "resume")
                        }
                        className="absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-600"
                      >
                        {copied === "resume" ? "Copied!" : "Copy"}
                      </button>
                      <pre className="bg-gray-50 border rounded p-3 text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {currentMaterial.tailored_resume}
                      </pre>
                    </div>
                  )}
                <button
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "cover" ? null : "cover"
                    )
                  }
                  className="w-full text-left text-sm font-medium text-blue-600 hover:underline"
                >
                  {expandedSection === "cover"
                    ? "▾ Cover Letter"
                    : "▸ Cover Letter"}
                </button>
                {expandedSection === "cover" &&
                  currentMaterial.cover_letter && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          copyText(currentMaterial.cover_letter!, "cover")
                        }
                        className="absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-600"
                      >
                        {copied === "cover" ? "Copied!" : "Copy"}
                      </button>
                      <pre className="bg-gray-50 border rounded p-3 text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {currentMaterial.cover_letter}
                      </pre>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Fit Narrative */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              Fit Narrative
            </h2>
            {requirements.length === 0 ? (
              <p className="text-xs text-gray-400">
                Parse requirements first to generate a fit narrative.
              </p>
            ) : (
              <>
                <button
                  onClick={generateFitNarrative}
                  disabled={generatingFit}
                  className="w-full rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50 mb-3"
                >
                  {generatingFit
                    ? "Generating..."
                    : fitNarrative
                      ? "Regenerate"
                      : "Generate Fit Narrative"}
                </button>
                {fitNarrative && (
                  <div className="space-y-2">
                    {fitNarrative.overall_narrative && (
                      <p className="text-xs text-gray-600 line-clamp-4">
                        {fitNarrative.overall_narrative}
                      </p>
                    )}
                    {fitNarrative.mappings && (
                      <p className="text-xs text-gray-400">
                        {(typeof fitNarrative.mappings === "string"
                          ? JSON.parse(fitNarrative.mappings)
                          : fitNarrative.mappings
                        ).length}{" "}
                        requirements mapped
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <button
                        onClick={togglePublishFit}
                        className={`text-xs px-2 py-1 rounded ${
                          fitNarrative.published
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {fitNarrative.published ? "Published" : "Publish"}
                      </button>
                      {fitNarrative.published && (
                        <a
                          href={`/p/ahmed-khaled/fit/${fitNarrative.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View public link
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
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
