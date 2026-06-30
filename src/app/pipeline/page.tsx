import { Nav } from "@/components/nav";
import { PipelineBoard } from "./pipeline-board";

export default function PipelinePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Application Pipeline
        </h1>
        <PipelineBoard />
      </main>
    </div>
  );
}
