import { Nav } from "@/components/nav";
import { DeveloperSettings } from "./developer-settings";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-sm text-gray-500 mb-6">API keys, webhooks, and data export.</p>
        <DeveloperSettings />
      </main>
    </div>
  );
}
