import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Special handling for auth callback and static files
  if (req.nextUrl.pathname === "/auth/callback" || 
      req.nextUrl.pathname.startsWith("/_next") ||
      req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    // Get the session - refreshes the session if expired
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    // Check if we're on a protected route (dashboard pages)
    const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard");
    const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");

    // If there's an error getting session, treat as unauthenticated
    if (error) {
      console.warn("Session error in middleware:", error);
    }

    // Check for custom authentication as fallback
    const cookieHeader = req.headers.get('cookie');
    const hasCustomAuth = cookieHeader && (
      cookieHeader.includes('user_context') && 
      cookieHeader.includes('user_id')
    );

    // User is authenticated if they have either Supabase session OR custom auth cookies
    const isAuthenticated = (session && !error) || hasCustomAuth;

    // Redirect unauthenticated users from protected routes to login
    if (isProtectedRoute && !isAuthenticated) {
      const redirectUrl = new URL("/auth/login", req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users from auth pages to dashboard (except callback)
    if (isAuthRoute && isAuthenticated && req.nextUrl.pathname !== "/auth/callback") {
      const redirectUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Home page redirect to login or dashboard based on auth status
    if (req.nextUrl.pathname === "/") {
      if (isAuthenticated) {
        const redirectUrl = new URL("/dashboard", req.url);
        return NextResponse.redirect(redirectUrl);
      } else {
        const redirectUrl = new URL("/auth/login", req.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    return res;

  } catch (middlewareError) {
    console.error("Middleware error:", middlewareError);
    
    // On middleware error, allow the request to proceed
    // This prevents the app from breaking if Supabase is down
    return res;
  }
}

// Apply middleware to specific paths but exclude the callback route
export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    {
      source: "/auth/:path*",
      has: [
        {
          type: "header",
          key: "host",
        },
      ],
      missing: [
        {
          type: "query",
          key: "hash",
        },
      ],
    },
  ],
};
