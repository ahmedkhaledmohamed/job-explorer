"use client";

import { useState, useEffect } from "react";

const SELECT = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const WORK_STYLE_OPTIONS = {
  communication: ["Async-first", "Sync-heavy", "Balanced"],
  autonomy: ["High autonomy", "Guided with check-ins", "Collaborative/pairing"],
  meeting_frequency: ["Minimal (1-3/week)", "Moderate (4-6/week)", "Meeting-heavy"],
  decision_making: ["Top-down", "Consensus-driven", "Empowered teams"],
  work_hours: ["Strict 9-5", "Flexible hours", "Results-only"],
};

const TEAM_PREF_OPTIONS = {
  team_size: ["Small (2-5)", "Medium (6-15)", "Large (15+)"],
  product_stage: ["Early stage/0→1", "Growth/scaling", "Mature/optimization"],
  company_size: ["Startup (<50)", "Mid-size (50-500)", "Enterprise (500+)"],
  remote_preference: ["Fully remote", "Hybrid", "In-office", "No preference"],
};

const GROWTH_OPTIONS = [
  "Technical depth", "People leadership", "Product strategy", "Domain expertise",
  "Executive presence", "Cross-functional impact", "Entrepreneurship",
  "System design", "Mentoring others", "Building from scratch",
];

const VALUE_OPTIONS = [
  "Transparency", "Autonomy", "Innovation", "Work-life balance", "Impact at scale",
  "Diversity & inclusion", "Learning culture", "Meritocracy", "Collaboration",
  "Speed of execution", "Quality over speed", "User obsession",
];

const DEAL_BREAKER_OPTIONS = [
  "No remote option", "Excessive meetings", "Micromanagement", "No growth path",
  "Toxic culture", "Below-market compensation", "Relocation required",
  "On-call heavy", "Legacy tech only", "No product influence",
];

type FormData = {
  work_style: Record<string, string>;
  team_preferences: Record<string, string>;
  growth_priorities: string[];
  deal_breakers: string[];
  values: string[];
};

const EMPTY: FormData = {
  work_style: {}, team_preferences: {},
  growth_priorities: [], deal_breakers: [], values: [],
};

export function PreferencesForm() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/preferences").then((r) => r.json()).then((data) => {
      if (data) {
        setForm({
          work_style: (typeof data.work_style === "string" ? JSON.parse(data.work_style) : data.work_style) || {},
          team_preferences: (typeof data.team_preferences === "string" ? JSON.parse(data.team_preferences) : data.team_preferences) || {},
          growth_priorities: data.growth_priorities || [],
          deal_breakers: data.deal_breakers || [],
          values: data.values || [],
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  }

  function toggleItem(field: "growth_priorities" | "deal_breakers" | "values", item: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((x) => x !== item)
        : [...prev[field], item],
    }));
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Work Style */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">How You Work</h2>
        {Object.entries(WORK_STYLE_OPTIONS).map(([key, options]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
              {key.replace(/_/g, " ")}
            </label>
            <select
              value={form.work_style[key] || ""}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                work_style: { ...prev.work_style, [key]: e.target.value },
              }))}
              className={SELECT}
            >
              <option value="">Select...</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Team Preferences */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">Team & Company</h2>
        {Object.entries(TEAM_PREF_OPTIONS).map(([key, options]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
              {key.replace(/_/g, " ")}
            </label>
            <select
              value={form.team_preferences[key] || ""}
              onChange={(e) => setForm((prev) => ({
                ...prev,
                team_preferences: { ...prev.team_preferences, [key]: e.target.value },
              }))}
              className={SELECT}
            >
              <option value="">Select...</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Growth Priorities */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-medium text-gray-500">Growth Priorities</h2>
        <p className="text-xs text-gray-400">What do you want to develop next?</p>
        <div className="flex flex-wrap gap-2">
          {GROWTH_OPTIONS.map((g) => (
            <button
              key={g} type="button"
              onClick={() => toggleItem("growth_priorities", g)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                form.growth_priorities.includes(g)
                  ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >{g}</button>
          ))}
        </div>
      </div>

      {/* Values */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-medium text-gray-500">Values You Care About</h2>
        <div className="flex flex-wrap gap-2">
          {VALUE_OPTIONS.map((v) => (
            <button
              key={v} type="button"
              onClick={() => toggleItem("values", v)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                form.values.includes(v)
                  ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >{v}</button>
          ))}
        </div>
      </div>

      {/* Deal Breakers */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-medium text-gray-500">Deal Breakers</h2>
        <p className="text-xs text-gray-400">Things that would make you decline regardless of other factors.</p>
        <div className="flex flex-wrap gap-2">
          {DEAL_BREAKER_OPTIONS.map((d) => (
            <button
              key={d} type="button"
              onClick={() => toggleItem("deal_breakers", d)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                form.deal_breakers.includes(d)
                  ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >{d}</button>
          ))}
        </div>
      </div>

      {saved && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
          Preferences saved
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave} disabled={saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
