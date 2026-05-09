import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js proxy middleware.
 * Protects app routes using auth cookie and avoids auth-page loops.
 */

const PROTECTED_ROUTES = ["/dashboard", "/host", "/admin", "/book"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuth = request.cookies.get("flexispace_auth")?.value === "true";

  // Protect authenticated sections
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isProtected && !hasAuth) {
    // #region agent log
    fetch("http://127.0.0.1:7481/ingest/d2476cbd-8cf8-42e2-adbf-9b9708ecf997",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"cfe79d"},body:JSON.stringify({sessionId:"cfe79d",runId:"baseline",hypothesisId:"H3",location:"proxy.ts:protected_redirect",message:"proxy redirect unauthenticated protected route",data:{pathname,hasAuth},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from login flow.
  if (hasAuth && (pathname === "/login" || pathname === "/otp")) {
    // #region agent log
    fetch("http://127.0.0.1:7481/ingest/d2476cbd-8cf8-42e2-adbf-9b9708ecf997",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"cfe79d"},body:JSON.stringify({sessionId:"cfe79d",runId:"baseline",hypothesisId:"H3",location:"proxy.ts:auth_redirect",message:"proxy redirect authenticated user away from auth page",data:{pathname,hasAuth},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/host/:path*",
    "/admin/:path*",
    "/book/:path*",
    "/login",
    "/otp",
  ],
};
