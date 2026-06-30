"use client";

import { useState, useEffect } from "react";
import type { ExperienceEntry } from "@/lib/db";

const INPUT =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

type FormData = {
  username: string;
  headline: string;
  summary: string;
  experience: ExperienceEntry[];
  skills: string[];
  is_public: boolean;
};

const EMPTY: FormData = {
  username: "",
  headline: "",
  summary: "",
  experience: [],
  skills: [],
  is_public: true,
};

export function PublicProfileEditor() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    fetch("/api/public-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          const exp =
            typeof data.experience === "string"
              ? JSON.parse(data.experience)
              : data.experience || [];
          const sk =
            typeof data.skills === "string"
              ? JSON.parse(data.skills)
              : data.skills || [];
          setForm({
            username: data.username || "",
            headline: data.headline || "",
            summary: data.summary || "",
            experience: exp,
            skills: sk,
            is_public: data.is_public !== false,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.username) {
      setError("Username is required");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.username)) {
      setError("Username must be lowercase letters, numbers, and hyphens only");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/public-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
    }
    setSaving(false);
  }

  function addExperience() {
    setForm((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { company: "", title: "", start: "", end: "", highlights: [], case_study_slugs: [] },
      ],
    }));
  }

  function updateExperience(idx: number, field: keyof ExperienceEntry, value: unknown) {
    setForm((prev) => {
      const updated = [...prev.experience];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, experience: updated };
    });
  }

  function removeExperience(idx: number) {
    setForm((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== idx),
    }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, s] }));
    }
    setSkillInput("");
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Preview link */}
      {form.username && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">Your public profile URL</p>
            <p className="text-sm text-blue-600 font-mono mt-1">/p/{form.username}</p>
          </div>
          <a
            href={`/p/${form.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Preview
          </a>
        </div>
      )}

      {/* Basics */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500">Basics</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/p/</span>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
              placeholder="ahmed-khaled"
              className={INPUT}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
          <input
            type="text"
            value={form.headline}
            onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))}
            placeholder="e.g. Senior PM — Platform & Applied AI"
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            value={form.summary}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            placeholder="2-3 sentence overview for a hiring manager..."
            rows={3}
            className={`${INPUT} resize-none`}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) => setForm((prev) => ({ ...prev, is_public: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Profile is public</span>
        </label>
      </div>

      {/* Skills */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-medium text-gray-500">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {form.skills.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {s}
              <button onClick={() => setForm((prev) => ({ ...prev, skills: prev.skills.filter((x) => x !== s) }))} className="text-gray-400 hover:text-gray-600">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            placeholder="Add skill..."
            className={`${INPUT} flex-1`}
          />
          <button onClick={addSkill} className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">Add</button>
        </div>
      </div>

      {/* Experience */}
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500">Experience Timeline</h2>
          <button onClick={addExperience} className="text-sm text-blue-600 hover:underline">+ Add</button>
        </div>
        {form.experience.length === 0 && (
          <p className="text-sm text-gray-400">Add experience entries that will appear on your public timeline.</p>
        )}
        {form.experience.map((exp, i) => (
          <div key={i} className="border rounded-md p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Entry {i + 1}</span>
              <button onClick={() => removeExperience(i)} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={exp.title} onChange={(e) => updateExperience(i, "title", e.target.value)} placeholder="Title" className={INPUT} />
              <input type="text" value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} placeholder="Company" className={INPUT} />
              <input type="text" value={exp.start} onChange={(e) => updateExperience(i, "start", e.target.value)} placeholder="Start (e.g. 2022)" className={INPUT} />
              <input type="text" value={exp.end} onChange={(e) => updateExperience(i, "end", e.target.value)} placeholder="End (or empty for Present)" className={INPUT} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Highlights (one per line)</label>
              <textarea
                value={(exp.highlights || []).join("\n")}
                onChange={(e) => updateExperience(i, "highlights", e.target.value.split("\n").filter((l) => l.trim()))}
                rows={3}
                placeholder="Key achievements or responsibilities..."
                className={`${INPUT} resize-none`}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">{error}</div>
      )}
      {saved && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">Public profile saved</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Public Profile"}
        </button>
      </div>
    </div>
  );
}
