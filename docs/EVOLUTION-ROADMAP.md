# Job Explorer → Platform Evolution Roadmap

## The Problem

Three fundamental breakdowns in how hiring works today:

1. **Candidates can't demonstrate** — Resumes are flat documents. They describe titles and bullet points but can't show thinking, trade-offs, or decision quality. LinkedIn profiles are generic. There's no way to "demo yourself."

2. **Companies can't communicate** — Job descriptions are wishlists in prose. They mix must-haves with nice-to-haves, omit team context, and use keyword soup that filters out great candidates who use different terminology.

3. **Matching is broken** — ATS keyword matching rewards resume-optimization, not actual fit. A mediocre candidate with the right keywords passes. A great candidate who describes the same skill differently gets filtered. Neither side knows why they're being matched or rejected.

## The Thesis

**Profiles that demonstrate, not describe. Requirements that communicate, not filter. Matching that understands, not keywords.**

The profile IS the product — not a form, a PDF, or a list of skills. A living demonstration of how someone thinks, decides, and delivers. The job posting IS the company's demonstration of what the work actually is.

## Current State

Single-user Next.js 16 app (Neon Postgres, Tailwind, Vercel) with:
- Job ingestion from Python scraper (Greenhouse, Ashby, Lever, YC, etc.)
- 40+ field candidate profile with ATS auto-fill
- AI-generated tailored resumes and cover letters (Together AI / Grok)
- Auto-apply to Greenhouse, Ashby, Lever
- 631 jobs tracked, 21 top matches, 150+ companies

---

## Phase 1: Demonstrable Profile (Iterations 1-5)

*Transform the private profile into something you can share and a hiring manager can evaluate in 30 seconds. Still single-user — no auth needed.*

### Iteration 1: Case Studies

**Problem**: "Led incident response on Android push delivery drop" — a hiring manager can't evaluate the quality of your thinking from a bullet point.

**Ships**:
- `/case-studies` page for authoring structured case studies
- Each has: title, company, role, situation, approach, decisions (with rationale + outcome), metrics, reflections, skills tags
- Markdown body with AI-assisted structuring ("Tell me about a time you..." → structured output)

**Schema**: `case_studies` table — `id`, `slug` (UNIQUE), `title`, `company`, `role`, `situation`, `approach`, `decisions` (JSONB array of {decision, rationale, outcome}), `metrics` (JSONB), `reflections`, `skills` (TEXT[]), `published` (BOOLEAN), `created_at`, `updated_at`

**Why first**: Case studies are the atomic unit of "demonstrate." Everything builds on them.

---

### Iteration 2: Public Profile Page

**Problem**: No single URL represents you as a candidate. LinkedIn is generic. Resumes are PDFs lost in email.

**Ships**:
- Public profile at `/p/[username]` — summary, experience timeline, case studies, skills, links
- OG meta tags + JSON-LD (Person schema) for social sharing
- Toggle between PM and EM framing (resume variants already exist)
- Clean design optimized for a hiring manager spending 30 seconds
- Mobile-responsive

**Schema**: `public_profiles` table — `username` (PK), `profile_id` (FK), `headline`, `summary`, `experience` (JSONB: [{company, title, start, end, highlights[], case_study_slugs[]}]), `skills` (JSONB), `theme`, `is_public` (BOOLEAN)

**Unlocks**: A shareable URL. "Here's my profile" instead of "here's my resume PDF."

---

### Iteration 3: Resume Import & Profile Seeding

**Problem**: Building a rich profile from scratch is friction. Most people already have a resume — use it.

**Ships**:
- Resume PDF upload → AI extraction → populate profile fields
- LinkedIn URL paste → scrape public profile → populate experience, skills, education
- "Import from resume" button on the profile page that pre-fills everything
- Extracted data is editable — AI seeds, human curates

**Technical**: Use the existing `generate()` AI abstraction with a structured extraction prompt. Parse PDF text with `pdf-parse` or similar. LinkedIn scrape via public profile HTML.

