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
      try {
        // Dynamic import to avoid SSR issues
        const { useAuthStore, clearAllStores, initializeStores } = await import(
          "../../store"
        );

        if (event === "SIGNED_OUT" || !session) {
          // Clear all stores on logout
          clearAllStores();
          router.refresh();
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Re-initialize stores on login/token refresh
          await initializeStores();
          router.refresh();
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}
