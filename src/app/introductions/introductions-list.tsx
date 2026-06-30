"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

type Intro = {
  id: number;
  candidate_id: number;
  company_id: number;
  job_id: string | null;
  job_title: string | null;
  job_company: string | null;
  company_name: string;
  company_slug: string;
  initiated_by: string;
  match_score: number | null;
  status: string;
  message: string | null;
  created_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  response_message: string | null;
  outcome: string | null;
};

type RateLimit = { used: number; limit: number; remaining: number };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  viewed: "bg-blue-100 text-blue-800",
  responded: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

export function IntroductionsList() {
  const [intros, setIntros] = useState<Intro[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/introductions")
      .then((r) => r.json())
      .then((data) => {
        setIntros(data.introductions || []);
        setRateLimit(data.rateLimit || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Rate limit info */}
      {rateLimit && (
        <div className="rounded-lg border bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Weekly Express Interest Limit</p>
            <p className="text-xs text-gray-500">
              {rateLimit.remaining} of {rateLimit.limit} remaining this week
            </p>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: rateLimit.limit }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < rateLimit.used ? "bg-blue-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Introductions */}
      {intros.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 shadow-sm text-center">
          <p className="text-gray-500 mb-2">No introductions yet.</p>
          <p className="text-sm text-gray-400">
            Express interest on a job to send an introduction to the company.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {intros.map((intro) => (
            <div
              key={intro.id}
              className="rounded-lg border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  {intro.job_id ? (
                    <Link
                      href={`/jobs/${intro.job_id}`}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      {intro.job_title || "Role"}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-gray-900">
                      General Introduction
                    </span>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    <Link
                      href={`/companies/${intro.company_slug}`}
                      className="hover:underline"
                    >
                      {intro.company_name}
                    </Link>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {intro.match_score != null && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        intro.match_score >= 0.7
                          ? "bg-green-100 text-green-700"
                          : intro.match_score >= 0.4
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {Math.round(intro.match_score * 100)}%
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[intro.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {intro.status}
                  </span>
                </div>
              </div>

              {intro.message && (
                <p className="text-sm text-gray-600 mt-2">{intro.message}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span>Sent {formatDate(intro.created_at)}</span>
                {intro.viewed_at && <span>Viewed {formatDate(intro.viewed_at)}</span>}
                {intro.responded_at && (
                  <span>Responded {formatDate(intro.responded_at)}</span>
                )}
              </div>

              {intro.response_message && (
                <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
                  {intro.response_message}
                </div>
              )}

              {/* Outcome tracking */}
              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                <span className="text-xs text-gray-400">Outcome:</span>
                <select
                  value={intro.outcome || ""}
                  onChange={async (e) => {
                    const outcome = e.target.value;
                    await fetch(`/api/introductions/${intro.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ outcome: outcome || null }),
                    });
                    setIntros((prev) =>
                      prev.map((x) => x.id === intro.id ? { ...x, outcome } : x)
                    );
                  }}
                  className="rounded border border-gray-300 px-2 py-0.5 text-xs"
                >
                  <option value="">Not set</option>
                  <option value="no_response">No response</option>
                  <option value="rejected">Rejected</option>
                  <option value="screen">Phone screen</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="hired">Hired</option>
                </select>
                {intro.outcome && (
                  <span className={`text-xs font-medium ${
                    ["interview","offer","hired"].includes(intro.outcome) ? "text-green-600" :
                    intro.outcome === "rejected" || intro.outcome === "no_response" ? "text-red-500" :
                    "text-gray-500"
                  }`}>
                    {intro.outcome.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
