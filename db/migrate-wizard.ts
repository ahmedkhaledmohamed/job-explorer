import { neon } from "@neondatabase/serverless";

const SKILLS: Record<string, string[]> = {
  technical: [
    "iOS (Swift, SwiftUI)", "Android (Kotlin)", "React / React Native", "TypeScript / JavaScript",
    "Python", "Go", "Java", "SQL / BigQuery", "GraphQL", "REST APIs",
    "SDK & API Design", "Distributed Systems", "Microservices", "Cloud (AWS/GCP/Azure)",
    "CI/CD", "Containerization (Docker/K8s)", "Server-Driven UI",
    "Data Pipelines", "Stream Processing", "Machine Learning Infrastructure",
  ],
  domain: [
    "Platform Engineering", "Developer Experience", "Mobile Infrastructure",
    "Messaging & Notifications", "Payments & Fintech", "Observability & Monitoring",
    "Security & Identity", "Data Platform", "Search & Discovery",
    "Content Delivery", "Experimentation (A/B Testing)", "Personalization & ML",
    "E-commerce", "Consumer Social", "Enterprise SaaS", "Developer Tools",
    "AI/ML Products", "Infrastructure & Cloud", "Media & Streaming",
  ],
  leadership: [
    "Product Strategy", "Technical Roadmapping", "Cross-Functional Alignment",
    "Stakeholder Management", "Executive Communication", "Team Building & Hiring",
    "Performance Management", "Mentorship & Coaching", "Leading Through Ambiguity",
    "Incident Response", "OKR & Goal Setting", "Vendor Management",
    "Change Management", "Org Design", "Budget & Resource Planning",
    "Data-Driven Decision Making", "User Research", "Design Partnership",
  ],
  tool: [
    "Jira / Linear", "Figma", "Amplitude / Mixpanel", "Datadog / Grafana",
    "BigQuery / Snowflake", "Tableau / Looker", "GitHub / GitLab",
    "Confluence / Notion", "Slack", "LLMs (Claude, GPT-4, Llama)",
    "Cursor / Copilot", "Vercel / Netlify", "Terraform", "Bazel",
    "Anthropic API / OpenAI API", "RAG / Vector Search", "Prompt Engineering",
  ],
};

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating skills_taxonomy table...");
  await sql`
    CREATE TABLE IF NOT EXISTS skills_taxonomy (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      parent_id INTEGER REFERENCES skills_taxonomy(id)
    )
  `;
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_skills_taxonomy_category ON skills_taxonomy(category)`);

  console.log("Adding wizard_progress to users...");
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS wizard_progress JSONB DEFAULT '{}'`;

  // Seed skills (skip if already populated)
  const existing = await sql`SELECT COUNT(*) as count FROM skills_taxonomy`;
  if (parseInt(existing[0].count as string) > 0) {
    console.log(`Skills already seeded (${existing[0].count} rows). Skipping.`);
  } else {
    console.log("Seeding skills taxonomy...");
    let total = 0;
    for (const [category, skills] of Object.entries(SKILLS)) {
      for (const name of skills) {
        await sql`INSERT INTO skills_taxonomy (name, category) VALUES (${name}, ${category})`;
        total++;
      }
    }
    console.log(`Seeded ${total} skills across ${Object.keys(SKILLS).length} categories.`);
  }

  console.log("Migration complete.");
}

migrate().catch(console.error);
