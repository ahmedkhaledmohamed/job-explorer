import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { FormField } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { jobIds } = body;

  if (!Array.isArray(jobIds) || jobIds.length === 0) {
    return NextResponse.json(
      { error: "jobIds must be a non-empty array" },
      { status: 400 }
    );
  }

  const sql = getDb();

  // Get apply profile for resume fetching
  const profileResult =
    await sql`SELECT * FROM apply_profile ORDER BY id LIMIT 1`;
  const profile = profileResult.length > 0 ? profileResult[0] : null;

  const results = [];

  for (const jobId of jobIds) {
    // Verify form exists and is ready
    const formResult =
      await sql`SELECT * FROM application_forms WHERE job_id = ${jobId}`;
    if (formResult.length === 0) {
      results.push({ jobId, success: false, error: "No prepared form found" });
      continue;
    }

    const form = formResult[0];
    if (!form.ready) {
      results.push({
        jobId,
        success: false,
        error: "Form has missing required fields",
      });
      continue;
    }

    // Fetch job details
    const jobResult = await sql`SELECT * FROM jobs WHERE id = ${jobId}`;
    if (jobResult.length === 0) {
      results.push({ jobId, success: false, error: "Job not found" });
      continue;
    }

    const job = jobResult[0];
    const source = ((job.source as string) || "").toLowerCase();
    const fields: FormField[] =
      typeof form.fields === "string"
        ? JSON.parse(form.fields as string)
        : (form.fields as unknown as FormField[]);

    try {
      let submitResult;

      switch (source) {
        case "greenhouse":
          submitResult = await submitGreenhouse(job, fields, profile);
          break;
        case "ashby":
          submitResult = await submitAshby(job, fields);
          break;
        case "lever":
          submitResult = await submitLever(job, fields);
          break;
        default:
          results.push({
            jobId,
            success: false,
            error: `Unsupported source: ${source}`,
          });
          continue;
      }

      if (submitResult.success) {
        await sql`
          UPDATE jobs SET status = 'applied', applied_at = NOW() WHERE id = ${jobId}
        `;
      }

      results.push({ jobId, ...submitResult });
    } catch (error) {
      results.push({
        jobId,
        success: false,
        error:
          error instanceof Error ? error.message : "Submission failed",
      });
    }
  }

  return NextResponse.json({ results });
}

async function submitGreenhouse(
  job: Record<string, unknown>,
  fields: FormField[],
  profile: Record<string, unknown> | null
) {
  const urlStr = job.url as string;
  const boardMatch = urlStr.match(
    /(?:boards|job-boards)\.greenhouse\.io\/(\w+)\/jobs/
  );
  const boardToken = boardMatch?.[1];

  if (!boardToken) {
    return { success: false, error: "Could not extract Greenhouse board token" };
  }

  const atsJobId = job.ats_job_id as string;
  const formData = new FormData();

  // Map fields to form data
  for (const field of fields) {
    if (field.value && field.type !== "file") {
      formData.append(field.name, field.value);
    }
  }

  // Handle resume file
  const resumeField = fields.find(
    (f) => f.name === "resume" && f.type === "file" && f.value
  );
  if (resumeField?.value) {
    try {
      const resumeRes = await fetch(resumeField.value);
      if (resumeRes.ok) {
        const resumeBlob = await resumeRes.blob();
        formData.append("resume", resumeBlob, "resume.pdf");
      }
    } catch {
      // Fallback: try from profile
      if (profile?.resume_url) {
        try {
          const res = await fetch(profile.resume_url as string);
          if (res.ok) {
            const blob = await res.blob();
            formData.append("resume", blob, "resume.pdf");
          }
        } catch {
          // Continue without resume
        }
      }
    }
  }

  const applyUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${atsJobId}/applications`;
  const applyRes = await fetch(applyUrl, { method: "POST", body: formData });

  if (!applyRes.ok) {
    const errorText = await applyRes.text();
    return {
      success: false,
      error: `Greenhouse submission failed: ${applyRes.status} - ${errorText}`,
    };
  }

  const result = await applyRes.json();
  return {
    success: true,
    message: `Applied to ${job.title} at ${job.company} via Greenhouse`,
    applicationId: result.id,
  };
}

async function submitAshby(
  job: Record<string, unknown>,
  fields: FormField[]
) {
  const urlStr = job.url as string;
  const boardMatch = urlStr.match(/jobs\.ashbyhq\.com\/([\w-]+)\//);
  const boardId = boardMatch?.[1];

  if (!boardId) {
    return { success: false, error: "Could not extract Ashby board ID" };
  }

  // Build Ashby application payload
  const fieldValues: Record<string, string> = {};
  for (const field of fields) {
    if (field.value && field.type !== "file") {
      fieldValues[field.name] = field.value;
    }
  }

  const applyUrl = `https://api.ashbyhq.com/posting-api/job-board/${boardId}/jobs/${job.ats_job_id}/application`;
  const applyRes = await fetch(applyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fieldValues }),
  });

  if (!applyRes.ok) {
    const errorText = await applyRes.text();
    return {
      success: false,
      error: `Ashby submission failed: ${applyRes.status} - ${errorText}`,
    };
  }

  return {
    success: true,
    message: `Applied to ${job.title} at ${job.company} via Ashby`,
  };
}

async function submitLever(
  job: Record<string, unknown>,
  fields: FormField[]
) {
  // Lever uses a standard form post to their apply endpoint
  const formData = new FormData();
  for (const field of fields) {
    if (field.value && field.type !== "file") {
      formData.append(field.name, field.value);
    }
  }

  // Lever apply URL pattern
  const atsJobId = job.ats_job_id as string;
  const applyUrl = `https://jobs.lever.co/apply/${atsJobId}`;
  const applyRes = await fetch(applyUrl, { method: "POST", body: formData });

  if (!applyRes.ok) {
    const errorText = await applyRes.text();
    return {
      success: false,
      error: `Lever submission failed: ${applyRes.status} - ${errorText}`,
    };
  }

  return {
    success: true,
    message: `Applied to ${job.title} at ${job.company} via Lever`,
  };
}
