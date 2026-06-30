import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-gray-900"
            >
              Job Explorer
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/jobs"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Jobs
              </Link>
              <Link
                href="/insights"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Insights
              </Link>
              <Link
                href="/introductions"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Intros
              </Link>
              <Link
                href="/companies"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Companies
              </Link>
              <Link
                href="/pipeline"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Pipeline
              </Link>
              <Link
                href="/case-studies"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Case Studies
              </Link>
              <Link
                href="/resumes"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Resumes
              </Link>
              <Link
                href="/public-profile"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Public Profile
              </Link>
              <Link
                href="/preferences"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Preferences
              </Link>
              <Link
                href="/onboarding"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Onboarding
              </Link>
              <Link
                href="/profile"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Profile
              </Link>
            </div>
          </div>
          {session?.user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {session.user.name || session.user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
