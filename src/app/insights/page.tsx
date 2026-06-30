import { Nav } from "@/components/nav";
import { InsightsDashboard } from "./insights-dashboard";

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Insights</h1>
        <p className="text-sm text-gray-500 mb-6">
          Profile strength, skill gaps, and application patterns.
        </p>
        <InsightsDashboard />
      </main>
    </div>
  );
}
