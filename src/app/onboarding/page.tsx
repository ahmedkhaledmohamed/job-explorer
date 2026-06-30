import { Nav } from "@/components/nav";
import { OnboardingWizard } from "./wizard";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <OnboardingWizard />
      </main>
    </div>
  );
}
