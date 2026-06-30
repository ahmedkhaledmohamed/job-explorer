export const dynamic = "force-dynamic";

import { getDb, type Job } from "@/lib/db";
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <JobDetail job={job} />
      </main>
    </div>
  );
}
