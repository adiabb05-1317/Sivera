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

  try {
    // Initialize auth first
    await authStore.initialize();

    // Only fetch data if user is authenticated - don't force it
    if (authStore.isAuthenticated) {
      const candidatesStore = useCandidatesStore.getState();
      const jobsStore = useJobsStore.getState();
      const interviewsStore = useInterviewsStore.getState();

      // Fetch data in parallel, wait for all to complete
      await Promise.all([
        candidatesStore.fetchCandidatesByJob(),
        jobsStore.fetchJobs(),
        interviewsStore.fetchInterviews(),
      ]).catch(console.error);
    }
  } catch (error) {
    console.error("Error initializing stores:", error);
  }
};
