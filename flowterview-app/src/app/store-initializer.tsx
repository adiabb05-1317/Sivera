"use client";

import { useEffect, ReactNode } from "react";
import { initializeStores } from "../../store";

interface StoreInitializerProps {
  children: ReactNode;
}

export default function StoreInitializer({ children }: StoreInitializerProps) {
  useEffect(() => {
    // Initialize all stores when the app starts
    initializeStores();
  }, []);

  return <>{children}</>;
}
