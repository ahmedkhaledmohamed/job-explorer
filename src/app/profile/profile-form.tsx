"use client";

import { useState, useEffect } from "react";

type Profile = {
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  resume_url: string;
  work_authorization: string;
  default_cover_letter: string;
};

const EMPTY_PROFILE: Profile = {
  full_name: "",
  email: "",
  phone: "",
  linkedin_url: "",
  resume_url: "",
  work_authorization: "",
  default_cover_letter: "",
};

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setProfile({
            full_name: data.full_name || "",
            email: data.email || "",
            phone: data.phone || "",
            linkedin_url: data.linkedin_url || "",
            resume_url: data.resume_url || "",
            work_authorization: data.work_authorization || "",
            default_cover_letter: data.default_cover_letter || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    if (res.ok) {
      const updated = await res.json();
      setProfile({
        full_name: updated.full_name || "",
        email: updated.email || "",
        phone: updated.phone || "",
        linkedin_url: updated.linkedin_url || "",
        resume_url: updated.resume_url || "",
        work_authorization: updated.work_authorization || "",
        default_cover_letter: updated.default_cover_letter || "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save profile");
    }

    setSaving(false);
  }

  function updateField(field: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500 mb-2">
          Personal Information
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={profile.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={profile.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LinkedIn URL
          </label>
          <input
            type="url"
            value={profile.linkedin_url}
            onChange={(e) => updateField("linkedin_url", e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Authorization
          </label>
          <select
            value={profile.work_authorization}
            onChange={(e) =>
              updateField("work_authorization", e.target.value)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="Canadian Citizen">Canadian Citizen</option>
            <option value="Permanent Resident">Permanent Resident</option>
            <option value="Work Permit">Work Permit</option>
            <option value="US Citizen">US Citizen</option>
            <option value="US Green Card">US Green Card</option>
            <option value="Require Sponsorship">Require Sponsorship</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-medium text-gray-500 mb-2">
          Application Materials
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resume URL
          </label>
          <input
            type="url"
            value={profile.resume_url}
            onChange={(e) => updateField("resume_url", e.target.value)}
            placeholder="URL to your resume PDF"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Direct link to a publicly accessible PDF. Used for auto-apply.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Cover Letter
          </label>
          <textarea
            value={profile.default_cover_letter}
            onChange={(e) =>
              updateField("default_cover_letter", e.target.value)
            }
            placeholder="Write a default cover letter template..."
            rows={8}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
          Profile saved successfully
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
