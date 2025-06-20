"use client";

import { useEffect, ReactNode, useRef, useState } from "react";
import { initializeStores } from "../../store";

interface StoreInitializerProps {
  children: ReactNode;
}

export default function StoreInitializer({ children }: StoreInitializerProps) {
  const initialized = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize all stores when the app starts - only once
    if (!initialized.current) {
      initialized.current = true;

      const doInitialize = async () => {
        try {
          await initializeStores();
        } catch (error) {
          console.error("Store initialization failed:", error);
        } finally {
          setIsInitializing(false);
        }
      };

      doInitialize();
    }
  }, []);

  return <>{children}</>;
}
