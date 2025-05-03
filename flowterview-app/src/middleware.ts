import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Special handling for the callback route
  if (req.nextUrl.pathname === "/auth/callback") {
    // Let the callback route handle its own logic without middleware interference
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get the session - refreshes the session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Auth pattern and dashboard pattern
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth/");
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  // Home page redirect to login or dashboard based on auth status
  if (req.nextUrl.pathname === "/") {
    if (session) {
      const redirectUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(redirectUrl);
    } else {
      const redirectUrl = new URL("/auth/login", req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  //   // If accessing dashboard without a session, redirect to login
  //   if (isDashboard && !session) {
  //     const redirectUrl = new URL("/auth/login", req.url);
  //     return NextResponse.redirect(redirectUrl);
  //   }

  //   // If accessing auth pages with a session, redirect to dashboard (except for the callback route)
  //   if (isAuthPage && session) {
  //     const redirectUrl = new URL("/dashboard", req.url);
  //     return NextResponse.redirect(redirectUrl);
  //   }

  return res;
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
