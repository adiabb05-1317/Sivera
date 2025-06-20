// Import stores
import { useAuthStore } from "./authStore";
import { useCandidatesStore } from "./candidatesStore";
import { useJobsStore } from "./jobsStore";
import { useInterviewsStore } from "./interviewsStore";

// Main store exports
export { useAuthStore } from "./authStore";
export { useCandidatesStore } from "./candidatesStore";
export { useJobsStore } from "./jobsStore";
export { useInterviewsStore } from "./interviewsStore";

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
    // Initialize auth first
    await authStore.initialize();

    // Only fetch data if user is authenticated
    if (authStore.isAuthenticated) {
      const candidatesStore = useCandidatesStore.getState();
      const jobsStore = useJobsStore.getState();
      const interviewsStore = useInterviewsStore.getState();

      // Fetch data in parallel for better performance
      await Promise.all([
        candidatesStore.fetchCandidatesByJob(),
        jobsStore.fetchJobs(),
        interviewsStore.fetchInterviews(),
      ]).catch(console.error);
    }

    hasInitialized = true;
  } catch (error) {
    console.error("Error initializing stores:", error);
  } finally {
    isInitializing = false;
  }
};

// Reset initialization state (useful for testing or logout)
export const resetInitialization = () => {
  isInitializing = false;
  hasInitialized = false;
};
