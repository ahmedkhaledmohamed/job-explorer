import { Nav } from "@/components/nav";
import { PreferencesForm } from "./preferences-form";

export default function PreferencesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Work Preferences
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          These power mutual matching — we match you to jobs AND jobs to you.
        </p>
        <PreferencesForm />
      </main>
    </div>
  );
}
