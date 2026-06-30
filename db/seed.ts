import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Run schema
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql(statement);
  }

  console.log("Schema created successfully");

  // Insert sample data
  const sampleJobs = [
    {
      id: "sample-1",
      title: "Senior Product Manager",
      company: "Stripe",
      location: "Toronto, ON",
      url: "https://stripe.com/jobs/1",
      source: "greenhouse",
      description: "Lead product strategy for payments infrastructure.",
      ats_job_id: "12345",
      status: "new",
    },
    {
      id: "sample-2",
      title: "Staff Product Manager, Platform",
      company: "Shopify",
      location: "Toronto, ON (Remote)",
      url: "https://shopify.com/careers/2",
      source: "lever",
      description: "Drive platform product strategy and roadmap.",
      ats_job_id: "67890",
      status: "new",
    },
    {
      id: "sample-3",
      title: "Product Manager, Developer Tools",
      company: "Vercel",
      location: "Remote",
      url: "https://vercel.com/careers/3",
      source: "ashby",
      description: "Own the developer experience for deployment workflows.",
      ats_job_id: "pm-devtools",
      status: "saved",
    },
    {
      id: "sample-4",
      title: "Senior PM, Messaging Platform",
      company: "Discord",
      location: "San Francisco, CA (Remote)",
      url: "https://discord.com/jobs/4",
      source: "greenhouse",
      description:
        "Lead the messaging platform team to build reliable, scalable messaging.",
      ats_job_id: "msg-pm-01",
      status: "applied",
    },
    {
      id: "sample-5",
      title: "Principal Product Manager",
      company: "Confluent",
      location: "Toronto, ON",
      url: "https://confluent.io/careers/5",
      source: "greenhouse",
      description:
        "Define product strategy for Cluster Linking and data streaming.",
      ats_job_id: "ppm-cl-01",
      status: "interviewing",
    },
  ];

  for (const job of sampleJobs) {
    await sql`
      INSERT INTO jobs (id, title, company, location, url, source, description, ats_job_id, status)
      VALUES (${job.id}, ${job.title}, ${job.company}, ${job.location}, ${job.url}, ${job.source}, ${job.description}, ${job.ats_job_id}, ${job.status})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log(`Seeded ${sampleJobs.length} sample jobs`);

  // Insert default apply profile
  await sql`
    INSERT INTO apply_profile (full_name, email, phone, linkedin_url, work_authorization)
    VALUES ('Ahmed Khaled', 'ahmed.k.abdelhameed@gmail.com', '', 'https://linkedin.com/in/ahmedkhaledmohamed', 'Canadian Citizen')
    ON CONFLICT DO NOTHING
  `;

  console.log("Seeded apply profile");
}

seed().catch(console.error);
