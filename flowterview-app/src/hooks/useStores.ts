import { useEffect } from "react";
import {
  useAuthStore,
  useCandidatesStore,
  useJobsStore,
  useInterviewsStore,
  useDashboardStore,
} from "../../store";

// Auth hooks
export const useAuth = () => {
  const auth = useAuthStore();

  // Remove auto-initialization to prevent redundant calls
  // Auth will be initialized by AuthListener or StoreInitializer

  return {
    user: auth.user,
    organization: auth.organization,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    login: async (email: string, password: string) => {},
    logout: auth.logout,
    refresh: auth.fetchUserProfile,
  };
};

// Candidates hooks (lazy loading - only fetch when page needs it)
export const useCandidates = (autoFetch = false) => {
  const store = useCandidatesStore();
  const auth = useAuthStore();

  useEffect(() => {
    // Only auto-fetch if explicitly requested
    if (autoFetch && auth.isAuthenticated && store.candidatesByJob.isStale) {
      store.fetchCandidatesByJob();
    }
  }, [auth.isAuthenticated, autoFetch]);

  return {
    // Data
    candidates: store.filteredCandidates,
    candidatesByJob: store.candidatesByJob.data,
    isLoading: store.candidatesByJob.isLoading,
    error: store.candidatesByJob.error,

    // Actions
    fetchCandidates: store.fetchCandidatesByJob,
    addCandidate: store.addSingleCandidate,
    addMultipleCandidates: store.addMultipleCandidates,
    updateCandidateStatus: store.updateCandidateStatus,
    sendInvitation: store.sendInvitation,

    // Filtering
    setFilters: store.setFilters,
    clearFilters: store.clearFilters,
    filters: store.filters,

    // Selectors
    getCandidatesByJobId: store.getCandidatesByJobId,
    getCandidateById: store.getCandidateById,
    getCandidatesCount: store.getCandidatesCount,

    // Cache management
    refresh: () => store.fetchCandidatesByJob(true),
    invalidateCache: store.invalidateCache,
  };
};

// Jobs hooks (lazy loading - only fetch when page needs it)
export const useJobs = (autoFetch = false) => {
  const store = useJobsStore();
  const auth = useAuthStore();

  useEffect(() => {
    // Only auto-fetch if explicitly requested
    if (autoFetch && auth.isAuthenticated && store.jobs.isStale) {
      store.fetchJobs();
    }
  }, [auth.isAuthenticated, autoFetch]);

  return {
    // Data
    jobs: store.jobs.data,
    isLoading: store.jobs.isLoading,
    error: store.jobs.error,

    // Actions
    fetchJobs: store.fetchJobs,
    createJob: store.createJob,
    updateJob: store.updateJob,
    deleteJob: store.deleteJob,

    // Selectors
    getJobById: store.getJobById,
    getJobsCount: store.getJobsCount,
    getJobsByOrganization: store.getJobsByOrganization,

    // Cache management
    refresh: () => store.fetchJobs(true),
    invalidateCache: store.invalidateCache,
  };
};

// Interviews hooks (lazy loading - only fetch when page needs it)
export const useInterviews = (autoFetch = false) => {
  const store = useInterviewsStore();
  const auth = useAuthStore();

  useEffect(() => {
    // Only auto-fetch if explicitly requested
    if (autoFetch && auth.isAuthenticated && store.interviews.isStale) {
      store.fetchInterviews();
    }
  }, [auth.isAuthenticated, autoFetch]);

  return {
    // Data
    interviews: store.filteredInterviews,
    allInterviews: store.interviews.data,
    isLoading: store.interviews.isLoading,
    error: store.interviews.error,

    // Actions
    fetchInterviews: store.fetchInterviews,
    fetchInterviewDetails: store.fetchInterviewDetails,
    createInterview: store.createInterview,
    updateInterview: store.updateInterview,
    updateInterviewStatus: store.updateInterviewStatusAction,
    addCandidateToInterview: store.addCandidateToInterview,
    addCandidatesToInterview: store.addCandidatesToInterview,
    sendBulkInvitations: store.sendBulkInvitations,

    // Filtering
    setFilters: store.setFilters,
    clearFilters: store.clearFilters,
    filters: store.filters,

    // Selectors
    getInterviewById: store.getInterviewById,
    getInterviewDetails: store.getInterviewDetails,
    getInterviewsByJobId: store.getInterviewsByJobId,
    getInterviewsCount: store.getInterviewsCount,
    getActiveInterviews: store.getActiveInterviews,

    // Cache management
    refresh: () => store.fetchInterviews(true),
    invalidateCache: store.invalidateCache,
    invalidateInterviewDetails: store.invalidateInterviewDetails,
  };
};

// Combined hook for pages that need multiple stores (enables auto-fetch)
export const useDashboard = () => {
  const auth = useAuth();
  const candidates = useCandidates(true); // Enable auto-fetch
  const jobs = useJobs(true); // Enable auto-fetch
  const interviews = useInterviews(true); // Enable auto-fetch

  const isLoading =
    candidates.isLoading || jobs.isLoading || interviews.isLoading;
  const hasError = candidates.error || jobs.error || interviews.error;

  return {
    auth,
    candidates,
    jobs,
    interviews,
    isLoading,
    hasError,
    refreshAll: () => {
      candidates.refresh();
      jobs.refresh();
      interviews.refresh();
    },
  };
};

// Hook for specific interview details page
export const useInterviewDetails = (interviewId: string) => {
  const store = useInterviewsStore();

  useEffect(() => {
    if (interviewId) {
      store.fetchInterviewDetails(interviewId);
    }
  }, [interviewId]);

  const details = store.interviewDetails[interviewId];

  return {
    interview: store.getInterviewById(interviewId),
    details: details?.data,
    isLoading: details?.isLoading || false,
    error: details?.error || null,
    refresh: () => store.fetchInterviewDetails(interviewId, true),
  };
};

// Hook for fast dashboard data
export const useFastDashboard = () => {
  const store = useDashboardStore();
  const auth = useAuth();

  useEffect(() => {
    // Auto-fetch dashboard data when user is authenticated
    if (auth.isAuthenticated && store.dashboard.isStale) {
      store.fetchDashboardData();
    }
  }, [auth.isAuthenticated]);

  return {
    // Data
    stats: store.dashboard.data.stats,
    recentInterviews: store.dashboard.data.recentInterviews,
    isLoading: store.dashboard.isLoading,
    error: store.dashboard.error,

    // Actions
    refresh: () => store.fetchDashboardData(true),
    invalidateCache: store.invalidateCache,
  };
};

// Hook for comprehensive app loading state (now only checks auth)
export const useAppLoadingState = () => {
  const auth = useAuth();

  // Only check auth loading for app initialization
  return {
    isLoading: auth.isLoading,
    stage: auth.isLoading ? "auth" : "complete",
  };
};
