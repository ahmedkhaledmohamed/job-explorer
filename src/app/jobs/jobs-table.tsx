"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatRelativeDate, STATUS_OPTIONS } from "@/lib/utils";
import type { Job } from "@/lib/db";

export function JobsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preparing, setPreparing] = useState(false);

  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const source = searchParams.get("source") || "";
  const topMatch = searchParams.get("top_match") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const sort = searchParams.get("sort") || "first_seen";
  const order = searchParams.get("order") || "desc";

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (topMatch) params.set("top_match", topMatch);
    params.set("page", String(page));
    params.set("limit", "20");
    params.set("sort", sort);
    params.set("order", order);

    const res = await fetch(`/api/jobs?${params}`);
    const data = await res.json();
    setJobs(data.jobs || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 0);
    setLoading(false);
  }, [q, status, source, topMatch, page, sort, order]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    if (!updates.page) {
      params.set("page", "1");
    }
    router.push(`/jobs?${params}`);
  }

  function handleSort(column: string) {
    if (sort === column) {
      updateParams({ sort: column, order: order === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: column, order: "desc" });
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === jobs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(jobs.map((j) => j.id)));
    }
  }

  async function bulkUpdateStatus(newStatus: string) {
    if (selected.size === 0) return;
    const promises = Array.from(selected).map((id) =>
      fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
    );
    await Promise.all(promises);
    setSelected(new Set());
    fetchJobs();
  }

  async function bulkToggleTopMatch(value: boolean) {
    if (selected.size === 0) return;
    const promises = Array.from(selected).map((id) =>
      fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ top_match: value }),
      })
    );
    await Promise.all(promises);
    setSelected(new Set());
    fetchJobs();
  }

  async function toggleJobTopMatch(e: React.MouseEvent, job: Job) {
    e.stopPropagation();
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ top_match: !job.top_match }),
    });
    if (res.ok) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, top_match: !j.top_match } : j
        )
      );
    }
  }

  async function prepareApplications() {
    if (selected.size === 0) return;
    setPreparing(true);

    try {
      const res = await fetch("/api/jobs/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: Array.from(selected) }),
      });
      const data = await res.json();

      if (data.results) {
        const applyableIds = data.results
          .filter((r: { canApply: boolean; jobId: string }) => r.canApply)
          .map((r: { jobId: string }) => r.jobId);

        if (applyableIds.length > 0) {
          router.push(`/apply?jobIds=${applyableIds.join(",")}`);
          return;
        }
      }

      fetchJobs();
    } catch {
      // Silently fail
    } finally {
      setPreparing(false);
    }
  }

  function SortIcon({ column }: { column: string }) {
    if (sort !== column) return null;
    return <span className="ml-1">{order === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search title or company..."
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ q: (e.target as HTMLInputElement).value });
            }
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={source}
          onChange={(e) => updateParams({ source: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sources</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="lever">Lever</option>
          <option value="ashby">Ashby</option>
          <option value="linkedin">LinkedIn</option>
          <option value="workday">Workday</option>
        </select>

        <button
          onClick={() => {
            if (topMatch === "true") updateParams({ top_match: "" });
            else updateParams({ top_match: "true" });
          }}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            topMatch === "true"
              ? "border-orange-400 bg-orange-50 text-orange-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {topMatch === "true" ? "★ Top Matches" : "☆ Top Matches"}
        </button>

        <span className="text-sm text-gray-500 ml-auto">
          {total} job{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
          <span className="text-sm font-medium text-blue-800">
            {selected.size} selected
          </span>
          <select
            onChange={(e) => {
              if (e.target.value) {
                bulkUpdateStatus(e.target.value);
                e.target.value = "";
              }
            }}
            className="rounded-md border border-blue-300 px-2 py-1 text-sm"
          >
            <option value="">Change status to...</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => bulkToggleTopMatch(true)}
            className="rounded-md border border-orange-300 bg-orange-50 px-2 py-1 text-sm text-orange-700 hover:bg-orange-100"
          >
            Mark Top Match
          </button>
          <button
            onClick={() => bulkToggleTopMatch(false)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            Unmark Top Match
          </button>
          <button
            onClick={prepareApplications}
            disabled={preparing}
            className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {preparing ? "Preparing..." : "Prepare Applications"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            Loading...
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            No jobs found
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === jobs.length && jobs.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-2 py-3 w-8"></th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("title")}
                >
                  Title
                  <SortIcon column="title" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("company")}
                >
                  Company
                  <SortIcon column="company" />
                </th>
                <th className="px-4 py-3">Location</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("source")}
                >
                  Source
                  <SortIcon column="source" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("first_seen")}
                >
                  First Seen
                  <SortIcon column="first_seen" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("status")}
                >
                  Status
                  <SortIcon column="status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName === "INPUT") return;
                    router.push(`/jobs/${job.id}`);
                  }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(job.id)}
                      onChange={() => toggleSelect(job.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={(e) => toggleJobTopMatch(e, job)}
                      className={`text-lg leading-none transition-colors ${
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
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-blue-600 hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {job.company}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {job.location || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {job.source || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatRelativeDate(job.first_seen)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={job.status} />
                      {job.form_ready === true && (
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-green-500"
                          title="Ready to submit"
                        />
                      )}
                      {job.form_ready === false && (
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-red-500"
                          title="Missing fields"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => updateParams({ page: String(page - 1) })}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => updateParams({ page: String(page + 1) })}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
