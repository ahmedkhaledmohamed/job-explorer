import { Nav } from "@/components/nav";
import { PublicProfileEditor } from "./editor";

export default function PublicProfileSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Public Profile Settings
        </h1>
        <PublicProfileEditor />
      </main>
    </div>
  );
}
