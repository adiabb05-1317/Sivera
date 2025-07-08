// Import stores
import { useAuthStore } from "./authStore";
import { useCandidatesStore } from "./candidatesStore";
import { useJobsStore } from "./jobsStore";
import { useInterviewsStore } from "./interviewsStore";
import { useAnalyticsStore } from "./analyticsStore";

// Main store exports
export { useAuthStore } from "./authStore";
export { useCandidatesStore } from "./candidatesStore";
export { useJobsStore } from "./jobsStore";
export { useInterviewsStore } from "./interviewsStore";
export { useAnalyticsStore } from "./analyticsStore";

// Type exports
export type * from "./types";

// Store initialization helper with proper state management
let isInitializing = false;
let hasInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Helper to wait for authentication to be ready
const waitForAuthReady = async (maxWaitMs = 10000): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const authState = useAuthStore.getState();

    // If not loading and we have an auth decision (authenticated or not)
    if (!authState.isLoading) {
      return authState.isAuthenticated;
    }

    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.warn("⚠️ Auth readiness timeout, proceeding anyway");
  return useAuthStore.getState().isAuthenticated;
};

export const initializeStores = async (force = false) => {
  // Return existing promise if already initializing
  if (isInitializing && initializationPromise && !force) {
    return initializationPromise;
  }

  // Prevent duplicate initialization calls unless forced
  if (hasInitialized && !force) {
    return;
  }

  isInitializing = true;

  initializationPromise = (async () => {
    const authStore = useAuthStore.getState();

    try {
      // Initialize auth first and wait for it to complete
      await authStore.initialize();

      // Wait for auth to be ready (either authenticated or definitively not)
      const isAuthenticated = await waitForAuthReady();

      // Only fetch data if user is authenticated
      if (isAuthenticated) {
        const candidatesStore = useCandidatesStore.getState();
        const jobsStore = useJobsStore.getState();
        const interviewsStore = useInterviewsStore.getState();
        const analyticsStore = useAnalyticsStore.getState();

        // Fetch data in parallel for better performance
        await Promise.all([
          candidatesStore.fetchCandidatesByJob(),
          jobsStore.fetchJobs(),
          interviewsStore.fetchInterviews(),
          analyticsStore.fetchOverview(),
          analyticsStore.fetchOrganizationAverageScore(),
        ]).catch(console.error);
      }

      hasInitialized = true;
    } catch (error) {
      console.error("❌ Error initializing stores:", error);
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

// Reset initialization state (useful for testing or logout)
export const resetInitialization = () => {
  isInitializing = false;
  hasInitialized = false;
  initializationPromise = null;
};
