import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  // Get job
  const jobResult = await sql`SELECT * FROM jobs WHERE id = ${id}`;
  if (jobResult.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  const job = jobResult[0];

  if (!job.ats_job_id) {
    return NextResponse.json(
      { error: "Job does not have an ATS job ID" },
      { status: 400 }
    );
  }

  // Get apply profile
  const profileResult =
    await sql`SELECT * FROM apply_profile ORDER BY id LIMIT 1`;
  if (profileResult.length === 0) {
    return NextResponse.json(
      { error: "No apply profile configured. Set one up at /profile first." },
      { status: 400 }
    );
  }
  const profile = profileResult[0];

  const source = (job.source || "").toLowerCase();

  try {
    let result;

    switch (source) {
      case "greenhouse":
        result = await applyGreenhouse(job, profile);
        break;
      case "lever":
        result = applyLever();
        break;
      case "ashby":
        result = applyAshby();
        break;
      default:
        return NextResponse.json(
          {
            error: `Unsupported ATS source: ${job.source}. Supported: greenhouse, lever, ashby`,
          },
          { status: 400 }
        );
    }

    if (result.success) {
      // Mark job as applied
      await sql`
        UPDATE jobs SET status = 'applied', applied_at = NOW() WHERE id = ${id}
      `;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Auto-apply error:", error);
    return NextResponse.json(
      {
        error: `Failed to apply: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

async function applyGreenhouse(
  job: Record<string, unknown>,
  profile: Record<string, unknown>
) {
  const atsJobId = job.ats_job_id as string;

  // Extract board token from the job URL or use a default
  // Greenhouse URLs look like: https://boards.greenhouse.io/{board_token}/jobs/{id}
  const urlStr = job.url as string;
  const boardMatch = urlStr.match(
    /boards\.greenhouse\.io\/(\w+)/
  );
  const boardToken = boardMatch?.[1];

  if (!boardToken) {
    return {
      success: false,
      error:
        "Could not extract Greenhouse board token from job URL. Expected URL format: https://boards.greenhouse.io/{board}/jobs/{id}",
    };
  }

  // Step 1: Get required questions/fields
  const questionsUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${atsJobId}`;
  const questionsRes = await fetch(questionsUrl);

  if (!questionsRes.ok) {
    return {
      success: false,
      error: `Failed to fetch job details from Greenhouse: ${questionsRes.status} ${questionsRes.statusText}`,
    };
  }

  const jobDetails = await questionsRes.json();
  const questions = jobDetails.questions || [];

  // Step 2: Build form data
  const nameParts = (profile.full_name as string).split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const formData = new FormData();
  formData.append("first_name", firstName);
  formData.append("last_name", lastName);
  formData.append("email", profile.email as string);

  if (profile.phone) {
    formData.append("phone", profile.phone as string);
  }

  if (profile.linkedin_url) {
    formData.append("linkedin_profile_url", profile.linkedin_url as string);
  }

  if (profile.default_cover_letter) {
    formData.append("cover_letter", profile.default_cover_letter as string);
  }

  // If resume_url is set, fetch and attach it
  if (profile.resume_url) {
    try {
      const resumeRes = await fetch(profile.resume_url as string);
      if (resumeRes.ok) {
        const resumeBlob = await resumeRes.blob();
        formData.append("resume", resumeBlob, "resume.pdf");
      }
    } catch {
      // Continue without resume if fetch fails
      console.warn("Could not fetch resume from URL");
    }
  }

  // Answer required questions with sensible defaults
  for (const q of questions) {
    if (q.required && q.fields) {
      for (const field of q.fields) {
        if (field.name === "work_authorization" && profile.work_authorization) {
          formData.append(
            `question_${q.id}`,
            profile.work_authorization as string
          );
        }
      }
    }
  }

  // Step 3: Submit application
  const applyUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${atsJobId}/applications`;
  const applyRes = await fetch(applyUrl, {
    method: "POST",
    body: formData,
  });

  if (!applyRes.ok) {
    const errorText = await applyRes.text();
    return {
      success: false,
      error: `Greenhouse application failed: ${applyRes.status} - ${errorText}`,
    };
  }

  const applyResult = await applyRes.json();
  return {
    success: true,
    source: "greenhouse",
    applicationId: applyResult.id,
    message: `Applied to ${job.title} at ${job.company} via Greenhouse`,
  };
}

function applyLever() {
  return {
    success: false,
    error: "Lever auto-apply is not implemented yet",
  };
}

function applyAshby() {
  return {
    success: false,
    error: "Ashby auto-apply is not implemented yet",
  };
}
