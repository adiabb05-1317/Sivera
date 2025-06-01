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
      console.log("Auth state changed:", event);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Initialize stores on sign in
        const { initializeStores } = await import("../../store");
        await initializeStores();
      }
      // Note: No need to clear stores on SIGNED_OUT - logout functions handle that
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}
