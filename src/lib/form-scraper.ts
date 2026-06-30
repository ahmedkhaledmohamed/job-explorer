import type { FormField } from "@/lib/db";

type JobRecord = {
  url: string;
  source: string | null;
  ats_job_id: string | null;
};

function extractGreenhouseBoard(url: string): string | null {
  // Match both boards.greenhouse.io/{board}/jobs/{id} and job-boards.greenhouse.io/{board}/jobs/{id}
  const match = url.match(
    /(?:boards|job-boards)\.greenhouse\.io\/(\w+)\/jobs/
  );
  return match?.[1] ?? null;
}

function extractAshbyBoard(url: string): string | null {
  const match = url.match(/jobs\.ashbyhq\.com\/([\w-]+)\//);
  return match?.[1] ?? null;
}

function mapGreenhouseFieldType(
  type: string
): FormField["type"] {
  switch (type) {
    case "input_text":
      return "text";
    case "textarea":
      return "textarea";
    case "multi_value_single_select":
      return "select";
    case "multi_value_multi_select":
      return "multi_select";
    case "input_file":
      return "file";
    case "boolean":
      return "checkbox";
    default:
      return "text";
  }
}

async function scrapeGreenhouse(
  boardToken: string,
  atsJobId: string
): Promise<FormField[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${atsJobId}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Greenhouse API returned ${res.status}: ${res.statusText}`
    );
  }

  const data = await res.json();
  const questions: Array<{
    label: string;
    required: boolean;
    fields: Array<{
      name: string;
      type: string;
      values?: Array<{ label: string; value: number }>;
    }>;
  }> = data.questions || [];

  const fields: FormField[] = [];

  for (const question of questions) {
    for (const field of question.fields) {
      const formField: FormField = {
        name: field.name,
        label: question.label,
        type: mapGreenhouseFieldType(field.type),
        required: question.required,
      };

      if (
        field.values &&
        field.values.length > 0 &&
        (formField.type === "select" || formField.type === "multi_select")
      ) {
        formField.options = field.values.map((v) => v.label);
      }

      fields.push(formField);
    }
  }

  return fields;
}

async function scrapeAshby(
  boardId: string,
  atsJobId: string
): Promise<FormField[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${boardId}/jobs/${atsJobId}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Ashby API returned ${res.status}: ${res.statusText}`
    );
  }

  const data = await res.json();
  const fields: FormField[] = [];

  const sections: Array<{
    fields: Array<{
      name: string;
      title: string;
      type: string;
      isRequired: boolean;
      selectableValues?: Array<{ label: string; value: string }>;
    }>;
  }> = data.applicationForm?.sections || [];

  for (const section of sections) {
    for (const field of section.fields) {
      const formField: FormField = {
        name: field.name,
        label: field.title,
        type: field.type === "LongText" ? "textarea" : field.type === "File" ? "file" : field.type === "Boolean" ? "checkbox" : field.type === "ValueSelect" ? "select" : field.type === "MultiValueSelect" ? "multi_select" : "text",
        required: field.isRequired,
      };

      if (field.selectableValues && field.selectableValues.length > 0) {
        formField.options = field.selectableValues.map((v) => v.label);
      }

      fields.push(formField);
    }
  }

  return fields;
}

function getLeverFields(): FormField[] {
  // Lever forms are standardized
  return [
    { name: "first_name", label: "First Name", type: "text", required: true },
    { name: "last_name", label: "Last Name", type: "text", required: true },
    { name: "email", label: "Email", type: "text", required: true },
    { name: "phone", label: "Phone", type: "text", required: false },
    { name: "resume", label: "Resume/CV", type: "file", required: true },
    {
      name: "linkedin_profile_url",
      label: "LinkedIn Profile URL",
      type: "text",
      required: false,
    },
    {
      name: "cover_letter",
      label: "Cover Letter",
      type: "textarea",
      required: false,
    },
  ];
}

export async function scrapeApplicationForm(
  job: JobRecord
): Promise<FormField[]> {
  const source = (job.source || "").toLowerCase();
  const atsJobId = job.ats_job_id;

  if (!atsJobId) {
    throw new Error("Job does not have an ATS job ID");
  }

  switch (source) {
    case "greenhouse": {
      const boardToken = extractGreenhouseBoard(job.url);
      if (!boardToken) {
        throw new Error(
          "Could not extract Greenhouse board token from job URL"
        );
      }
      return scrapeGreenhouse(boardToken, atsJobId);
    }
    case "ashby": {
      const boardId = extractAshbyBoard(job.url);
      if (!boardId) {
        throw new Error("Could not extract Ashby board ID from job URL");
      }
      return scrapeAshby(boardId, atsJobId);
    }
    case "lever":
      return getLeverFields();
    default:
      throw new Error("Manual application required");
  }
}
