import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and API routes ignore
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check session cookie from Supabase / local auth
  const hasSessionCookie =
    request.cookies.has("sb-access-token") ||
    request.cookies.has("sb-refresh-token") ||
    request.cookies.has("elmo_auth");

  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isDashboardRoute =
    pathname === "/" ||
    pathname.startsWith("/overview") ||
    pathname.startsWith("/elmo") ||
    pathname.startsWith("/employees") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/goals") ||
    pathname.startsWith("/memory") ||
    pathname.startsWith("/automations") ||
    pathname.startsWith("/integrations") ||
    pathname.startsWith("/approvals") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/settings");

  // In production with strict cookies:
  // If no session and accessing protected route, redirect to login
  // For local development without forced cookies, allow seamless navigation
  if (process.env.NODE_ENV === "production" && !hasSessionCookie && isDashboardRoute && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in and visiting login/signup, redirect to overview
  if (hasSessionCookie && isAuthRoute) {
    const overviewUrl = new URL("/overview", request.url);
    return NextResponse.redirect(overviewUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
