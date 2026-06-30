import { Nav } from "@/components/nav";
import { CaseStudyEditor } from "../case-study-editor";

export default function NewCaseStudyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          New Case Study
        </h1>
        <CaseStudyEditor />
      </main>
    </div>
  );
}
