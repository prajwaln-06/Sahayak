import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware
 * Protects /dashboard and /host routes — redirects to /login if no auth cookie.
 * Redirects authenticated users away from /login.
 */

const PROTECTED_ROUTES = ["/dashboard", "/host"];
const AUTH_ROUTES = ["/login", "/otp", "/setup-profile"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuth = request.cookies.get("flexispace_auth")?.value === "true";

  // Protect dashboard/host routes
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isProtected && !hasAuth) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages (except setup-profile)
  if (hasAuth && (pathname === "/login" || pathname === "/otp")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/host/:path*", "/login", "/otp"],
};
