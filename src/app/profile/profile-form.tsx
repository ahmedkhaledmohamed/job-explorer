"use client";

import { useState, useEffect } from "react";

type Profile = {
  full_name: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  pronouns: string;
  location_city: string;
  location_state: string;
  location_country: string;
  current_company: string;
  current_title: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  personal_website: string;
  work_authorization: string;
  visa_sponsorship_needed: boolean;
  citizenship: string;
  desired_salary_min: string;
  desired_salary_max: string;
  salary_currency: string;
  notice_period: string;
  earliest_start_date: string;
  willing_to_relocate: boolean;
  preferred_locations: string;
  years_of_experience: string;
  highest_education: string;
  university: string;
  degree: string;
  field_of_study: string;
  graduation_year: string;
  gender: string;
  race_ethnicity: string;
  veteran_status: string;
  disability_status: string;
  resume_url: string;
  default_cover_letter: string;
  how_did_you_hear: string;
};

const EMPTY_PROFILE: Profile = {
  full_name: "",
  email: "",
  phone: "",
  first_name: "",
  last_name: "",
  pronouns: "",
  location_city: "",
  location_state: "",
  location_country: "",
  current_company: "",
  current_title: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  personal_website: "",
  work_authorization: "",
  visa_sponsorship_needed: false,
  citizenship: "",
  desired_salary_min: "",
  desired_salary_max: "",
  salary_currency: "CAD",
  notice_period: "",
  earliest_start_date: "",
  willing_to_relocate: false,
  preferred_locations: "",
  years_of_experience: "",
  highest_education: "",
  university: "",
  degree: "",
  field_of_study: "",
  graduation_year: "",
  gender: "Decline to self-identify",
  race_ethnicity: "Decline to self-identify",
  veteran_status: "I am not a protected veteran",
  disability_status: "Prefer not to say",
  resume_url: "",
  default_cover_letter: "",
  how_did_you_hear: "Company website",
};

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <h2 className="text-sm font-medium text-gray-500">{title}</h2>
        <span className="text-gray-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="px-6 pb-6 space-y-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && "*"}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const INPUT =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const SELECT =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

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
            ...EMPTY_PROFILE,
            ...Object.fromEntries(
              Object.entries(data).map(([k, v]) => [
                k,
                v === null ? (typeof EMPTY_PROFILE[k as keyof Profile] === "boolean" ? false : "") : v,
              ])
            ),
            desired_salary_min: data.desired_salary_min?.toString() || "",
            desired_salary_max: data.desired_salary_max?.toString() || "",
            years_of_experience: data.years_of_experience?.toString() || "",
            graduation_year: data.graduation_year?.toString() || "",
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

    const payload = {
      ...profile,
      full_name:
        profile.full_name ||
        `${profile.first_name} ${profile.last_name}`.trim(),
      desired_salary_min: profile.desired_salary_min
        ? parseInt(profile.desired_salary_min)
        : null,
      desired_salary_max: profile.desired_salary_max
        ? parseInt(profile.desired_salary_max)
        : null,
      years_of_experience: profile.years_of_experience
        ? parseInt(profile.years_of_experience)
        : null,
      graduation_year: profile.graduation_year
        ? parseInt(profile.graduation_year)
        : null,
      earliest_start_date: profile.earliest_start_date || null,
    };

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save profile");
    }

    setSaving(false);
  }

  function updateField(field: keyof Profile, value: string | boolean) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <Section title="Personal Information" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required>
            <input
              type="text"
              required
              value={profile.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Last Name" required>
            <input
              type="text"
              required
              value={profile.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
        <Field label="Email" required>
          <input
            type="email"
            required
            value={profile.email}
            onChange={(e) => updateField("email", e.target.value)}
            className={INPUT}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Pronouns">
            <input
              type="text"
              value={profile.pronouns}
              onChange={(e) => updateField("pronouns", e.target.value)}
              placeholder="e.g. he/him"
              className={INPUT}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="City">
            <input
              type="text"
              value={profile.location_city}
              onChange={(e) => updateField("location_city", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="State/Province">
            <input
              type="text"
              value={profile.location_state}
              onChange={(e) => updateField("location_state", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Country">
            <input
              type="text"
              value={profile.location_country}
              onChange={(e) => updateField("location_country", e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current Company">
            <input
              type="text"
              value={profile.current_company}
              onChange={(e) => updateField("current_company", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Current Title">
            <input
              type="text"
              value={profile.current_title}
              onChange={(e) => updateField("current_title", e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
      </Section>

      <Section title="Links" defaultOpen={true}>
        <Field label="LinkedIn URL">
          <input
            type="url"
            value={profile.linkedin_url}
            onChange={(e) => updateField("linkedin_url", e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className={INPUT}
          />
        </Field>
        <Field label="GitHub URL">
          <input
            type="url"
            value={profile.github_url}
            onChange={(e) => updateField("github_url", e.target.value)}
            placeholder="https://github.com/..."
            className={INPUT}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Portfolio URL">
            <input
              type="url"
              value={profile.portfolio_url}
              onChange={(e) => updateField("portfolio_url", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Personal Website">
            <input
              type="url"
              value={profile.personal_website}
              onChange={(e) => updateField("personal_website", e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
      </Section>

      <Section title="Work Authorization" defaultOpen={true}>
        <Field label="Work Authorization Status">
          <select
            value={profile.work_authorization}
            onChange={(e) => updateField("work_authorization", e.target.value)}
            className={SELECT}
          >
            <option value="">Select...</option>
            <option value="Canadian Citizen">Canadian Citizen</option>
            <option value="Permanent Resident">Permanent Resident</option>
            <option value="Work Permit">Work Permit</option>
            <option value="US Citizen">US Citizen</option>
            <option value="US Green Card">US Green Card</option>
            <option value="Require Sponsorship">Require Sponsorship</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Citizenship">
            <input
              type="text"
              value={profile.citizenship}
              onChange={(e) => updateField("citizenship", e.target.value)}
              placeholder="e.g. Canadian, Egyptian"
              className={INPUT}
            />
          </Field>
          <Field label="Visa Sponsorship Needed">
            <div className="flex items-center h-10">
              <input
                type="checkbox"
                checked={profile.visa_sponsorship_needed}
                onChange={(e) =>
                  updateField("visa_sponsorship_needed", e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-600">
                I require visa sponsorship
              </span>
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Job Preferences" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Salary Min">
            <input
              type="number"
              value={profile.desired_salary_min}
              onChange={(e) =>
                updateField("desired_salary_min", e.target.value)
              }
              placeholder="e.g. 180000"
              className={INPUT}
            />
          </Field>
          <Field label="Salary Max">
            <input
              type="number"
              value={profile.desired_salary_max}
              onChange={(e) =>
                updateField("desired_salary_max", e.target.value)
              }
              placeholder="e.g. 250000"
              className={INPUT}
            />
          </Field>
          <Field label="Currency">
            <select
              value={profile.salary_currency}
              onChange={(e) => updateField("salary_currency", e.target.value)}
              className={SELECT}
            >
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Notice Period">
            <input
              type="text"
              value={profile.notice_period}
              onChange={(e) => updateField("notice_period", e.target.value)}
              placeholder="e.g. 2 weeks"
              className={INPUT}
            />
          </Field>
          <Field label="Earliest Start Date">
            <input
              type="date"
              value={profile.earliest_start_date}
              onChange={(e) =>
                updateField("earliest_start_date", e.target.value)
              }
              className={INPUT}
            />
          </Field>
        </div>
        <Field label="Willing to Relocate">
          <div className="flex items-center h-10">
            <input
              type="checkbox"
              checked={profile.willing_to_relocate}
              onChange={(e) =>
                updateField("willing_to_relocate", e.target.checked)
              }
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-600">
              Open to relocation
            </span>
          </div>
        </Field>
        <Field
          label="Preferred Locations"
          hint="Comma-separated, e.g. Toronto, Vancouver, Remote"
        >
          <input
            type="text"
            value={profile.preferred_locations}
            onChange={(e) =>
              updateField("preferred_locations", e.target.value)
            }
            className={INPUT}
          />
        </Field>
      </Section>

      <Section title="Education" defaultOpen={false}>
        <Field label="Years of Experience">
          <input
            type="number"
            value={profile.years_of_experience}
            onChange={(e) =>
              updateField("years_of_experience", e.target.value)
            }
            className={INPUT}
          />
        </Field>
        <Field label="Highest Education">
          <select
            value={profile.highest_education}
            onChange={(e) => updateField("highest_education", e.target.value)}
            className={SELECT}
          >
            <option value="">Select...</option>
            <option value="High School">High School</option>
            <option value="Associate's">Associate&apos;s Degree</option>
            <option value="Bachelor's">Bachelor&apos;s Degree</option>
            <option value="Master's">Master&apos;s Degree</option>
            <option value="Doctorate">Doctorate</option>
            <option value="Professional">Professional Degree</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="University">
            <input
              type="text"
              value={profile.university}
              onChange={(e) => updateField("university", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Degree">
            <input
              type="text"
              value={profile.degree}
              onChange={(e) => updateField("degree", e.target.value)}
              placeholder="e.g. MSc Computer Science"
              className={INPUT}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Field of Study">
            <input
              type="text"
              value={profile.field_of_study}
              onChange={(e) => updateField("field_of_study", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Graduation Year">
            <input
              type="number"
              value={profile.graduation_year}
              onChange={(e) => updateField("graduation_year", e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
      </Section>

      <Section title="Demographics (EEOC)" defaultOpen={false}>
        <p className="text-xs text-gray-400 mb-3">
          These fields auto-fill demographic questions on applications. All
          default to &quot;decline&quot; options.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Gender">
            <select
              value={profile.gender}
              onChange={(e) => updateField("gender", e.target.value)}
              className={SELECT}
            >
              <option value="Decline to self-identify">
                Decline to self-identify
              </option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Race/Ethnicity">
            <select
              value={profile.race_ethnicity}
              onChange={(e) => updateField("race_ethnicity", e.target.value)}
              className={SELECT}
            >
              <option value="Decline to self-identify">
                Decline to self-identify
              </option>
              <option value="American Indian or Alaska Native">
                American Indian or Alaska Native
              </option>
              <option value="Asian">Asian</option>
              <option value="Black or African American">
                Black or African American
              </option>
              <option value="Hispanic or Latino">Hispanic or Latino</option>
              <option value="Native Hawaiian or Other Pacific Islander">
                Native Hawaiian or Other Pacific Islander
              </option>
              <option value="White">White</option>
              <option value="Two or More Races">Two or More Races</option>
            </select>
          </Field>
          <Field label="Veteran Status">
            <select
              value={profile.veteran_status}
              onChange={(e) => updateField("veteran_status", e.target.value)}
              className={SELECT}
            >
              <option value="I am not a protected veteran">
                I am not a protected veteran
              </option>
              <option value="I identify as one or more of the classifications of a protected veteran">
                Protected veteran
              </option>
              <option value="I don't wish to answer">
                I don&apos;t wish to answer
              </option>
            </select>
          </Field>
          <Field label="Disability Status">
            <select
              value={profile.disability_status}
              onChange={(e) =>
                updateField("disability_status", e.target.value)
              }
              className={SELECT}
            >
              <option value="Prefer not to say">Prefer not to say</option>
              <option value="Yes, I have a disability">
                Yes, I have a disability
              </option>
              <option value="No, I do not have a disability">
                No, I do not have a disability
              </option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Application Materials" defaultOpen={false}>
        <Field
          label="Resume URL"
          hint="Direct link to a publicly accessible PDF. Used for auto-apply."
        >
          <input
            type="url"
            value={profile.resume_url}
            onChange={(e) => updateField("resume_url", e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="How Did You Hear About Us (default)">
          <input
            type="text"
            value={profile.how_did_you_hear}
            onChange={(e) => updateField("how_did_you_hear", e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Default Cover Letter">
          <textarea
            value={profile.default_cover_letter}
            onChange={(e) =>
              updateField("default_cover_letter", e.target.value)
            }
            placeholder="Write a default cover letter template..."
            rows={8}
            className={`${INPUT} resize-none`}
          />
        </Field>
      </Section>

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
