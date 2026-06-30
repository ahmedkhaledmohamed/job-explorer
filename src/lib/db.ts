import { neon } from "@neondatabase/serverless";

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(databaseUrl);
}

export type User = {
  id: number;
  email: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  provider: string | null;
  provider_id: string | null;
  invite_code: string | null;
  created_at: string;
  last_login: string | null;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string | null;
  description: string | null;
  ats_job_id: string | null;
  posted_date: string | null;
  first_seen: string;
  last_seen: string;
  status: string;
  top_match: boolean;
  notes: string | null;
  applied_at: string | null;
  resume_version: string | null;
  match_score: number | null;
  match_details: Record<string, unknown> | null;
  pipeline_stage?: string;
  pipeline_history?: PipelineEvent[];
  outcome?: string | null;
  outcome_reason?: string | null;
  form_ready?: boolean | null;
};

export type ApplyProfile = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  work_authorization: string | null;
  default_cover_letter: string | null;
  first_name: string | null;
  last_name: string | null;
  pronouns: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  current_company: string | null;
  current_title: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  personal_website: string | null;
  visa_sponsorship_needed: boolean;
  citizenship: string | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  salary_currency: string | null;
  notice_period: string | null;
  earliest_start_date: string | null;
  willing_to_relocate: boolean;
  preferred_locations: string | null;
  years_of_experience: number | null;
  highest_education: string | null;
  university: string | null;
  degree: string | null;
  field_of_study: string | null;
  graduation_year: number | null;
  gender: string | null;
  race_ethnicity: string | null;
  veteran_status: string | null;
  disability_status: string | null;
  pm_resume_md: string | null;
  em_resume_md: string | null;
  how_did_you_hear: string | null;
  created_at: string;
  updated_at: string;
};

export type JobStats = {
  total: number;
  newThisWeek: number;
  applied: number;
  companiesTracked: number;
  topMatches: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  topCompanies: Array<{ company: string; count: number }>;
  jobsPerWeek: Array<{ week: string; count: number }>;
};

export type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  value?: string;
  matched?: boolean;
};

export type ApplicationForm = {
  job_id: string;
  fields: FormField[];
  scraped_at: string;
  ready: boolean;
};

export type ProfileAnswer = {
  id: number;
  question_pattern: string;
  answer: string;
  created_at: string;
  used_count: number;
};

export type Company = {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  description: string | null;
  industry: string | null;
  size_category: string | null;
  culture_signals: Record<string, unknown>;
  tech_stack: string[];
  hiring_velocity: Record<string, unknown>;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
};

export type Introduction = {
  id: number;
  candidate_id: number;
  company_id: number;
  job_id: string | null;
  initiated_by: "candidate" | "company";
  match_score: number | null;
  fit_narrative_id: number | null;
  message: string | null;
  status: "pending" | "viewed" | "responded" | "declined";
  created_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  response_message: string | null;
  outcome: string | null;
  outcome_at: string | null;
};

export type Subscription = {
  id: number;
  account_type: "user" | "company";
  account_id: number;
  plan: "free" | "pro" | "enterprise";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: "active" | "cancelled" | "past_due";
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchSignal = {
  id: number;
  signal_type: string;
  signal_key: string;
  signal_value: string;
  weight: number;
  positive_count: number;
  negative_count: number;
  computed_at: string;
};

export type CandidatePreferences = {
  user_id: number;
  work_style: {
    communication?: string;
    autonomy?: string;
    meeting_frequency?: string;
    decision_making?: string;
    work_hours?: string;
  };
  team_preferences: {
    team_size?: string;
    product_stage?: string;
    company_size?: string;
    remote_preference?: string;
  };
  growth_priorities: string[];
  deal_breakers: string[];
  values: string[];
  created_at: string;
  updated_at: string;
};

export type CompanyPreferences = {
  id: number;
  company_id: number;
  job_id: string | null;
  ideal_candidate: Record<string, unknown>;
  work_style: Record<string, unknown>;
  anti_patterns: string[];
  created_at: string;
};

export type CompanyAccount = {
  id: number;
  company_id: number;
  admin_user_id: number;
  verified: boolean;
  domain: string | null;
  plan: string;
  created_at: string;
};

export type RoleContext = {
  id: number;
  job_id: string;
  company_id: number | null;
  success_criteria: string | null;
  first_90_days: string | null;
  team_context: string | null;
  challenges: string | null;
  structured_requirements: Array<{ requirement: string; category: string; type: string }>;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type CompanyCaseStudy = {
  id: number;
  company_id: number;
  title: string;
  problem: string | null;
  approach: string | null;
  outcome: string | null;
  tech_used: string[];
  created_by: number | null;
  published: boolean;
  created_at: string;
};

export type CaseStudyDecision = {
  decision: string;
  rationale: string;
  outcome: string;
};

export type CaseStudy = {
  id: number;
  slug: string;
  title: string;
  company: string | null;
  role: string | null;
  situation: string | null;
  approach: string | null;
  decisions: CaseStudyDecision[];
  metrics: Record<string, string>;
  reflections: string | null;
  skills: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type UserJob = {
  user_id: number;
  job_id: string;
  status: string;
  notes: string | null;
  top_match: boolean;
  match_score: number | null;
  match_details: Record<string, unknown> | null;
  saved_at: string | null;
  applied_at: string | null;
  resume_version: string | null;
  pipeline_stage: string;
  pipeline_history: PipelineEvent[];
  outcome: string | null;
  outcome_reason: string | null;
};

export type PipelineEvent = {
  stage: string;
  entered_at: string;
  notes?: string;
};

export type InterviewPrep = {
  id: number;
  user_id: number;
  job_id: string;
  stage: string;
  content: string | null;
  key_questions: string[];
  generated_at: string;
};

export type JobRequirement = {
  id: number;
  job_id: string;
  requirement: string;
  category: "must_have" | "nice_to_have" | "inferred";
  type: "skill" | "experience" | "domain" | "trait" | "tool";
  match_status: "matched" | "partial" | "unmatched" | "pending";
  match_evidence: string | null;
  extracted_at: string;
};

export type FitMapping = {
  requirement: string;
  case_study_slug: string | null;
  case_study_title: string | null;
  explanation: string;
  confidence: "high" | "medium" | "low";
};

export type FitNarrative = {
  id: number;
  job_id: string;
  slug: string;
  requirements: string[];
  mappings: FitMapping[];
  overall_narrative: string | null;
  confidence_score: number | null;
  generation_model: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type ExperienceEntry = {
  company: string;
  title: string;
  start: string;
  end: string;
  highlights: string[];
  case_study_slugs: string[];
};

export type PublicProfile = {
  username: string;
  profile_id: number | null;
  headline: string | null;
  summary: string | null;
  experience: ExperienceEntry[];
  skills: string[];
  theme: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type JobMaterials = {
  id: number;
  job_id: string;
  resume_variant: "pm" | "em";
  tailored_resume: string | null;
  cover_letter: string | null;
  generation_model: string | null;
  generated_at: string;
};
