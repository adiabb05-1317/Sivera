// Import stores
import { useAuthStore } from "./authStore";
import { useCandidatesStore } from "./candidatesStore";
import { useJobsStore } from "./jobsStore";
import { useInterviewsStore } from "./interviewsStore";
import { useDashboardStore } from "./dashboardStore";

// Main store exports
export { useAuthStore } from "./authStore";
export { useCandidatesStore } from "./candidatesStore";
export { useJobsStore } from "./jobsStore";
export { useInterviewsStore } from "./interviewsStore";
export { useDashboardStore } from "./dashboardStore";

// Type exports
export type * from "./types";

// Store initialization helper with proper state management
let isInitializing = false;
let hasInitialized = false;

export const initializeStores = async (force = false) => {
  // Prevent duplicate initialization calls
  if (isInitializing || (hasInitialized && !force)) {
    return;
  }

  isInitializing = true;
  const authStore = useAuthStore.getState();

  try {
    // Only initialize auth - let pages load their own data as needed
    await authStore.initialize();
    hasInitialized = true;
  } catch (error) {
    console.error("Error initializing auth:", error);
  } finally {
    isInitializing = false;
  }
};

// Reset initialization state (useful for testing or logout)
export const resetInitialization = () => {
  isInitializing = false;
  hasInitialized = false;
};
