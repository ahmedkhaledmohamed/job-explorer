CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  provider TEXT,
  provider_id TEXT,
  invite_code TEXT,
  wizard_progress JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS skills_taxonomy (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  parent_id INTEGER REFERENCES skills_taxonomy(id)
);
CREATE INDEX IF NOT EXISTS idx_skills_taxonomy_category ON skills_taxonomy(category);

CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  created_by INTEGER REFERENCES users(id),
  used_by INTEGER REFERENCES users(id),
  used_at TIMESTAMPTZ
);

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
  resume_version TEXT,
  match_score FLOAT,
  match_details JSONB
);

CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_match_score ON jobs(match_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_first_seen ON jobs(first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_top_match ON jobs(top_match) WHERE top_match = TRUE;

CREATE TABLE IF NOT EXISTS apply_profile (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS user_jobs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  top_match BOOLEAN NOT NULL DEFAULT FALSE,
  match_score FLOAT,
  match_details JSONB,
  saved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  resume_version TEXT,
  pipeline_stage TEXT DEFAULT 'discovered',
  pipeline_history JSONB DEFAULT '[]',
  outcome TEXT,
  outcome_reason TEXT,
  PRIMARY KEY (user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_user_jobs_user_id ON user_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_jobs_match_score ON user_jobs(user_id, match_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_user_jobs_pipeline ON user_jobs(user_id, pipeline_stage);

CREATE TABLE IF NOT EXISTS interview_prep (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  content TEXT,
  key_questions JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interview_prep_job ON interview_prep(user_id, job_id);

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

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  logo_url TEXT,
  description TEXT,
  industry TEXT,
  size_category TEXT,
  culture_signals JSONB DEFAULT '{}',
  tech_stack TEXT[] DEFAULT '{}',
  hiring_velocity JSONB DEFAULT '{}',
  auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

CREATE TABLE IF NOT EXISTS company_accounts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  domain TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_accounts_company ON company_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_accounts_user ON company_accounts(admin_user_id);

CREATE TABLE IF NOT EXISTS role_context (
  id SERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  success_criteria TEXT,
  first_90_days TEXT,
  team_context TEXT,
  challenges TEXT,
  structured_requirements JSONB DEFAULT '[]',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_role_context_job ON role_context(job_id);

CREATE TABLE IF NOT EXISTS company_case_studies (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem TEXT,
  approach TEXT,
  outcome TEXT,
  tech_used TEXT[] DEFAULT '{}',
  created_by INTEGER REFERENCES users(id),
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_case_studies_company ON company_case_studies(company_id);

CREATE TABLE IF NOT EXISTS candidate_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  work_style JSONB DEFAULT '{}',
  team_preferences JSONB DEFAULT '{}',
  growth_priorities TEXT[] DEFAULT '{}',
  deal_breakers TEXT[] DEFAULT '{}',
  values TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_preferences (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  ideal_candidate JSONB DEFAULT '{}',
  work_style JSONB DEFAULT '{}',
  anti_patterns TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_prefs_company ON company_preferences(company_id);
CREATE INDEX IF NOT EXISTS idx_company_prefs_job ON company_preferences(job_id);

CREATE TABLE IF NOT EXISTS case_studies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS job_requirements (
  id SERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  requirement TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  match_status TEXT DEFAULT 'pending',
  match_evidence TEXT,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_requirements_job_id ON job_requirements(job_id);

CREATE TABLE IF NOT EXISTS fit_narratives (
  id SERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  requirements JSONB DEFAULT '[]',
  mappings JSONB DEFAULT '[]',
  overall_narrative TEXT,
  confidence_score FLOAT,
  generation_model TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fit_narratives_job_id ON fit_narratives(job_id);
CREATE INDEX IF NOT EXISTS idx_fit_narratives_slug ON fit_narratives(slug);

CREATE TABLE IF NOT EXISTS public_profiles (
  username TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
