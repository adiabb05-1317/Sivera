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

// Store initialization helper
export const initializeStores = async () => {
  const authStore = useAuthStore.getState();
  const candidatesStore = useCandidatesStore.getState();
  const jobsStore = useJobsStore.getState();
  const interviewsStore = useInterviewsStore.getState();

  try {
    // Initialize auth first
    await authStore.initialize();

    // If user is authenticated, fetch initial data
    if (authStore.isAuthenticated) {
      // Fetch data in parallel
      await Promise.allSettled([
        candidatesStore.fetchCandidatesByJob(),
        jobsStore.fetchJobs(),
        interviewsStore.fetchInterviews(),
      ]);
    }
  } catch (error) {
    console.error("Error initializing stores:", error);
  }
};

// Clear all stores (useful for logout)
export const clearAllStores = () => {
  const authStore = useAuthStore.getState();
  const candidatesStore = useCandidatesStore.getState();
  const jobsStore = useJobsStore.getState();
  const interviewsStore = useInterviewsStore.getState();

  authStore.logout();
  candidatesStore.invalidateCache();
  jobsStore.invalidateCache();
  interviewsStore.invalidateCache();
};
