"use client";

import { useEffect, ReactNode, useRef } from "react";
import { initializeStores } from "../../store";

interface StoreInitializerProps {
  children: ReactNode;
}

export default function StoreInitializer({ children }: StoreInitializerProps) {
  const initialized = useRef(false);

  useEffect(() => {
    // Initialize all stores when the app starts - only once
    if (!initialized.current) {
      initialized.current = true;
      initializeStores();
    }
  }, []);

  return <>{children}</>;
}
