"use client";

import { useState } from "react";
import type { FormField } from "@/lib/db";

type FormWithJob = {
  jobId: string;
  title: string;
  company: string;
  fields: FormField[];
  ready: boolean;
};

type SubmitResult = {
  jobId: string;
  success: boolean;
  error?: string;
  message?: string;
};

export function ApplyReview({
  initialForms,
}: {
  initialForms: FormWithJob[];
}) {
  const [forms, setForms] = useState<FormWithJob[]>(initialForms);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResults, setSubmitResults] = useState<SubmitResult[] | null>(
    null
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    // Initialize from the first form's field values
    if (initialForms.length === 0) return {};
    const initial: Record<string, string> = {};
    initialForms[0].fields.forEach((f) => {
      if (f.value) initial[f.name] = f.value;
    });
    return initial;
  });

  const selectedForm = forms[selectedIndex];
  const readyCount = forms.filter((f) => f.ready).length;

  function selectForm(index: number) {
    setSelectedIndex(index);
    setSaving(false);
    // Load field values for the selected form
    const form = forms[index];
    const values: Record<string, string> = {};
    form.fields.forEach((f) => {
      if (f.value) values[f.name] = f.value;
    });
    setFieldValues(values);
    setSubmitResults(null);
  }

  function updateFieldValue(fieldName: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  }

  async function saveAnswers() {
    if (!selectedForm) return;
    setSaving(true);

    const answers = selectedForm.fields
      .filter((f) => {
        const currentValue = fieldValues[f.name];
        return currentValue && currentValue !== f.value;
      })
      .map((f) => ({
        fieldName: f.name,
        value: fieldValues[f.name],
        label: f.label,
      }));

    // Also include newly filled fields that were previously empty
    for (const field of selectedForm.fields) {
      if (
        !field.value &&
        fieldValues[field.name] &&
        !answers.find((a) => a.fieldName === field.name)
      ) {
        answers.push({
          fieldName: field.name,
          value: fieldValues[field.name],
          label: field.label,
        });
      }
    }

    if (answers.length === 0) {
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${selectedForm.jobId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const result = await res.json();

      // Update the form in state
      setForms((prev) =>
        prev.map((form, i) => {
          if (i !== selectedIndex) return form;
          return {
            ...form,
            ready: result.ready,
            fields: form.fields.map((f) => {
              const newValue = fieldValues[f.name];
              if (newValue) {
                return { ...f, value: newValue, matched: true };
              }
              return f;
            }),
          };
        })
      );
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  }

  async function submitAllReady() {
    const readyJobIds = forms
      .filter((f) => f.ready)
      .map((f) => f.jobId);

    if (readyJobIds.length === 0) return;
    setSubmitting(true);
    setSubmitResults(null);

    try {
      const res = await fetch("/api/jobs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: readyJobIds }),
      });
      const data = await res.json();
      setSubmitResults(data.results || []);
    } catch {
      setSubmitResults([{ jobId: "", success: false, error: "Network error" }]);
    } finally {
      setSubmitting(false);
    }
  }

  function statusDot(form: FormWithJob) {
    if (form.ready) return "bg-green-500";
    const hasMissing = form.fields.some((f) => f.required && !f.matched);
    if (hasMissing) return "bg-red-500";
    return "bg-gray-400";
  }

  function fieldBorderClass(field: FormField) {
    const value = fieldValues[field.name] || field.value;
    if (value && field.matched) return "border-l-green-500";
    if (field.required && !value) return "border-l-red-500";
    if (!field.required && !value) return "border-l-yellow-400";
    return "border-l-green-500";
  }

  if (forms.length === 0) {
    return (
      <p className="text-gray-500">
        No prepared application forms found. Go back to{" "}
        <a href="/jobs" className="text-blue-600 hover:underline">
          Jobs
        </a>{" "}
        and prepare applications first.
      </p>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 180px)" }}>
      <div className="flex gap-6 flex-1">
        {/* Left sidebar - job list */}
        <div className="w-1/4 space-y-2">
          {forms.map((form, index) => (
            <button
              key={form.jobId}
              onClick={() => selectForm(index)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                index === selectedIndex
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot(form)}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {form.company}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{form.title}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Main area - form fields */}
        <div className="flex-1 rounded-lg border bg-white p-6 shadow-sm overflow-y-auto">
          {selectedForm && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedForm.title}
                </h2>
                <p className="text-sm text-gray-500">{selectedForm.company}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedForm.fields.filter((f) => f.matched).length} of{" "}
                  {selectedForm.fields.length} fields matched
                </p>
              </div>

              <div className="space-y-4">
                {selectedForm.fields.map((field) => (
                  <div
                    key={field.name}
                    className={`border-l-4 pl-4 py-2 ${fieldBorderClass(field)}`}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                    </label>

                    {field.type === "select" || field.type === "multi_select" ? (
                      <select
                        value={fieldValues[field.name] || field.value || ""}
                        onChange={(e) =>
                          updateFieldValue(field.name, e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={fieldValues[field.name] || field.value || ""}
                        onChange={(e) =>
                          updateFieldValue(field.name, e.target.value)
                        }
                        rows={4}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    ) : field.type === "file" ? (
                      <div className="text-sm text-gray-600">
                        {fieldValues[field.name] || field.value ? (
                          <span className="text-green-700">
                            File URL: {fieldValues[field.name] || field.value}
                          </span>
                        ) : (
                          <input
                            type="text"
                            placeholder="Paste file URL..."
                            value={fieldValues[field.name] || ""}
                            onChange={(e) =>
                              updateFieldValue(field.name, e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    ) : field.type === "checkbox" ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            (fieldValues[field.name] || field.value) === "true"
                          }
                          onChange={(e) =>
                            updateFieldValue(
                              field.name,
                              e.target.checked ? "true" : "false"
                            )
                          }
                          className="rounded"
                        />
                        Yes
                      </label>
                    ) : (
                      <input
                        type="text"
                        value={fieldValues[field.name] || field.value || ""}
                        onChange={(e) =>
                          updateFieldValue(field.name, e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <button
                  onClick={saveAnswers}
                  disabled={saving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Answers"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 mt-6 rounded-lg border bg-white p-4 shadow-sm flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {readyCount} of {forms.length} ready to submit
        </span>
        <div className="flex items-center gap-3">
          {submitResults && (
            <div className="flex items-center gap-2 text-sm">
              {submitResults.map((r) => (
                <span
                  key={r.jobId}
                  className={
                    r.success ? "text-green-700" : "text-red-700"
                  }
                >
                  {r.success
                    ? r.message || "Submitted"
                    : r.error || "Failed"}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={submitAllReady}
            disabled={readyCount === 0 || submitting}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : `Submit All Ready (${readyCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}
