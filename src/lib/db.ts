import { neon } from "@neondatabase/serverless";

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(databaseUrl);
}

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
  notes: string | null;
  applied_at: string | null;
  resume_version: string | null;
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
  created_at: string;
  updated_at: string;
};

export type JobStats = {
  total: number;
  newThisWeek: number;
  applied: number;
  companiesTracked: number;
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