**Why here**: Reduces the barrier to a complete profile from "fill out 40 fields" to "upload your resume."

---

### Iteration 4: Structured Job Requirements (JD Parser)

**Problem**: Job descriptions are prose. The `top_match` flag is a manual boolean. There's no structured understanding of what a job actually needs.

**Ships**:
- Automatic JD parsing on job ingestion: extract requirements categorized as `must_have`, `nice_to_have`, `inferred`
- Each requirement typed: `skill`, `experience`, `domain`, `trait`, `tool`
- Match score computed against profile (% of must-haves covered, with evidence)
- "Requirements" tab on job detail showing structured breakdown
- Jobs sortable by match score (replaces manual top_match as primary ranking signal)

**Schema**: `job_requirements` table — `id`, `job_id` (FK), `requirement`, `category` (must_have/nice_to_have/inferred), `type` (skill/experience/domain/trait/tool), `match_status`, `match_evidence`, `extracted_at`. Add `match_score` (FLOAT) + `match_details` (JSONB) to `jobs`.

**Why here**: Structured requirements are the prerequisite for intelligent matching. They transform keyword-matching into semantic understanding.

---

### Iteration 5: Fit Narratives

**Problem**: Cover letters are generic. The real question is: "Why would THIS person be great at THIS specific job?" That requires connecting specific case studies to specific requirements.

**Ships**:
- On job detail, "Generate Fit Narrative" that maps case studies to job requirements
- AI-generated: requirement → relevant case study → why this maps → confidence level
- Shareable URL: `/p/[username]/fit/[job-slug]`
- Editable before sharing — candidate curates the AI output
- Can be attached to applications as a "why I'm a fit" artifact

**Schema**: `fit_narratives` table — `id`, `job_id` (FK), `profile_id`, `requirements` (JSONB), `mappings` (JSONB: [{requirement, case_study_slug, explanation, confidence}]), `overall_narrative`, `slug` (UNIQUE), `published`, `created_at`

**Why here**: Fit narratives bridge "I have a profile" and "I'm right for YOUR job." They're the strongest version of "demonstrate, not describe."

---

## Phase 2: Multi-User Foundation (Iterations 6-9)

*Enable other people to use the platform. Auth, data isolation, shared job board, guided onboarding.*

### Iteration 6: Auth & User Model

**Problem**: Single user, hardcoded. Can't grow without accounts.

**Ships**:
- NextAuth.js with Google + GitHub OAuth (no password management)
- `users` table, `user_id` FK on all existing tables
- Migration assigns existing data to user #1
- Protected routes (dashboard, jobs, profile, apply)
- Public routes remain (`/p/[username]/*`)
- Invite-only registration (invite codes seeded manually)

**Schema**: `users` table — `id`, `email` (UNIQUE), `name`, `username` (UNIQUE), `avatar_url`, `provider`, `provider_id`, `invite_code`, `created_at`, `last_login`. `invite_codes` table — `code` (PK), `created_by`, `used_by`, `used_at`.

**Why now**: Auth is the minimum barrier to multi-user. Invite-only keeps quality high during cold start.

---

### Iteration 7: Profile Builder Wizard

**Problem**: 40+ fields in collapsible sections. A new user bounces. Needs to feel like a conversation, not a tax form.

**Ships**:
- 5-step guided onboarding:
  1. "Who are you?" — name, title, location, links
  2. "What do you bring?" — skills from taxonomy, experience level, domains
  3. "Show your work" — create first case study (AI-assisted)
  4. "What are you looking for?" — role type, seniority, location, salary range
  5. "Preview & publish" — see your public profile, choose username
- Profile completeness score with suggestions
- Skip-able steps (come back later)

**Schema**: `skills_taxonomy` table — `id`, `name`, `category` (technical/domain/leadership/tool), `parent_id`. Seed with ~200 PM/EM-relevant skills. Add `wizard_progress` (JSONB) to `users`.

