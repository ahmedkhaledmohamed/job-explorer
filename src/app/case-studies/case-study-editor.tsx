"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseStudy, CaseStudyDecision } from "@/lib/db";

const INPUT =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

type FormData = {
  title: string;
  company: string;
  role: string;
  situation: string;
  approach: string;
  decisions: CaseStudyDecision[];
  metrics: Record<string, string>;
  reflections: string;
  skills: string[];
  published: boolean;
};

const EMPTY: FormData = {
  title: "",
  company: "",
  role: "",
  situation: "",
  approach: "",
  decisions: [],
  metrics: {},
  reflections: "",
  skills: [],
  published: false,
};

function fromCaseStudy(cs: CaseStudy): FormData {
  return {
    title: cs.title || "",
    company: cs.company || "",
    role: cs.role || "",
    situation: cs.situation || "",
    approach: cs.approach || "",
    decisions: cs.decisions || [],
    metrics: cs.metrics || {},
    reflections: cs.reflections || "",
    skills: cs.skills || [],
    published: cs.published,
  };
}

export function CaseStudyEditor({
  initial,
}: {
  initial?: CaseStudy;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(
    initial ? fromCaseStudy(initial) : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [metricKey, setMetricKey] = useState("");
  const [metricVal, setMetricVal] = useState("");

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.title) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");

    const url = initial
      ? `/api/case-studies/${initial.id}`
      : "/api/case-studies";
    const method = initial ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/case-studies/${data.id}`);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
    setSaving(false);
  }

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/case-studies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiPrompt }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      setForm({
        title: data.title || form.title,
        company: data.company || form.company,
        role: data.role || form.role,
        situation: data.situation || "",
        approach: data.approach || "",
        decisions: data.decisions || [],
        metrics: data.metrics || {},
        reflections: data.reflections || "",
        skills: data.skills || [],
        published: false,
      });
      setAiPrompt("");
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  }

  function addDecision() {
    update("decisions", [
      ...form.decisions,
      { decision: "", rationale: "", outcome: "" },
    ]);
  }

  function updateDecision(idx: number, field: keyof CaseStudyDecision, value: string) {
    const updated = [...form.decisions];
    updated[idx] = { ...updated[idx], [field]: value };
    update("decisions", updated);
  }

  function removeDecision(idx: number) {
    update("decisions", form.decisions.filter((_, i) => i !== idx));
  }

  function addSkill() {
    const skill = skillInput.trim();
    if (skill && !form.skills.includes(skill)) {
      update("skills", [...form.skills, skill]);
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    update("skills", form.skills.filter((s) => s !== skill));
  }

  function addMetric() {
    if (metricKey.trim() && metricVal.trim()) {
      update("metrics", { ...form.metrics, [metricKey.trim()]: metricVal.trim() });
      setMetricKey("");
      setMetricVal("");
    }
  }

  function removeMetric(key: string) {
    const next = { ...form.metrics };
    delete next[key];
    update("metrics", next);
  }

  return (
    <div className="space-y-6">
      {/* AI assist */}
      {!initial && (
        <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 p-6">
          <h2 className="text-sm font-medium text-blue-800 mb-2">
            AI-Assisted Structuring
          </h2>
          <p className="text-xs text-blue-600 mb-3">
            Describe a project, achievement, or challenge in your own words. AI
            will structure it into a case study format.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. At Spotify, I led the incident response when Android push delivery dropped 15%. I built daily tracking dashboards, did root cause analysis across 3 teams, and quantified the business impact to get executive attention..."
            rows={4}
            className={`${INPUT} resize-none mb-3`}
          />
          <button
            onClick={handleGenerate}
            disabled={generating || aiPrompt.trim().length < 20}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {generating ? "Structuring..." : "Structure with AI"}
          </button>
        </div>
      )}

      {/* Manual form */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Resolving Android Push Delivery Crisis at Spotify"
            className={INPUT}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">Narrative</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Situation
          </label>
          <textarea
            value={form.situation}
            onChange={(e) => update("situation", e.target.value)}
            placeholder="What was the context? What problem existed?"
            rows={3}
            className={`${INPUT} resize-none`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Approach
          </label>
          <textarea
            value={form.approach}
            onChange={(e) => update("approach", e.target.value)}
            placeholder="How did you tackle it? What was the strategy?"
            rows={3}
            className={`${INPUT} resize-none`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reflections
          </label>
          <textarea
            value={form.reflections}
            onChange={(e) => update("reflections", e.target.value)}
            placeholder="What did you learn? What would you do differently?"
            rows={2}
            className={`${INPUT} resize-none`}
          />
        </div>
      </div>

      {/* Decisions */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500">Key Decisions</h2>
          <button
            type="button"
            onClick={addDecision}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add decision
          </button>
        </div>

        {form.decisions.length === 0 && (
          <p className="text-sm text-gray-400">
            What choices did you make? What was the rationale?
          </p>
        )}

        {form.decisions.map((d, i) => (
          <div key={i} className="border rounded-md p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                Decision {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeDecision(i)}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              value={d.decision}
              onChange={(e) => updateDecision(i, "decision", e.target.value)}
              placeholder="What was decided"
              className={INPUT}
            />
            <input
              type="text"
              value={d.rationale}
              onChange={(e) => updateDecision(i, "rationale", e.target.value)}
              placeholder="Why this choice over alternatives"
              className={INPUT}
            />
            <input
              type="text"
              value={d.outcome}
              onChange={(e) => updateDecision(i, "outcome", e.target.value)}
              placeholder="What resulted"
              className={INPUT}
            />
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">Metrics</h2>

        {Object.entries(form.metrics).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium min-w-[120px]">
              {key}:
            </span>
            <span className="text-sm text-gray-600">{val}</span>
            <button
              type="button"
              onClick={() => removeMetric(key)}
              className="text-xs text-red-500 hover:underline ml-auto"
            >
              Remove
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value)}
            placeholder="Metric name"
            className={`${INPUT} flex-1`}
          />
          <input
            type="text"
            value={metricVal}
            onChange={(e) => setMetricVal(e.target.value)}
            placeholder="Value"
            onKeyDown={(e) => e.key === "Enter" && addMetric()}
            className={`${INPUT} flex-1`}
          />
          <button
            type="button"
            onClick={addMetric}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-medium text-gray-500">Skills Tags</h2>

        <div className="flex flex-wrap gap-2">
          {form.skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="text-blue-400 hover:text-blue-600"
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            placeholder="Add a skill tag..."
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            className={`${INPUT} flex-1`}
          />
          <button
            type="button"
            onClick={addSkill}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Published toggle */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => update("published", e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">
            Published
          </span>
          <span className="text-xs text-gray-400">
            Published case studies will appear on your public profile
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.push("/case-studies")}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : initial ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}
