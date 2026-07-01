"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null;

const PRIMARY_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/agent", label: "Agent" },
  { href: "/insights", label: "Insights" },
];

const MORE_LINKS = [
  { href: "/case-studies", label: "Case Studies" },
  { href: "/resumes", label: "Resumes" },
  { href: "/introductions", label: "Introductions" },
  { href: "/preferences", label: "Preferences" },
  { href: "/public-profile", label: "Public Profile" },
  { href: "/onboarding", label: "Onboarding" },
];

const USER_LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
  { href: "/pricing", label: "Pricing" },
];

const LINK_CLASS =
  "text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function onEvent(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    }
    document.addEventListener("mousedown", onEvent);
    document.addEventListener("touchstart", onEvent);
    return () => {
      document.removeEventListener("mousedown", onEvent);
      document.removeEventListener("touchstart", onEvent);
    };
  }, [ref, handler]);
}

export function NavBar({
  user,
  signOutAction,
}: {
  user: User;
  signOutAction: () => Promise<void>;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useClickOutside(moreRef, () => setMoreOpen(false));
  useClickOutside(userRef, () => setUserOpen(false));

  return (
    <nav className="border-b bg-white relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Logo + Primary links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-gray-900"
            >
              Job Explorer
            </Link>

            {/* Primary links — hidden on mobile */}
            <div className="hidden md:flex items-center gap-4">
              {PRIMARY_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={LINK_CLASS}>
                  {link.label}
                </Link>
              ))}

              {/* More dropdown */}
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => {
                    setMoreOpen(!moreOpen);
                    setUserOpen(false);
                  }}
                  className={`${LINK_CLASS} flex items-center gap-1`}
                >
                  More
                  <svg
                    className={`w-3 h-3 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {moreOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-lg border bg-white shadow-lg py-2 z-50">
                    {MORE_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: User menu */}
          <div className="flex items-center gap-3">
            {user && (
              <div ref={userRef} className="relative hidden md:block">
                <button
                  onClick={() => {
                    setUserOpen(!userOpen);
                    setMoreOpen(false);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[120px] truncate">
                    {user.name || user.email}
                  </span>
                  <svg
                    className={`w-3 h-3 transition-transform ${userOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-white shadow-lg py-2 z-50">
                    {USER_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setUserOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <div className="border-t my-1" />
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-1">
          {[...PRIMARY_LINKS, ...MORE_LINKS, ...USER_LINKS].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <>
              <div className="border-t my-2" />
              <form action={signOutAction}>
                <button type="submit" className="block py-2 text-sm text-red-600 hover:text-red-800 w-full text-left">
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
