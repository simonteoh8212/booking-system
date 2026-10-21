import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me-in-production"
);

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

  // In internal mode, public pages (root / and /check-booking) redirect directly to /admin/desk
  if (isInternalMode && (pathname === "/" || pathname === "/check-booking")) {
    const deskUrl = request.nextUrl.clone();
    deskUrl.pathname = "/admin/desk";
    return NextResponse.redirect(deskUrl);
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix) && !AUTH_ROUTES.includes(pathname)
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  const token = request.cookies.get("admin_session")?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      // Token invalid or expired
    }
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/check-booking", "/admin/:path*"],
};
