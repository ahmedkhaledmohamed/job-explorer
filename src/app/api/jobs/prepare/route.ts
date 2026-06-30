import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scrapeApplicationForm } from "@/lib/form-scraper";
import { matchFields } from "@/lib/field-matcher";
import type { ApplyProfile } from "@/lib/db";

const SUPPORTED_SOURCES = ["greenhouse", "ashby", "lever"];

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

  // Get apply profile
  const profileResult =
    await sql`SELECT * FROM apply_profile ORDER BY id LIMIT 1`;
  if (profileResult.length === 0) {
    return NextResponse.json(
      { error: "No apply profile configured. Set one up at /profile first." },
      { status: 400 }
    );
  }
  const profile = profileResult[0] as unknown as ApplyProfile;

  const results = [];

  for (const jobId of jobIds) {
    // Fetch job
    const jobResult = await sql`SELECT * FROM jobs WHERE id = ${jobId}`;
    if (jobResult.length === 0) {
      results.push({
        jobId,
        title: null,
        company: null,
        canApply: false,
        reason: "Job not found",
        ready: false,
        totalFields: 0,
        matchedFields: 0,
        missingFields: 0,
      });
      continue;
    }

    const job = jobResult[0];
    const source = ((job.source as string) || "").toLowerCase();

    if (!SUPPORTED_SOURCES.includes(source)) {
      results.push({
        jobId,
        title: job.title,
        company: job.company,
        canApply: false,
        reason: "Manual application required",
        ready: false,
        totalFields: 0,
        matchedFields: 0,
        missingFields: 0,
      });
      continue;
    }

    try {
      const rawFields = await scrapeApplicationForm({
        url: job.url as string,
        source: job.source as string,
        ats_job_id: job.ats_job_id as string,
      });

      const matchedFieldList = await matchFields(rawFields, profile, sql);

      const requiredMissing = matchedFieldList.filter(
        (f) => f.required && !f.matched
      );
      const ready = requiredMissing.length === 0;
      const matchedCount = matchedFieldList.filter((f) => f.matched).length;

      // Upsert into application_forms
      await sql`
        INSERT INTO application_forms (job_id, fields, scraped_at, ready)
        VALUES (${jobId}, ${JSON.stringify(matchedFieldList)}, NOW(), ${ready})
        ON CONFLICT (job_id) DO UPDATE SET
          fields = ${JSON.stringify(matchedFieldList)},
          scraped_at = NOW(),
          ready = ${ready}
      `;

      results.push({
        jobId,
        title: job.title,
        company: job.company,
        canApply: true,
        ready,
        totalFields: matchedFieldList.length,
        matchedFields: matchedCount,
        missingFields: matchedFieldList.length - matchedCount,
      });
    } catch (error) {
      results.push({
        jobId,
        title: job.title,
        company: job.company,
        canApply: false,
        reason:
          error instanceof Error ? error.message : "Unknown scraping error",
        ready: false,
        totalFields: 0,
        matchedFields: 0,
        missingFields: 0,
      });
    }
  }

  return NextResponse.json({ results });
}
