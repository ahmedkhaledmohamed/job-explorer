import { Nav } from "@/components/nav";
import { AgentDashboard } from "./agent-dashboard";

export default function AgentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Agent</h1>
        <p className="text-sm text-gray-500 mb-6">Delegate job applications. The agent scores, prepares forms, identifies gaps, and submits.</p>
        <AgentDashboard />
      </main>
    </div>
  );
}
