import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/p/", "/api/auth/", "/api/jobs"];
const STATIC_PATHS = ["/_next/", "/favicon.ico", "/resumes/"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow static assets
  if (STATIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow authenticated users
  if (req.auth) {
    return NextResponse.next();
  }

  // Redirect to login
  const loginUrl = new URL("/login", req.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
