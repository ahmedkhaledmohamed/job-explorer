import { createHash } from "crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { generate } from "@/lib/ai";

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

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "text/html",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function syncGreenhouse(boardToken: string): Promise<Job[]> {
  const data = await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`
  ) as { jobs: Array<{ id: number; title: string; location: { name: string }; absolute_url: string; content: string }> };

  return (data.jobs || []).map((j) => ({
    id: makeId(j.title, boardToken, j.absolute_url),
    title: j.title,
    company: titleCase(boardToken),
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
    company: titleCase(companySlug),
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
  ) as { jobs: Array<{ id: string; title: string; location: string; jobUrl: string; descriptionHtml: string }> };

  return (data.jobs || []).map((j) => ({
    id: makeId(j.title, boardId, j.jobUrl || ""),
    title: j.title,
    company: titleCase(boardId),
    location: j.location || null,
    url: j.jobUrl || `https://jobs.ashbyhq.com/${boardId}/${j.id}`,
    source: "ashby",
    description: j.descriptionHtml || null,
    ats_job_id: j.id,
  }));
}

async function syncWorkable(subdomain: string): Promise<Job[]> {
  const data = await fetchJson(
    `https://apply.workable.com/api/v1/widget/accounts/${subdomain}`
  ) as { jobs: Array<{ title: string; shortcode: string; city: string; state: string; country: string; department: string; url: string }> };

  return (data.jobs || []).map((j) => ({
    id: makeId(j.title, subdomain, j.url || j.shortcode),
    title: j.title,
    company: titleCase(subdomain),
    location: [j.city, j.state, j.country].filter(Boolean).join(", ") || null,
    url: j.url || `https://apply.workable.com/${subdomain}/j/${j.shortcode}`,
    source: "workable",
    description: null,
    ats_job_id: j.shortcode,
  }));
}

async function syncSmartRecruiters(companyId: string): Promise<Job[]> {
  const data = await fetchJson(
    `https://api.smartrecruiters.com/v1/companies/${companyId}/postings`
  ) as { content: Array<{ id: string; name: string; location: { city: string; region: string; country: string }; releasedDate: string; ref: string }> };

  return (data.content || []).map((j) => ({
    id: makeId(j.name, companyId, j.ref || j.id),
    title: j.name,
    company: titleCase(companyId),
    location: j.location ? [j.location.city, j.location.region, j.location.country].filter(Boolean).join(", ") : null,
    url: j.ref || `https://jobs.smartrecruiters.com/${companyId}/${j.id}`,
    source: "smartrecruiters",
    description: null,
    ats_job_id: j.id,
  }));
}

const SCRAPE_PROMPT = `You are a job listing extractor. Given the HTML content of a careers/jobs page, extract all job listings you can find.

Return a JSON object:
{
  "company": "Company name (infer from page content)",
  "jobs": [
    {
      "title": "Job title",
      "location": "Location or null",
      "url": "Full URL to the job posting or null",
      "description": "Brief description if visible, or null"
    }
  ]
}

Extract ALL jobs visible on the page. If no jobs are found, return an empty jobs array.`;

async function syncUrlScrape(pageUrl: string, boardName: string): Promise<Job[]> {
  const html = await fetchHtml(pageUrl);
  const trimmed = html.slice(0, 30000);

  const { content } = await generate(SCRAPE_PROMPT, `URL: ${pageUrl}\n\nHTML:\n${trimmed}`);
  const parsed = JSON.parse(content);

  const company = parsed.company || boardName;
  return (parsed.jobs || []).map((j: { title: string; location: string | null; url: string | null; description: string | null }) => ({
    id: makeId(j.title, company, j.url || pageUrl),
    title: j.title,
    company,
    location: j.location || null,
    url: j.url || pageUrl,
    source: "url_scrape",
    description: j.description || null,
    ats_job_id: null,
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
    case "workable":
      jobs = await syncWorkable(config.subdomain || config.board_id || "");
      break;
    case "smartrecruiters":
      jobs = await syncSmartRecruiters(config.company_id || config.board_id || "");
      break;
    case "wellfound":
    case "workday":
    case "url_scrape":
      jobs = await syncUrlScrape(config.url || "", config.name || boardType);
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
