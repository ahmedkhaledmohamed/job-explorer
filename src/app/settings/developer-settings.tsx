"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";

const INPUT = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

type ApiKeyInfo = { id: number; key_prefix: string; name: string; permissions: string[]; last_used: string | null; created_at: string };
type WebhookInfo = { id: number; url: string; events: string[]; active: boolean; created_at: string };
type BoardInfo = { id: number; name: string; board_type: string; config: Record<string, string>; last_synced: string | null; job_count: number; active: boolean; created_at: string };

const BOARD_TYPES = [
  { value: "greenhouse", label: "Greenhouse", configField: "board_token", inputLabel: "Company slug", placeholder: "anthropic", help: "Find it in the URL: boards.greenhouse.io/anthropic/jobs" },
  { value: "lever", label: "Lever", configField: "company_slug", inputLabel: "Company slug", placeholder: "shopify", help: "Find it in the URL: jobs.lever.co/shopify" },
  { value: "ashby", label: "Ashby", configField: "board_id", inputLabel: "Board ID", placeholder: "linear", help: "Find it in the URL: jobs.ashbyhq.com/linear" },
  { value: "workable", label: "Workable", configField: "subdomain", inputLabel: "Subdomain", placeholder: "revolut", help: "Find it in the URL: apply.workable.com/revolut" },
  { value: "smartrecruiters", label: "SmartRecruiters", configField: "company_id", inputLabel: "Company ID", placeholder: "Shopify", help: "Find it in the URL: jobs.smartrecruiters.com/Shopify" },
  { value: "wellfound", label: "Wellfound", configField: "url", inputLabel: "Jobs page URL", placeholder: "https://wellfound.com/company/notion/jobs", help: "Paste the company's Wellfound jobs page URL" },
  { value: "workday", label: "Workday / Career Site", configField: "url", inputLabel: "Career page URL", placeholder: "https://amazon.jobs", help: "Paste any company careers page — AI extracts job listings" },
];

