"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";

// Pro-level auth listener with TanStack Query integration
export default function AuthListener({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Setup auth listener with TanStack Query integration
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔐 Auth event: ${event}`);
      
      if (event === "SIGNED_IN") {
        // User signed in - invalidate auth queries to fetch fresh data
        console.log("👤 User signed in, invalidating auth queries");
        await queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
        
        // Pre-fetch critical dashboard data in background
        queryClient.prefetchQuery({ 
          queryKey: queryKeys.candidates.byJob(),
          staleTime: 2 * 60 * 1000,
        });
        queryClient.prefetchQuery({ 
          queryKey: queryKeys.interviews.all(),
          staleTime: 2 * 60 * 1000,
        });
        
      } else if (event === "TOKEN_REFRESHED") {
        // Token refreshed - no action needed, TanStack Query handles this gracefully
        console.log("🔄 Token refreshed, TanStack Query will handle refresh as needed");
        
      } else if (event === "SIGNED_OUT") {
        // User signed out - clear all cached data
        console.log("👋 User signed out, clearing all cached data");
        queryClient.clear();
        
        // Redirect to login
        router.push("/auth/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return <>{children}</>;
}
