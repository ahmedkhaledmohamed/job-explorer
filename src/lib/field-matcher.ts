import type { FormField, ApplyProfile } from "@/lib/db";
import type { NeonQueryFunction } from "@neondatabase/serverless";

export async function matchFields(
  fields: FormField[],
  profile: ApplyProfile,
  sql: NeonQueryFunction<false, false>
): Promise<FormField[]> {
  const firstName = profile.first_name || profile.full_name.split(" ")[0] || "";
  const lastName =
    profile.last_name || profile.full_name.split(" ").slice(1).join(" ") || "";

  const profileMap: Record<string, string> = {};

  if (firstName) profileMap["first_name"] = firstName;
  if (lastName) profileMap["last_name"] = lastName;
  if (profile.full_name) profileMap["name"] = profile.full_name;
  if (profile.email) profileMap["email"] = profile.email;
  if (profile.phone) profileMap["phone"] = profile.phone;

  // LinkedIn
  if (profile.linkedin_url) {
    profileMap["linkedin"] = profile.linkedin_url;
    profileMap["linkedin_profile_url"] = profile.linkedin_url;
    profileMap["linkedin_url"] = profile.linkedin_url;
    profileMap["linkedin_profile"] = profile.linkedin_url;
  }

  // GitHub
  if (profile.github_url) {
    profileMap["github"] = profile.github_url;
    profileMap["github_url"] = profile.github_url;
    profileMap["github_profile"] = profile.github_url;
    profileMap["github_profile_url"] = profile.github_url;
  }

  // Portfolio / website
  if (profile.portfolio_url) {
    profileMap["portfolio"] = profile.portfolio_url;
    profileMap["portfolio_url"] = profile.portfolio_url;
  }
  if (profile.personal_website) {
    profileMap["website"] = profile.personal_website;
    profileMap["personal_website"] = profile.personal_website;
    profileMap["personal_url"] = profile.personal_website;
  }

  // Resume & cover letter
  if (profile.resume_url) profileMap["resume"] = profile.resume_url;
  if (profile.default_cover_letter) {
    profileMap["cover_letter"] = profile.default_cover_letter;
  }

  // Work auth
  if (profile.work_authorization) {
    profileMap["work_authorization"] = profile.work_authorization;
  }

  // Current position
  if (profile.current_company) {
    profileMap["current_company"] = profile.current_company;
    profileMap["current_employer"] = profile.current_company;
  }
  if (profile.current_title) {
    profileMap["current_title"] = profile.current_title;
    profileMap["current_job_title"] = profile.current_title;
  }

  // Pronouns
  if (profile.pronouns) profileMap["pronouns"] = profile.pronouns;

  // Location
  if (profile.location_city) {
    profileMap["city"] = profile.location_city;
    profileMap["location_city"] = profile.location_city;
  }
  if (profile.location_state) {
    profileMap["state"] = profile.location_state;
    profileMap["location_state"] = profile.location_state;
    profileMap["province"] = profile.location_state;
  }
  if (profile.location_country) {
    profileMap["country"] = profile.location_country;
    profileMap["location_country"] = profile.location_country;
  }
  if (profile.location_city && profile.location_state) {
    profileMap["location"] =
      `${profile.location_city}, ${profile.location_state}`;
  }

  // Education
  if (profile.university) {
    profileMap["university"] = profile.university;
    profileMap["school"] = profile.university;
    profileMap["college"] = profile.university;
  }
  if (profile.degree) profileMap["degree"] = profile.degree;
  if (profile.field_of_study) {
    profileMap["field_of_study"] = profile.field_of_study;
    profileMap["major"] = profile.field_of_study;
  }
  if (profile.years_of_experience != null) {
    profileMap["years_of_experience"] = String(profile.years_of_experience);
    profileMap["years_experience"] = String(profile.years_of_experience);
  }

  // Job preferences
  if (profile.notice_period) {
    profileMap["notice_period"] = profile.notice_period;
    profileMap["availability"] = profile.notice_period;
  }
  if (profile.earliest_start_date) {
    profileMap["start_date"] = profile.earliest_start_date;
    profileMap["earliest_start"] = profile.earliest_start_date;
  }
  if (profile.desired_salary_min && profile.desired_salary_max) {
    const salary = `${profile.desired_salary_min.toLocaleString()} - ${profile.desired_salary_max.toLocaleString()} ${profile.salary_currency || "CAD"}`;
    profileMap["salary"] = salary;
    profileMap["desired_salary"] = salary;
    profileMap["salary_expectations"] = salary;
    profileMap["compensation"] = salary;
  }
  if (profile.citizenship) {
    profileMap["citizenship"] = profile.citizenship;
  }

  // Fetch saved answers from the answer bank
  const savedAnswers =
    await sql`SELECT question_pattern, answer FROM profile_answers`;
  const answerMap = new Map<string, string>();
  for (const row of savedAnswers) {
    answerMap.set(row.question_pattern as string, row.answer as string);
  }

  const workAuthPattern = /work.*(auth|visa|sponsor|permit)/i;
  const howHeardPattern = /how.*hear|where.*find|referr/i;
  const demoPattern = /gender|race|ethnicity|veteran|disability/i;
  const relocatePattern = /relocat|willing.*move/i;
  const sponsorPattern = /sponsor/i;

  const result: FormField[] = fields.map((field) => {
    const f = { ...field };
    const nameKey = field.name.toLowerCase().trim();
    const labelKey = field.label.toLowerCase().trim();

    // 1. Direct profile match by field name
    if (profileMap[nameKey]) {
      f.value = profileMap[nameKey];
      f.matched = true;
      return f;
    }

    // Work authorization by label pattern
    if (workAuthPattern.test(labelKey) && profile.work_authorization) {
      f.value = profile.work_authorization;
      f.matched = true;
      return f;
    }

    // Visa sponsorship by label
    if (sponsorPattern.test(labelKey) && !workAuthPattern.test(labelKey)) {
      f.value = profile.visa_sponsorship_needed ? "Yes" : "No";
      f.matched = true;
      return f;
    }

    // Relocation by label
    if (relocatePattern.test(labelKey)) {
      f.value = profile.willing_to_relocate ? "Yes" : "No";
      f.matched = true;
      return f;
    }

    // 2. Answer bank match by normalized label
    const bankAnswer = answerMap.get(labelKey);
    if (bankAnswer) {
      f.value = bankAnswer;
      f.matched = true;
      return f;
    }

    // 3. Common defaults from profile
    if (howHeardPattern.test(labelKey)) {
      f.value = profile.how_did_you_hear || "Company website";
      f.matched = true;
      return f;
    }

    if (demoPattern.test(labelKey)) {
      // Use profile demographics if available
      if (/gender/i.test(labelKey) && profile.gender) {
        f.value = profile.gender;
        f.matched = true;
        return f;
      }
      if (/race|ethnicity/i.test(labelKey) && profile.race_ethnicity) {
        f.value = profile.race_ethnicity;
        f.matched = true;
        return f;
      }
      if (/veteran/i.test(labelKey) && profile.veteran_status) {
        f.value = profile.veteran_status;
        f.matched = true;
        return f;
      }
      if (/disability/i.test(labelKey) && profile.disability_status) {
        f.value = profile.disability_status;
        f.matched = true;
        return f;
      }
      // Fallback: try to find a "decline" option in selects
      if (f.options && f.options.length > 0) {
        const declineOption = f.options.find((o) =>
          /decline|prefer not|rather not/i.test(o)
        );
        f.value = declineOption || f.options[0];
      } else {
        f.value = "Prefer not to say";
      }
      f.matched = true;
      return f;
    }

    f.matched = false;
    return f;
  });

  return result;
}
