"use client";

import { useState } from "react";

type ImportedData = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location_city?: string;
  location_state?: string;
  location_country?: string;
  current_company?: string;
  current_title?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  personal_website?: string;
  years_of_experience?: number;
  highest_education?: string;
  university?: string;
  degree?: string;
  field_of_study?: string;
  graduation_year?: number;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    company: string;
    title: string;
    start: string;
    end: string;
    highlights: string[];
  }>;
};

const INPUT =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export function ResumeImport({
  onImport,
}: {
  onImport: (data: ImportedData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ImportedData | null>(null);

  async function handleExtract() {
    let importText = text;

    if (mode === "url") {
      if (!profileUrl.trim()) { setError("Enter a URL"); return; }
      setImporting(true);
      setError("");
      setPreview(null);
      try {
        const fetchRes = await fetch(profileUrl, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
        });
        if (!fetchRes.ok) { setError(`Could not fetch URL (${fetchRes.status})`); setImporting(false); return; }
        const html = await fetchRes.text();
        importText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 10000);
      } catch {
        setError("Could not fetch URL — try pasting the page text instead");
        setImporting(false);
        return;
      }
    } else {
      if (importText.trim().length < 50) { setError("Paste at least 50 characters"); return; }
    }

    setImporting(true);
    setError("");
    setPreview(null);

    try {
      const res = await fetch("/api/profile/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Extraction failed");
        return;
      }

      setPreview(data);
    } catch {
      setError("Network error");
    } finally {
      setImporting(false);
    }
  }

  function handleApply() {
    if (preview) {
      onImport(preview);
      setOpen(false);
      setText("");
      setPreview(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors w-full text-left"
      >
        Import from Resume — paste resume text and AI will extract your profile
        fields
      </button>
    );
  }

  return (
    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/30 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-blue-800">
          Import from Resume
        </h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPreview(null);
            setError("");
          }}
          className="text-sm text-blue-600 hover:underline"
        >
          Cancel
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        <button type="button" onClick={() => setMode("text")}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${mode === "text" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          Paste Text
        </button>
        <button type="button" onClick={() => setMode("url")}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${mode === "url" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
          Import from URL
        </button>
      </div>

      {mode === "text" ? (
        <>
          <p className="text-xs text-blue-600">
            Paste resume text (from PDF, markdown, or plain text). AI extracts structured fields.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"# Ahmed Khaled Mohamed\n\n> Senior Product Manager\n\n## Experience\n..."}
            rows={8}
            className={`${INPUT} resize-none font-mono text-xs`}
          />
        </>
      ) : (
        <>
          <p className="text-xs text-blue-600">
            Paste a LinkedIn, Wellfound, or any profile URL. We&apos;ll fetch the page and extract your info.
          </p>
          <input
            type="url"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder="https://linkedin.com/in/... or https://wellfound.com/u/..."
            className={INPUT}
          />
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleExtract}
          disabled={importing || (mode === "text" ? text.trim().length < 50 : !profileUrl.trim())}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          {importing ? "Extracting..." : "Extract with AI"}
        </button>
        {mode === "text" && (
          <span className="text-xs text-gray-400">{text.length} characters</span>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {preview && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Extracted Profile Preview
          </h3>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {preview.first_name && (
              <div>
                <span className="text-gray-400">Name:</span>{" "}
                {preview.first_name} {preview.last_name}
              </div>
            )}
            {preview.email && (
              <div>
                <span className="text-gray-400">Email:</span> {preview.email}
              </div>
            )}
            {preview.current_title && (
              <div>
                <span className="text-gray-400">Title:</span>{" "}
                {preview.current_title}
              </div>
            )}
            {preview.current_company && (
              <div>
                <span className="text-gray-400">Company:</span>{" "}
                {preview.current_company}
              </div>
            )}
            {preview.location_city && (
              <div>
                <span className="text-gray-400">Location:</span>{" "}
                {[preview.location_city, preview.location_country]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
            {preview.university && (
              <div>
                <span className="text-gray-400">Education:</span>{" "}
                {preview.degree} @ {preview.university}
              </div>
            )}
            {preview.years_of_experience && (
              <div>
                <span className="text-gray-400">Experience:</span>{" "}
                {preview.years_of_experience} years
              </div>
            )}
          </div>

          {preview.experience && preview.experience.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">
                {preview.experience.length} roles extracted
              </p>
              <div className="space-y-1">
                {preview.experience.slice(0, 4).map((exp, i) => (
                  <div key={i} className="text-xs text-gray-600">
                    {exp.title} @ {exp.company} ({exp.start}–{exp.end || "Present"})
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.skills && preview.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {preview.skills.slice(0, 10).map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
                >
                  {s}
                </span>
              ))}
              {preview.skills.length > 10 && (
                <span className="text-xs text-gray-400">
                  +{preview.skills.length - 10} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
            >
              Apply to Profile
            </button>
            <span className="text-xs text-gray-400">
              This will overwrite empty fields only. Existing data is preserved.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
