import { Suspense } from "react";
import { Nav } from "@/components/nav";
import { JobsTable } from "./jobs-table";

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Jobs</h1>
        <Suspense
          fallback={
            <div className="text-sm text-gray-400 py-8 text-center">
              Loading...
            </div>
          }
        >
          <JobsTable />
        </Suspense>
      </main>
    </div>
  );
}
