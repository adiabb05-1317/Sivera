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

    // Define route categories
    const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard");
    const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
    const isPublicRoute = ["/register"].includes(req.nextUrl.pathname);
    const isHomePage = req.nextUrl.pathname === "/";

    // If there's an error getting session, treat as unauthenticated
    if (error) {
      // Session error in middleware
    }

    // Check for custom authentication as fallback
    const cookieHeader = req.headers.get('cookie');
    const hasCustomAuth = cookieHeader && (
      cookieHeader.includes('user_context') && 
      cookieHeader.includes('user_id')
    );

    // User is authenticated if they have either Supabase session OR custom auth cookies
    const isAuthenticated = (session && !error) || hasCustomAuth;

    // Handle home page first
    if (isHomePage) {
      if (isAuthenticated) {
        const redirectUrl = new URL("/dashboard", req.url);
        return NextResponse.redirect(redirectUrl);
      } else {
        const redirectUrl = new URL("/auth/login", req.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Handle auth routes
    if (isAuthRoute) {
      if (isAuthenticated && req.nextUrl.pathname !== "/auth/callback") {
        const redirectUrl = new URL("/dashboard", req.url);
        return NextResponse.redirect(redirectUrl);
      }
      // Allow unauthenticated users to access auth routes
      return res;
    }

    // Handle protected routes (dashboard)
    if (isProtectedRoute) {
      if (!isAuthenticated) {
        const redirectUrl = new URL("/auth/login", req.url);
        return NextResponse.redirect(redirectUrl);
      }
      // Allow authenticated users to access dashboard routes
      return res;
    }

    // Handle public routes
    if (isPublicRoute) {
      return res;
    }

    // For any other route, allow it to proceed
    return res;

  } catch (middlewareError) {
    // On middleware error, allow the request to proceed
    // This prevents the app from breaking if Supabase is down
    return res;
  }
}

// Apply middleware to all routes except static files and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
