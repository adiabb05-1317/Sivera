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

      if (event === "SIGNED_OUT" || !session) {
        // Simple cleanup on logout
        const { clearAllStores } = await import("../../store");
        clearAllStores();
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Simple initialization on sign in
        const { initializeStores } = await import("../../store");
        await initializeStores();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}
