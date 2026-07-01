import { createHash } from "crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
  description: string | null;
  ats_job_id: string | null;
};

function makeId(title: string, company: string, url: string): string {
  return createHash("md5").update(`${title}|${company}|${url}`).digest("hex");
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": "JobExplorer/1.0" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function syncGreenhouse(boardToken: string): Promise<Job[]> {
  const data = await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`
  ) as { jobs: Array<{ id: number; title: string; location: { name: string }; absolute_url: string; content: string }> };

  return (data.jobs || []).map((j) => ({
    id: makeId(j.title, boardToken, j.absolute_url),
    title: j.title,
    company: boardToken.charAt(0).toUpperCase() + boardToken.slice(1),
    location: j.location?.name || null,
    url: j.absolute_url,
    source: "greenhouse",
    description: j.content || null,
    ats_job_id: String(j.id),
  }));
}

async function syncLever(companySlug: string): Promise<Job[]> {
  const data = await fetchJson(
    `https://api.lever.co/v0/postings/${companySlug}`
  ) as Array<{ id: string; text: string; categories: { location: string; team: string }; hostedUrl: string; descriptionPlain: string }>;

  return (data || []).map((j) => ({
    id: makeId(j.text, companySlug, j.hostedUrl),
    title: j.text,
    company: companySlug.charAt(0).toUpperCase() + companySlug.slice(1),
    location: j.categories?.location || null,
    url: j.hostedUrl,
    source: "lever",
    description: j.descriptionPlain || null,
    ats_job_id: j.id,
  }));
}

async function syncAshby(boardId: string): Promise<Job[]> {
  const data = await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${boardId}`
  ) as { jobs: Array<{ id: string; title: string; location: string; publishedAt: string; jobUrl: string; descriptionHtml: string }> };

  return (data.jobs || []).map((j) => ({
    id: makeId(j.title, boardId, j.jobUrl || ""),
    title: j.title,
    company: boardId.charAt(0).toUpperCase() + boardId.slice(1),
    location: j.location || null,
    url: j.jobUrl || `https://jobs.ashbyhq.com/${boardId}/${j.id}`,
    source: "ashby",
    description: j.descriptionHtml || null,
    ats_job_id: j.id,
  }));
}

export async function syncBoard(
  boardType: string,
  config: Record<string, string>,
  sql: NeonQueryFunction<false, false>
): Promise<{ inserted: number; updated: number; total: number }> {
  let jobs: Job[];

  switch (boardType) {
    case "greenhouse":
      jobs = await syncGreenhouse(config.board_token || config.board_id || "");
      break;
    case "lever":
      jobs = await syncLever(config.company_slug || config.board_id || "");
      break;
    case "ashby":
      jobs = await syncAshby(config.board_id || "");
      break;
    default:
      throw new Error(`Unsupported board type: ${boardType}`);
  }

  let inserted = 0;
  let updated = 0;

  for (const job of jobs) {
    const result = await sql`
      INSERT INTO jobs (id, title, company, location, url, source, description, ats_job_id)
      VALUES (${job.id}, ${job.title}, ${job.company}, ${job.location}, ${job.url}, ${job.source}, ${job.description}, ${job.ats_job_id})
      ON CONFLICT (id) DO UPDATE SET
        last_seen = NOW(),
        title = EXCLUDED.title,
        description = COALESCE(EXCLUDED.description, jobs.description),
        location = COALESCE(EXCLUDED.location, jobs.location)
      RETURNING (xmax = 0) AS is_insert
    `;
    if (result[0]?.is_insert) inserted++;
    else updated++;
  }

  return { inserted, updated, total: jobs.length };
}
