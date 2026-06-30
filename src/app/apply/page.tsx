export const dynamic = "force-dynamic";

import { getDb, type FormField } from "@/lib/db";
import { Nav } from "@/components/nav";
import { ApplyReview } from "./apply-review";

type FormWithJob = {
  jobId: string;
  title: string;
  company: string;
  fields: FormField[];
  ready: boolean;
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ jobIds?: string }>;
}) {
  const { jobIds: jobIdsParam } = await searchParams;

  if (!jobIdsParam) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-gray-500">
            No jobs selected. Go to{" "}
            <a href="/jobs" className="text-blue-600 hover:underline">
              Jobs
            </a>{" "}
            and select jobs to prepare applications.
          </p>
        </main>
      </div>
    );
  }

  const jobIds = jobIdsParam.split(",").filter(Boolean);
  const sql = getDb();

  const forms: FormWithJob[] = [];

  for (const jobId of jobIds) {
    const formResult = await sql`
      SELECT af.job_id, af.fields, af.ready, j.title, j.company
      FROM application_forms af
      JOIN jobs j ON j.id = af.job_id
      WHERE af.job_id = ${jobId}
    `;

    if (formResult.length > 0) {
      const row = formResult[0];
      const fields: FormField[] =
        typeof row.fields === "string"
          ? JSON.parse(row.fields as string)
          : (row.fields as unknown as FormField[]);

      forms.push({
        jobId: row.job_id as string,
        title: row.title as string,
        company: row.company as string,
        fields,
        ready: row.ready as boolean,
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Review Applications
        </h1>
        <ApplyReview initialForms={forms} />
      </main>
    </div>
  );
}
