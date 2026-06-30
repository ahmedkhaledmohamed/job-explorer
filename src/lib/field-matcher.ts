import type { FormField, ApplyProfile } from "@/lib/db";
import type { NeonQueryFunction } from "@neondatabase/serverless";

export async function matchFields(
  fields: FormField[],
  profile: ApplyProfile,
  sql: NeonQueryFunction<false, false>
): Promise<FormField[]> {
  // Split name once
  const nameParts = profile.full_name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Build profile field map for direct matching
  const profileMap: Record<string, string> = {};

  if (firstName) profileMap["first_name"] = firstName;
  if (lastName) profileMap["last_name"] = lastName;
  if (profile.email) profileMap["email"] = profile.email;
  if (profile.phone) profileMap["phone"] = profile.phone;
  if (profile.linkedin_url) {
    profileMap["linkedin"] = profile.linkedin_url;
    profileMap["linkedin_profile_url"] = profile.linkedin_url;
    profileMap["linkedin_url"] = profile.linkedin_url;
  }
  if (profile.resume_url) profileMap["resume"] = profile.resume_url;
  if (profile.default_cover_letter) {
    profileMap["cover_letter"] = profile.default_cover_letter;
  }
  if (profile.work_authorization) {
    profileMap["work_authorization"] = profile.work_authorization;
  }

  // Fetch all saved answers from the answer bank
  const savedAnswers = await sql`SELECT question_pattern, answer FROM profile_answers`;
  const answerMap = new Map<string, string>();
  for (const row of savedAnswers) {
    answerMap.set(row.question_pattern as string, row.answer as string);
  }

  const workAuthPattern = /work.*(auth|visa|sponsor|permit)/i;
  const howHeardPattern = /how.*hear|where.*find|referr/i;
  const demoPattern = /gender|race|ethnicity|veteran|disability/i;

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

    // Check work authorization by label pattern
    if (workAuthPattern.test(labelKey) && profile.work_authorization) {
      f.value = profile.work_authorization;
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

    // 3. Common defaults
    if (howHeardPattern.test(labelKey)) {
      f.value = "Company website";
      f.matched = true;
      return f;
    }

    if (demoPattern.test(labelKey)) {
      // For select fields, try to find a "decline" option
      if (f.options && f.options.length > 0) {
        const declineOption = f.options.find(
          (o) =>
            /decline|prefer not|rather not/i.test(o)
        );
        f.value = declineOption || f.options[0];
      } else {
        f.value = "Prefer not to say";
      }
      f.matched = true;
      return f;
    }

    // No match
    f.matched = false;
    return f;
  });

  return result;
}
