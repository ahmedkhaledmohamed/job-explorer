export const dynamic = "force-dynamic";

import { getDb, type Job, type FormField, type JobMaterials, type JobRequirement, type FitNarrative } from "@/lib/db";
import { Nav } from "@/components/nav";
import { notFound } from "next/navigation";
import { JobDetail } from "./job-detail";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sql = getDb();

  const result = await sql`SELECT * FROM jobs WHERE id = ${id}`;

  if (result.length === 0) {
    notFound();
  }

  const job = result[0] as unknown as Job;

  // Fetch form info if it exists
  const formResult =
    await sql`SELECT ready, fields FROM application_forms WHERE job_id = ${id}`;
  let formInfo = undefined;
  if (formResult.length > 0) {
    const form = formResult[0];
    const fields: FormField[] =
      typeof form.fields === "string"
        ? JSON.parse(form.fields as string)
        : (form.fields as unknown as FormField[]);
    const missingCount = fields.filter((f) => f.required && !f.matched).length;
    formInfo = { ready: form.ready as boolean, missingCount };
  }

  // Fetch generated materials
  const materialsResult =
    await sql`SELECT * FROM job_materials WHERE job_id = ${id} ORDER BY resume_variant`;
  const materials = materialsResult as unknown as JobMaterials[];

  // Fetch requirements
  const requirementsResult = await sql`
    SELECT * FROM job_requirements WHERE job_id = ${id} ORDER BY
      CASE category WHEN 'must_have' THEN 1 WHEN 'nice_to_have' THEN 2 ELSE 3 END, id
  `;
  const requirements = requirementsResult as unknown as JobRequirement[];

  // Fetch fit narrative
  const fitResult = await sql`SELECT * FROM fit_narratives WHERE job_id = ${id} ORDER BY created_at DESC LIMIT 1`;
  const fitNarrative = fitResult.length > 0 ? (fitResult[0] as unknown as FitNarrative) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <JobDetail job={job} formInfo={formInfo} materials={materials} requirements={requirements} fitNarrative={fitNarrative} />
      </main>
    </div>
  );
}
