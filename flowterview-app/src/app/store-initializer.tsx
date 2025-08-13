"use client";

import { useEffect, ReactNode, useRef, useState } from "react";
import { initializeStores } from "../../store";
import { useAuthStore } from "../../store";
import { Loader2 } from "lucide-react";

interface StoreInitializerProps {
  children: ReactNode;
}

export default function StoreInitializer({ children }: StoreInitializerProps) {
  const initialized = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const authStore = useAuthStore();

  useEffect(() => {
    // Wait for auth to be ready, then initialize stores
    if (!initialized.current && !authStore.isLoading) {
      initialized.current = true;

      const doInitialize = async () => {
        console.log("🚀 StoreInitializer: Starting initialization...");
        try {
          await initializeStores();
          console.log("✅ StoreInitializer: Initialization completed");
        } catch (error) {
          console.error("❌ StoreInitializer: Initialization failed:", error);
        } finally {
          setIsInitializing(false);
        }
      };

      doInitialize();
    } else if (!authStore.isLoading && initialized.current) {
      // Auth is ready and we've already initialized, skip loading
      setIsInitializing(false);
    }
  }, [authStore.isLoading]);

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="text-center flex flex-col items-center opacity-50 text-app-blue-400 gap-2"
          style={{
            fontFamily: "KyivType Sans",
          }}
        >
          <Loader2 className="animate-spin h-8 w-8" />
          <p className="text-gray-600 text-xs">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
