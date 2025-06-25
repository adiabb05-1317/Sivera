"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Enhanced auth listener that integrates with our store system
export default function AuthListener({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Setup auth listener with store integration
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Force re-initialization on sign in to fetch fresh data
        const { initializeStores } = await import("../../store");
        await initializeStores(true); // Force refresh on auth change
      }
      // Note: No need to clear stores on SIGNED_OUT - logout functions handle that
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}