export function DeveloperSettings() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [hooks, setHooks] = useState<WebhookInfo[]>([]);
  const [boards, setBoards] = useState<BoardInfo[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newHookUrl, setNewHookUrl] = useState("");
  const [newBoardType, setNewBoardType] = useState("greenhouse");
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardConfig, setNewBoardConfig] = useState("");
  const [syncing, setSyncing] = useState<number | null>(null);
  const [syncResult, setSyncResult] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/keys").then((r) => r.json()),
      fetch("/api/webhooks").then((r) => r.json()),
      fetch("/api/boards").then((r) => r.json()),
    ]).then(([k, h, b]) => {
      setKeys(k || []);
      setHooks(h || []);
      setBoards(b || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function createKey() {
    if (!newKeyName.trim()) return;
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName, permissions: ["read:profile", "read:jobs"] }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewKey(data.key);
      setNewKeyName("");
      const updated = await fetch("/api/keys").then((r) => r.json());
      setKeys(updated);
    }
  }

  async function deleteKey(id: number) {
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  async function createWebhook() {
    if (!newHookUrl.trim()) return;
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: newHookUrl, events: ["introduction.created", "introduction.updated", "match.computed"] }),
    });
    if (res.ok) {
      setNewHookUrl("");
      const updated = await fetch("/api/webhooks").then((r) => r.json());
      setHooks(updated);
    }
  }

  async function deleteWebhook(id: number) {
    await fetch(`/api/webhooks?id=${id}`, { method: "DELETE" });
    setHooks((prev) => prev.filter((h) => h.id !== id));
  }

  async function addBoard() {
    if (!newBoardName.trim() || !newBoardConfig.trim()) return;
    const bt = BOARD_TYPES.find((t) => t.value === newBoardType);
    const config: Record<string, string> = bt
      ? { [bt.configField]: newBoardConfig.trim() }
      : { board_id: newBoardConfig.trim() };
    if (["wellfound", "workday"].includes(newBoardType)) {
      config.name = newBoardName.trim();
    }
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBoardName, board_type: newBoardType, config }),
    });
    if (res.ok) {
      setNewBoardName("");
      setNewBoardConfig("");
      const updated = await fetch("/api/boards").then((r) => r.json());
      setBoards(updated);
    }
  }

  async function deleteBoard(id: number) {
    await fetch(`/api/boards?id=${id}`, { method: "DELETE" });
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }

  async function syncBoardNow(id: number) {
    setSyncing(id);
    setSyncResult("");
    try {
      const res = await fetch(`/api/boards/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Synced ${data.total} jobs (${data.inserted} new, ${data.updated} updated)`);
        const updated = await fetch("/api/boards").then((r) => r.json());
        setBoards(updated);
      } else {
        setSyncResult(`Error: ${data.error}`);
      }
    } catch { setSyncResult("Sync failed"); }
    setSyncing(null);
  }

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>;

  const selectedBoardType = BOARD_TYPES.find((t) => t.value === newBoardType);

  return (
    <div className="space-y-6">
      {/* Connected Boards */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">Connected Job Boards</h2>
        <p className="text-xs text-gray-400">
          Connect to job boards and career sites. No API keys needed — just enter the company slug or paste a URL.
        </p>

        {boards.map((b) => (
          <div key={b.id} className="flex items-center justify-between border rounded-md p-3 bg-gray-50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{b.name}</p>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{b.board_type}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {b.job_count} jobs
                {b.last_synced ? ` · Last synced ${formatDate(b.last_synced)}` : " · Never synced"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => syncBoardNow(b.id)}
                disabled={syncing === b.id}
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {syncing === b.id ? "Syncing..." : "Sync"}
              </button>
              <button onClick={() => deleteBoard(b.id)} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
          </div>
        ))}

        {syncResult && (
          <div className={`rounded-md p-2 text-xs ${syncResult.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {syncResult}
          </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-medium text-gray-600">Add a board</p>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Platform</label>
                <select
                  value={newBoardType}
                  onChange={(e) => { setNewBoardType(e.target.value); setNewBoardConfig(""); }}
                  className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm"
                >
                  {BOARD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Display name</label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g. Anthropic, Stripe"
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {selectedBoardType?.inputLabel || "Board ID"}
              </label>
              <input
                type="text"
                value={newBoardConfig}
                onChange={(e) => setNewBoardConfig(e.target.value)}
                placeholder={selectedBoardType?.placeholder || ""}
                className={INPUT}
              />
              {selectedBoardType?.help && (
                <p className="text-[11px] text-gray-400 mt-1">{selectedBoardType.help}</p>
              )}
            </div>
          </div>
          <button
            onClick={addBoard}
            disabled={!newBoardName.trim() || !newBoardConfig.trim()}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Add Board
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">API Keys</h2>
        <p className="text-xs text-gray-400">
          Use API keys to access the public API at <code className="bg-gray-100 px-1 rounded">/api/v1/</code>
        </p>

        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between border rounded-md p-3 bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-900">{k.name}</p>
              <p className="text-xs text-gray-500 font-mono">{k.key_prefix}...</p>
              <p className="text-xs text-gray-400">
                Created {formatDate(k.created_at)}
                {k.last_used ? ` · Last used ${formatDate(k.last_used)}` : " · Never used"}
              </p>
            </div>
            <button onClick={() => deleteKey(k.id)} className="text-xs text-red-500 hover:underline">Delete</button>
          </div>
        ))}

        {newKey && (
          <div className="rounded-md bg-green-50 p-3 border border-green-200">
            <p className="text-xs text-green-800 font-medium">New key created — copy it now, it won&apos;t be shown again:</p>
            <code className="text-xs text-green-900 font-mono block mt-1 break-all">{newKey}</code>
          </div>
        )}

        <div className="flex gap-2">
          <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Key name (e.g. My App)" className={INPUT} onKeyDown={(e) => e.key === "Enter" && createKey()} />
          <button onClick={createKey} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 whitespace-nowrap">Create Key</button>
        </div>
      </div>

      {/* Webhooks */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">Webhooks</h2>
        <p className="text-xs text-gray-400">
          Get notified when introductions are created/updated, matches are computed, or new jobs arrive.
        </p>

        {hooks.map((h) => (
          <div key={h.id} className="flex items-center justify-between border rounded-md p-3 bg-gray-50">
            <div>
              <p className="text-sm font-mono text-gray-700 break-all">{h.url}</p>
              <div className="flex gap-1 mt-1">
                {h.events.map((e) => (
                  <span key={e} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{e}</span>
                ))}
              </div>
            </div>
            <button onClick={() => deleteWebhook(h.id)} className="text-xs text-red-500 hover:underline ml-2">Delete</button>
          </div>
        ))}

        <div className="flex gap-2">
          <input type="url" value={newHookUrl} onChange={(e) => setNewHookUrl(e.target.value)} placeholder="https://your-app.com/webhook" className={INPUT} onKeyDown={(e) => e.key === "Enter" && createWebhook()} />
          <button onClick={createWebhook} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 whitespace-nowrap">Add Webhook</button>
        </div>
      </div>

      {/* Export */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">Data Export</h2>
        <p className="text-xs text-gray-400">Download your profile, case studies, and public profile data.</p>
        <div className="flex gap-3">
          <a href="/api/export?format=json" download className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Export JSON</a>
          <a href="/api/export?format=markdown" download className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Export Markdown</a>
        </div>
      </div>

      {/* API Docs */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Public API v1</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">GET</code>
            <div>
              <code className="text-gray-700">/api/v1/profiles/[username]</code>
              <p className="text-xs text-gray-400">Public profile with case studies. API key unlocks contact info.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">GET</code>
            <div>
              <code className="text-gray-700">/api/v1/companies/[slug]</code>
              <p className="text-xs text-gray-400">Company profile with open roles.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">GET</code>
            <div>
              <code className="text-gray-700">/api/v1/jobs?q=&company=&limit=&offset=</code>
              <p className="text-xs text-gray-400">Search active jobs. No auth required.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
