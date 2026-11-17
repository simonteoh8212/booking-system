import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  SESSION_REFRESH_THRESHOLD_SECONDS,
  signSessionJwt,
  verifySessionJwt,
} from "@/lib/session-token";

// Routes that require admin authentication
const PROTECTED_PREFIXES = ["/admin"];
// Routes that should redirect authenticated admins away (e.g., login page)
const AUTH_ROUTES = ["/admin/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isInternalMode =
    (process.env.NEXT_PUBLIC_APP_MODE || process.env.APP_MODE || "")
      .toLowerCase()
      .replace(/['"]/g, "")
      .trim() === "internal";

  // In internal mode, public pages (/, /check-booking, /demo) redirect directly to /admin/desk
  if (
    isInternalMode &&
    (pathname === "/" || pathname === "/check-booking" || pathname === "/demo")
  ) {
    const deskUrl = request.nextUrl.clone();
    deskUrl.pathname = "/admin/desk";
    return NextResponse.redirect(deskUrl);
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix) && !AUTH_ROUTES.includes(pathname)
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionJwt(token) : null;
  const isAuthenticated = session !== null;

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated admins away from the login page
  if (isAuthRoute && isAuthenticated) {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = isInternalMode ? "/admin/desk" : "/admin";
    return NextResponse.redirect(targetUrl);
  }

  const response = NextResponse.next();

  // Sliding 30-day renewal: extend session cookie whenever < 15 days remain
  if (isProtected && session) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const remainingSeconds = (session.exp ?? 0) - nowSeconds;
    if (remainingSeconds < SESSION_REFRESH_THRESHOLD_SECONDS) {
      const refreshedToken = await signSessionJwt({
        sub: session.sub,
        username: session.username,
      });
      response.cookies.set(SESSION_COOKIE_NAME, refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/", "/check-booking", "/admin/:path*"],
};
