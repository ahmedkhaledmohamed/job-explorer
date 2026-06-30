export const dynamic = "force-dynamic";

import { getDb, type CaseStudy } from "@/lib/db";
import { Nav } from "@/components/nav";
import { notFound } from "next/navigation";
import { CaseStudyEditor } from "../case-study-editor";

export default async function CaseStudyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sql = getDb();

  const result = await sql`SELECT * FROM case_studies WHERE id = ${parseInt(id, 10)}`;

  if (result.length === 0) {
    notFound();
  }

  const study = result[0] as unknown as CaseStudy;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Edit Case Study
        </h1>
        <CaseStudyEditor initial={study} />
      </main>
    </div>
  );
}
