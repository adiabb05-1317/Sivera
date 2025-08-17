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

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Middleware: ${req.nextUrl.pathname}`);
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

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Auth status: ${isAuthenticated}, Route: ${req.nextUrl.pathname}`);
    }

    // Handle home page first
    if (isHomePage) {
      if (isAuthenticated) {
        const redirectUrl = new URL("/dashboard", req.url);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🏠 Redirecting authenticated user from / to /dashboard`);
        }
        return NextResponse.redirect(redirectUrl);
      } else {
        const redirectUrl = new URL("/auth/login", req.url);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🏠 Redirecting unauthenticated user from / to /auth/login`);
        }
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Handle auth routes
    if (isAuthRoute) {
      if (isAuthenticated && req.nextUrl.pathname !== "/auth/callback") {
        const redirectUrl = new URL("/dashboard", req.url);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔐 Redirecting authenticated user from ${req.nextUrl.pathname} to /dashboard`);
        }
        return NextResponse.redirect(redirectUrl);
      }
      // Allow unauthenticated users to access auth routes
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 Allowing access to auth route: ${req.nextUrl.pathname}`);
      }
      return res;
    }

    // Handle protected routes (dashboard)
    if (isProtectedRoute) {
      if (!isAuthenticated) {
        const redirectUrl = new URL("/auth/login", req.url);
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔒 Redirecting unauthenticated user from ${req.nextUrl.pathname} to /auth/login`);
        }
        return NextResponse.redirect(redirectUrl);
      }
      // Allow authenticated users to access dashboard routes
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔓 Allowing authenticated access to: ${req.nextUrl.pathname}`);
      }
      return res;
    }

    // Handle public routes
    if (isPublicRoute) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 Allowing access to public route: ${req.nextUrl.pathname}`);
      }
      return res;
    }

    // For any other route, allow it to proceed
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Allowing access to other route: ${req.nextUrl.pathname}`);
    }
    return res;

  } catch (middlewareError) {
    console.error("Middleware error:", middlewareError);
    
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