**Why here**: Without guided onboarding, multi-user dies at registration.

---

### Iteration 8: Shared Job Board

**Problem**: Each user would need their own scraper. Instead, shared job pool with per-user interactions.

**Ships**:
- Scraper pushes to a shared `jobs` table (no user_id on jobs)
- Per-user job interactions: save, dismiss, apply, notes, match score
- Feed sorted by match score (computed from user's profile + case studies vs. job requirements)
- "Today's top matches" section on dashboard
- Same filters as before (status, source, company) but per-user

**Schema**: Refactor — move `status`, `notes`, `top_match`, `applied_at`, `resume_version` from `jobs` to new `user_jobs` table: `user_id`, `job_id`, `status`, `notes`, `match_score` (FLOAT), `match_details` (JSONB), `top_match`, `saved_at`, `applied_at`, `resume_version`, PK(`user_id`, `job_id`).

**Why here**: Shared job data = first network effect. Even without companies, candidates benefit from curated scored feeds.

---

### Iteration 9: Application Pipeline & Analytics

**Problem**: No tracking after "Applied." Did you get a response? An interview? What patterns emerge?

**Ships**:
- Full pipeline: Discovered → Saved → Applied → Screen → Interview → Offer → Accepted/Rejected
- Kanban board view for pipeline stages
- Per-stage timestamps and notes
- Application analytics: response rates by company, source, match score tier
- Interview prep: AI generates prep based on JD + company + your case studies
- Pattern detection: "You get 3x more interviews at platform companies"

**Schema**: Extend `user_jobs` with `pipeline_stage`, `pipeline_history` (JSONB), `outcome`, `outcome_reason`. New `interview_prep` table — `id`, `user_job_id`, `stage`, `content`, `key_questions` (JSONB), `generated_at`.

**Why here**: Closes the feedback loop. Application outcomes improve the matching algorithm later.

---

## Phase 3: Company Side (Iterations 10-13)

*Companies start participating. The platform becomes two-sided.*

### Iteration 10: Company Pages (Auto-Generated)

**Problem**: Companies are opaque. Candidates can't evaluate culture or team without networking.

**Ships**:
- Auto-generated company profiles from scraped job data
- Company page: open roles, common requirements across roles, tech stack, location patterns
- "Culture signals" AI-extracted from JDs (what they emphasize, what they never mention)
- Hiring velocity: how fast roles fill, how many open at once
- Company pages are public, SEO-indexed

**Schema**: `companies` table — `id`, `name`, `slug` (UNIQUE), `domain`, `logo_url`, `description`, `industry`, `size_category`, `culture_signals` (JSONB), `tech_stack` (TEXT[]), `hiring_velocity` (JSONB), `auto_generated` (BOOLEAN), `created_at`.

**Why here**: Creates the landing page companies eventually claim. Candidates get value without company participation.

---

### Iteration 11: Company Accounts & Structured Roles

**Problem**: JD parsing is lossy. Companies should define what they actually need directly.

**Ships**:
- Company admin accounts (email domain verification)
- Structured role builder: must-haves, nice-to-haves, deal-breakers from skill taxonomy
- "What success looks like" section: first 90 days, key challenges, team context
- Company case studies: "Here's a problem our team recently solved" (so candidates evaluate the work)
- Structured roles coexist with ATS-ingested JDs

**Schema**: `company_accounts` table — `id`, `company_id` (FK), `admin_user_id` (FK), `verified`, `domain`, `plan`. `role_context` table — `job_id`, `success_criteria`, `first_90_days`, `team_context`, `challenges`.

---

### Iteration 12: Mutual Matching

**Problem**: Matching is one-directional. Candidate→job, but not job→candidate or style fit.

**Ships**:
- Candidate work preferences: async/sync, autonomy level, team size, product stage, growth priorities
- Company work style: decision-making, communication patterns, collaboration style
- Bilateral match score: candidate→job AND job→candidate combined
- "Why you'd be a fit" AND "Why this might not be a fit" shown on both sides
- Add `pgvector` for embedding-based similarity (skills, case studies, preferences as vectors)

**Schema**: `candidate_preferences` — `user_id` (PK), `work_style` (JSONB), `team_preferences` (JSONB), `growth_priorities` (TEXT[]), `deal_breakers` (TEXT[]), `values` (TEXT[]). `company_preferences` — `company_id`, `job_id`, `ideal_candidate` (JSONB), `work_style` (JSONB), `anti_patterns` (TEXT[]).

---

### Iteration 13: Smart Introductions

**Problem**: Even with great matching, someone needs to make the first move.

**Ships**:
- High-match candidates surfaced to company dashboard (configurable threshold)
- "Express interest" for candidates: one-click with fit narrative attached
- "Reach out" for companies: initiate contact with mutual match context
- Introduction quality tracking (which intros → interviews → offers → hires)
- Rate-limited: candidates get N express interests per week (forces focus over spray)
- Email + in-app notifications

**Schema**: `introductions` table — `id`, `candidate_id`, `company_id`, `job_id`, `initiated_by`, `match_score`, `fit_narrative_id`, `status` (pending/viewed/responded/declined), `created_at`, `responded_at`.

---

## Phase 4: Intelligence & Scale (Iterations 14-17)

*Network effects, behavioral learning, monetization.*

### Iteration 14: Behavioral Matching (Algorithm v3)

Outcome tracking from introductions feeds back into matching. Weight skills/experiences that correlate with successful hires. Company-specific models emerge: "Companies like X hire candidates with Y." Matching improves with every interaction.

### Iteration 15: Candidate Insights Dashboard

Profile strength score, market position vs. peers (anonymized), skill gap analysis, demand trends in target segment, career trajectory suggestions. Gives candidates a reason to engage between active job searches.

### Iteration 16: Monetization

- **Companies**: Free (claim page) → Pro (structured roles, intro credits) → Enterprise (API, analytics, unlimited)
- **Candidates**: Free (profile, case studies, 3 intros/week) → Pro (unlimited intros, advanced analytics, interview prep, priority matching)
- Stripe integration for billing

### Iteration 17: API & Integrations

Public API for profiles (with consent), bidirectional ATS sync (Greenhouse/Ashby/Lever), webhook notifications, Slack integration for companies, PDF export, LinkedIn/GitHub import.

---

## Differentiation

| Competitor | Model | Weakness | This platform |
|---|---|---|---|
| **LinkedIn** | Social network + job board | Everyone's there, nobody stands out. Keyword matching. | Demonstrable profiles with case studies and evidence |
| **Hired** | Reverse auction (salary-first) | Reduces candidates to a price tag | Mutual matching on capability + style + preference |
| **Triplebyte** | Assessment-based | Tests skills in isolation, not judgment | Case studies as assessment — real work, not synthetic |
| **Wellfound** | Startup job board | Generic profiles, no structured matching | Structured requirements on both sides |

## Cold Start Strategy

1. **Iterations 1-5**: No cold start. Personal tool, improved.
2. **Iterations 6-8**: Invite-only candidates. Value = shared scored job feed.
3. **Iterations 9-10**: Company pages auto-generated from public data. No company participation needed.
4. **Iteration 11**: Companies claim pages → add structured data. Incentive: see who's interested.
5. **Iterations 12-13**: Introductions close the loop. Companies get high-signal candidates.

Candidates NEVER need companies to participate directly. The job board works with scraped data. Company participation enhances it.

## Data Collected Early, Used Later

| Collected in | Data | Pays off in |
|---|---|---|
| Iteration 1 | Case study skills tags | Matching (4, 12), Insights (15) |
| Iteration 4 | Structured job requirements | Mutual matching (12), Company pages (10) |
| Iteration 8 | Per-user job interactions | Recommendations (8), Insights (15) |
| Iteration 9 | Application outcomes | Behavioral matching (14) |
| Iteration 10 | Company culture signals | Mutual matching (12) |
