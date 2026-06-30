CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  url TEXT NOT NULL,
  source TEXT,
  description TEXT,
  ats_job_id TEXT,
  posted_date TIMESTAMPTZ,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new',
  top_match BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  applied_at TIMESTAMPTZ,
  resume_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_first_seen ON jobs(first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_top_match ON jobs(top_match) WHERE top_match = TRUE;

CREATE TABLE IF NOT EXISTS apply_profile (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  work_authorization TEXT,
  default_cover_letter TEXT,
  -- Personal
  first_name TEXT,
  last_name TEXT,
  pronouns TEXT,
  location_city TEXT,
  location_state TEXT,
  location_country TEXT,
  current_company TEXT,
  current_title TEXT,
  -- Links
  github_url TEXT,
  portfolio_url TEXT,
  personal_website TEXT,
  -- Work auth expanded
  visa_sponsorship_needed BOOLEAN DEFAULT FALSE,
  citizenship TEXT,
  -- Job preferences
  desired_salary_min INTEGER,
  desired_salary_max INTEGER,
  salary_currency TEXT DEFAULT 'CAD',
  notice_period TEXT,
  earliest_start_date DATE,
  willing_to_relocate BOOLEAN DEFAULT FALSE,
  preferred_locations TEXT,
  -- Education
  years_of_experience INTEGER,
  highest_education TEXT,
  university TEXT,
  degree TEXT,
  field_of_study TEXT,
  graduation_year INTEGER,
  -- Demographics (EEOC)
  gender TEXT DEFAULT 'Decline to self-identify',
  race_ethnicity TEXT DEFAULT 'Decline to self-identify',
  veteran_status TEXT DEFAULT 'I am not a protected veteran',
  disability_status TEXT DEFAULT 'Prefer not to say',
  -- Materials
  pm_resume_md TEXT,
  em_resume_md TEXT,
  how_did_you_hear TEXT DEFAULT 'Company website',
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_forms (
  job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  fields JSONB NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ready BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS profile_answers (
  id SERIAL PRIMARY KEY,
  question_pattern TEXT NOT NULL UNIQUE,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_count INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_profile_answers_pattern ON profile_answers(question_pattern);

CREATE TABLE IF NOT EXISTS case_studies (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  company TEXT,
  role TEXT,
  situation TEXT,
  approach TEXT,
  decisions JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '{}',
  reflections TEXT,
  skills TEXT[] DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_studies_slug ON case_studies(slug);
CREATE INDEX IF NOT EXISTS idx_case_studies_published ON case_studies(published) WHERE published = TRUE;

CREATE TABLE IF NOT EXISTS public_profiles (
  username TEXT PRIMARY KEY,
  profile_id INTEGER REFERENCES apply_profile(id),
  headline TEXT,
  summary TEXT,
  experience JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  theme TEXT DEFAULT 'default',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_materials (
  id SERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_variant TEXT NOT NULL,
  tailored_resume TEXT,
  cover_letter TEXT,
  generation_model TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, resume_variant)
);
CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id);
