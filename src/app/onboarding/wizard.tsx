"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const INPUT =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

type Skill = { id: number; name: string; category: string };

type WizardData = {
  step: number;
  // Step 1
  first_name: string;
  last_name: string;
  email: string;
  current_title: string;
  current_company: string;
  location_city: string;
  location_country: string;
  linkedin_url: string;
  github_url: string;
  // Step 2
  selected_skills: string[];
  years_of_experience: string;
  // Step 3
  case_study_text: string;
  case_study_created: boolean;
  // Step 4
  preferred_roles: string[];
  preferred_locations: string;
  desired_salary_min: string;
  desired_salary_max: string;
  // Step 5
  username: string;
  headline: string;
  summary: string;
};

const EMPTY: WizardData = {
  step: 1,
  first_name: "", last_name: "", email: "", current_title: "", current_company: "",
  location_city: "", location_country: "", linkedin_url: "", github_url: "",
  selected_skills: [], years_of_experience: "",
  case_study_text: "", case_study_created: false,
  preferred_roles: [], preferred_locations: "", desired_salary_min: "", desired_salary_max: "",
  username: "", headline: "", summary: "",
};

const STEPS = [
  { num: 1, label: "Who are you?" },
  { num: 2, label: "What do you bring?" },
  { num: 3, label: "Show your work" },
  { num: 4, label: "What are you looking for?" },
  { num: 5, label: "Preview & publish" },
];

const ROLE_OPTIONS = [
  "Product Manager", "Engineering Manager", "Technical Program Manager",
  "Director of Product", "Director of Engineering", "VP Product", "VP Engineering",
  "Staff Engineer", "Principal Engineer",
];

