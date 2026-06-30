import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { createHash } from "crypto";

async function importHistory() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) { console.error("DATABASE_URL required"); process.exit(1); }

  const sql = neon(databaseUrl);
  const raw = JSON.parse(readFileSync(process.argv[2] || "../DailyAIJobsDigest/jobs_history.json", "utf-8"));
  const history = Array.isArray(raw) ? raw : (raw.jobs || []);

  let imported = 0;
  let skipped = 0;

  for (const entry of history) {
    const job = entry.job || entry;
    const title = job.title || "";
    const company = job.company || "";
    const url = job.url || "";
    if (!title || !company || !url) { skipped++; continue; }

    const raw = `${title.toLowerCase()}|${company.toLowerCase()}|${url}`;
    const id = createHash("md5").update(raw).digest("hex");
    const firstSeen = entry.first_seen || new Date().toISOString();

    try {
      await sql`
        INSERT INTO jobs (id, title, company, location, url, source, first_seen, last_seen)
        VALUES (${id}, ${title}, ${company}, ${job.location || null}, ${url}, ${job.source || null}, ${firstSeen}::timestamptz, ${firstSeen}::timestamptz)
        ON CONFLICT (id) DO NOTHING
      `;
      imported++;
    } catch (e) {
      console.error(`Failed: ${title} @ ${company}:`, e);
      skipped++;
    }
  }

  console.log(`Imported ${imported} jobs, skipped ${skipped}`);
}

importHistory().catch(console.error);
