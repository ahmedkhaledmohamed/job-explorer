import { Nav } from "@/components/nav";
import { ProfileForm } from "./profile-form";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Apply Profile
        </h1>
        <ProfileForm />
      </main>
    </div>
  );
}