export function OnboardingWizard() {
  const router = useRouter();
  const [data, setData] = useState<WizardData>(EMPTY);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/wizard").then((r) => r.json()),
      fetch("/api/skills").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]).then(([progress, skillsData, profile]) => {
      const merged = { ...EMPTY };
      if (progress?.step) Object.assign(merged, progress);
      // Pre-fill from existing profile
      if (profile) {
        if (!merged.first_name && profile.first_name) merged.first_name = profile.first_name;
        if (!merged.last_name && profile.last_name) merged.last_name = profile.last_name;
        if (!merged.email && profile.email) merged.email = profile.email;
        if (!merged.current_title && profile.current_title) merged.current_title = profile.current_title;
        if (!merged.current_company && profile.current_company) merged.current_company = profile.current_company;
        if (!merged.location_city && profile.location_city) merged.location_city = profile.location_city;
        if (!merged.location_country && profile.location_country) merged.location_country = profile.location_country;
        if (!merged.linkedin_url && profile.linkedin_url) merged.linkedin_url = profile.linkedin_url;
        if (!merged.github_url && profile.github_url) merged.github_url = profile.github_url;
        if (!merged.years_of_experience && profile.years_of_experience) merged.years_of_experience = String(profile.years_of_experience);
      }
      setData(merged);
      setSkills(skillsData || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveProgress = useCallback(async (d: WizardData) => {
    await fetch("/api/wizard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
  }, []);

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function nextStep() {
    const next = { ...data, step: data.step + 1 };
    setData(next);
    await saveProgress(next);
  }

  async function prevStep() {
    const prev = { ...data, step: data.step - 1 };
    setData(prev);
    await saveProgress(prev);
  }

  function toggleSkill(name: string) {
    setData((prev) => {
      const skills = prev.selected_skills.includes(name)
        ? prev.selected_skills.filter((s) => s !== name)
        : [...prev.selected_skills, name];
      return { ...prev, selected_skills: skills };
    });
  }

  function toggleRole(role: string) {
    setData((prev) => {
      const roles = prev.preferred_roles.includes(role)
        ? prev.preferred_roles.filter((r) => r !== role)
        : [...prev.preferred_roles, role];
      return { ...prev, preferred_roles: roles };
    });
  }

  async function generateCaseStudy() {
    if (data.case_study_text.trim().length < 20) return;
    setGenerating(true);
    setError("");
    try {
      const genRes = await fetch("/api/case-studies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: data.case_study_text }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) { setError(genData.error || "Generation failed"); return; }

      const createRes = await fetch("/api/case-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...genData, published: true }),
      });
      if (createRes.ok) {
        update("case_study_created", true);
      }
    } catch { setError("Network error"); }
    setGenerating(false);
  }

  async function finishWizard() {
    setSaving(true);
    setError("");
    try {
      // Save profile
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          full_name: `${data.first_name} ${data.last_name}`.trim(),
          email: data.email,
          current_title: data.current_title,
          current_company: data.current_company,
          location_city: data.location_city,
          location_country: data.location_country,
          linkedin_url: data.linkedin_url,
          github_url: data.github_url,
          years_of_experience: data.years_of_experience ? parseInt(data.years_of_experience) : null,
          desired_salary_min: data.desired_salary_min ? parseInt(data.desired_salary_min) : null,
          desired_salary_max: data.desired_salary_max ? parseInt(data.desired_salary_max) : null,
          preferred_locations: data.preferred_locations,
        }),
      });

      // Save public profile
      await fetch("/api/public-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username || data.first_name?.toLowerCase().replace(/[^a-z0-9]/g, "-") || "user",
          headline: data.headline || `${data.current_title} at ${data.current_company}`.trim(),
          summary: data.summary,
          skills: data.selected_skills,
          is_public: true,
        }),
      });

      // Mark wizard complete
      await saveProgress({ ...data, step: 6 });
      router.push("/");
    } catch {
      setError("Failed to save");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>;
  }

  // Completeness score
  const filled = [
    data.first_name, data.last_name, data.email, data.current_title,
    data.selected_skills.length > 0, data.years_of_experience,
    data.case_study_created, data.username,
  ].filter(Boolean).length;
  const completeness = Math.round((filled / 8) * 100);

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 text-xs font-medium ${
                s.num === data.step ? "text-gray-900" :
                s.num < data.step ? "text-green-600" : "text-gray-400"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                s.num < data.step ? "bg-green-100 text-green-700" :
                s.num === data.step ? "bg-gray-900 text-white" :
                "bg-gray-200 text-gray-500"
              }`}>
                {s.num < data.step ? "✓" : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full">
          <div
            className="h-1.5 bg-gray-900 rounded-full transition-all"
            style={{ width: `${((data.step - 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        {data.step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Who are you?</h2>
              <p className="text-sm text-gray-500 mt-1">Basic info that shows up on your profile.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" value={data.first_name} onChange={(e) => update("first_name", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" value={data.last_name} onChange={(e) => update("last_name", e.target.value)} className={INPUT} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Title</label>
                <input type="text" value={data.current_title} onChange={(e) => update("current_title", e.target.value)} placeholder="e.g. Senior PM" className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                <input type="text" value={data.current_company} onChange={(e) => update("current_company", e.target.value)} className={INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={data.location_city} onChange={(e) => update("location_city", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input type="text" value={data.location_country} onChange={(e) => update("location_country", e.target.value)} className={INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                <input type="url" value={data.linkedin_url} onChange={(e) => update("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
                <input type="url" value={data.github_url} onChange={(e) => update("github_url", e.target.value)} placeholder="https://github.com/..." className={INPUT} />
              </div>
            </div>
          </div>
        )}

        {data.step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">What do you bring?</h2>
              <p className="text-sm text-gray-500 mt-1">Select your skills and experience level. These power job matching.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input type="number" value={data.years_of_experience} onChange={(e) => update("years_of_experience", e.target.value)} className={`${INPUT} w-32`} />
            </div>
            {(["technical", "domain", "leadership", "tool"] as const).map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {cat === "tool" ? "Tools & Technologies" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.filter((s) => s.category === cat).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSkill(s.name)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        data.selected_skills.includes(s.name)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400">{data.selected_skills.length} skills selected</p>
          </div>
        )}

        {data.step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Show your work</h2>
              <p className="text-sm text-gray-500 mt-1">
                Describe a project or achievement. AI will structure it into a case study that demonstrates your thinking.
              </p>
            </div>
            {data.case_study_created ? (
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200">
                Case study created and published! You can edit it later from the Case Studies page.
              </div>
            ) : (
              <>
                <textarea
                  value={data.case_study_text}
                  onChange={(e) => update("case_study_text", e.target.value)}
                  placeholder="e.g. At Spotify, I owned the messaging platform serving 700M+ users. When Android push delivery dropped 15%, I led the incident response — built daily tracking dashboards, coordinated root cause analysis across 3 teams, and quantified the business impact to get executive attention..."
                  rows={8}
                  className={`${INPUT} resize-none`}
                />
                <button
                  type="button"
                  onClick={generateCaseStudy}
                  disabled={generating || data.case_study_text.trim().length < 20}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {generating ? "Creating case study..." : "Create Case Study with AI"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={nextStep}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Skip for now &rarr;
            </button>
          </div>
        )}

        {data.step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">What are you looking for?</h2>
              <p className="text-sm text-gray-500 mt-1">Help us match you with the right opportunities.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Roles</label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      data.preferred_roles.includes(role)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Locations</label>
              <input type="text" value={data.preferred_locations} onChange={(e) => update("preferred_locations", e.target.value)} placeholder="e.g. Toronto, Remote Canada, Vancouver" className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min (annual)</label>
                <input type="number" value={data.desired_salary_min} onChange={(e) => update("desired_salary_min", e.target.value)} placeholder="e.g. 180000" className={INPUT} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max (annual)</label>
                <input type="number" value={data.desired_salary_max} onChange={(e) => update("desired_salary_max", e.target.value)} placeholder="e.g. 250000" className={INPUT} />
              </div>
            </div>
          </div>
        )}

        {data.step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Preview & publish</h2>
              <p className="text-sm text-gray-500 mt-1">Set up your public profile URL and headline.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">/p/</span>
                <input
                  type="text"
                  value={data.username}
                  onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="ahmed-khaled"
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
              <input type="text" value={data.headline} onChange={(e) => update("headline", e.target.value)} placeholder={`${data.current_title} at ${data.current_company}`} className={INPUT} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <textarea value={data.summary} onChange={(e) => update("summary", e.target.value)} placeholder="2-3 sentences about what you do and what makes you distinctive..." rows={4} className={`${INPUT} resize-none`} />
            </div>

            {/* Completeness */}
            <div className="rounded-md bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Profile completeness</span>
                <span className={`text-sm font-bold ${completeness >= 75 ? "text-green-600" : completeness >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                  {completeness}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className={`h-2 rounded-full transition-all ${completeness >= 75 ? "bg-green-500" : completeness >= 50 ? "bg-yellow-500" : "bg-red-400"}`} style={{ width: `${completeness}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">{error}</div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        {data.step > 1 ? (
          <button onClick={prevStep} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Back
          </button>
        ) : <div />}

        {data.step < 5 ? (
          <button onClick={nextStep} className="rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700">
            Continue
          </button>
        ) : (
          <button onClick={finishWizard} disabled={saving} className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50">
            {saving ? "Saving..." : "Finish & Publish Profile"}
          </button>
        )}
      </div>
    </div>
  );
}
