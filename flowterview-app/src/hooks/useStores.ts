import { useEffect, useRef } from "react";
import {
  useAuthStore,
  useCandidatesStore,
  useJobsStore,
  useInterviewsStore,
  useAnalyticsStore,
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

// Candidates hooks
export const useCandidates = () => {
  const store = useCandidatesStore();
  const auth = useAuthStore();
  const fetchTriggered = useRef(false);

  useEffect(() => {
    // Auto-fetch candidates when user is authenticated and data is stale
    if (
      auth.isAuthenticated &&
      store.candidatesByJob.isStale &&
      !store.candidatesByJob.isLoading &&
      !fetchTriggered.current
    ) {
      fetchTriggered.current = true;
      store.fetchCandidatesByJob().finally(() => {
        fetchTriggered.current = false;
      });
    }
  }, [
    auth.isAuthenticated,
    store.candidatesByJob.isStale,
    store.candidatesByJob.isLoading,
  ]);

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

// Jobs hooks
export const useJobs = () => {
  const store = useJobsStore();
  const auth = useAuthStore();
  const fetchTriggered = useRef(false);

  useEffect(() => {
    // Auto-fetch jobs when user is authenticated and data is stale
    if (
      auth.isAuthenticated &&
      store.jobs.isStale &&
      !store.jobs.isLoading &&
      !fetchTriggered.current
    ) {
      fetchTriggered.current = true;
      store.fetchJobs().finally(() => {
        fetchTriggered.current = false;
      });
    }
  }, [auth.isAuthenticated, store.jobs.isStale, store.jobs.isLoading]);

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

// Interviews hooks
export const useInterviews = () => {
  const store = useInterviewsStore();
  const auth = useAuthStore();
  const fetchTriggered = useRef(false);

  useEffect(() => {
    // Auto-fetch interviews when user is authenticated and data is stale
    if (
      auth.isAuthenticated &&
      store.interviews.isStale &&
      !store.interviews.isLoading &&
      !fetchTriggered.current
    ) {
      fetchTriggered.current = true;
      store.fetchInterviews().finally(() => {
        fetchTriggered.current = false;
      });
    }
  }, [
    auth.isAuthenticated,
    store.interviews.isStale,
    store.interviews.isLoading,
  ]);

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

// Analytics hooks
export const useAnalytics = () => {
  const store = useAnalyticsStore();
  const auth = useAuthStore();
  const fetchTriggered = useRef(false);
  const orgScoreFetchTriggered = useRef(false);

  useEffect(() => {
    // Auto-fetch analytics overview when user is authenticated and data is stale
    if (
      auth.isAuthenticated &&
      store.overview.isStale &&
      !store.overview.isLoading &&
      !fetchTriggered.current
    ) {
      fetchTriggered.current = true;
      store.fetchOverview().finally(() => {
        fetchTriggered.current = false;
      });
    }
  }, [auth.isAuthenticated, store.overview.isStale, store.overview.isLoading]);

  useEffect(() => {
    // Auto-fetch organization average score when user is authenticated and data is stale
    if (
      auth.isAuthenticated &&
      store.organizationAverageScore.isStale &&
      !store.organizationAverageScore.isLoading &&
      !orgScoreFetchTriggered.current
    ) {
      orgScoreFetchTriggered.current = true;
      store.fetchOrganizationAverageScore().finally(() => {
        orgScoreFetchTriggered.current = false;
      });
    }
  }, [
    auth.isAuthenticated,
    store.organizationAverageScore.isStale,
    store.organizationAverageScore.isLoading,
  ]);

  return {
    // Data
    overview: store.overview.data,
    organizationAverageScore: store.organizationAverageScore.data,
    isLoading:
      store.overview.isLoading || store.organizationAverageScore.isLoading,
    error: store.overview.error || store.organizationAverageScore.error,

    // Actions
    fetchOverview: store.fetchOverview,
    fetchInterviewAnalytics: store.fetchInterviewAnalytics,
    fetchCandidateAnalytics: store.fetchCandidateAnalytics,
    fetchAverageScore: store.fetchAverageScore,
    fetchOrganizationAverageScore: store.fetchOrganizationAverageScore,
    analyzeInterview: store.analyzeInterview,

    // Cache management
    invalidateCache: store.invalidateCache,
    invalidateInterviewCache: store.invalidateInterviewCache,

    // Selectors
    getInterviewAnalytics: store.getInterviewAnalytics,
    getCandidateAnalytics: store.getCandidateAnalytics,
    getAverageScore: store.getAverageScore,
    getOrganizationAverageScore: store.getOrganizationAverageScore,
    getOverviewData: store.getOverviewData,

    // Cache management
    refresh: () => {
      store.fetchOverview(true);
      store.fetchOrganizationAverageScore(true);
    },
  };
};

// Combined hook for dashboard pages that need multiple stores
export const useDashboard = () => {
  const auth = useAuth();
  const candidates = useCandidates();
  const jobs = useJobs();
  const interviews = useInterviews();
  const analytics = useAnalytics();

  const isLoading =
    candidates.isLoading || jobs.isLoading || interviews.isLoading;
  const hasError = candidates.error || jobs.error || interviews.error;

  return {
    auth,
    candidates,
    jobs,
    interviews,
    analytics,
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

// Hook for comprehensive app loading state
export const useAppLoadingState = () => {
  const auth = useAuth();
  const candidates = useCandidatesStore();
  const jobs = useJobsStore();
  const interviews = useInterviewsStore();

  // If auth is loading, the whole app is loading
  if (auth.isLoading) {
    return { isLoading: true, stage: "auth" };
  }

  // If not authenticated, no other loading needed
  if (!auth.isAuthenticated) {
    return { isLoading: false, stage: "none" };
  }

  // Check if any store is loading initial data
  const isAnyStoreLoading =
    (candidates.candidatesByJob.isStale &&
      candidates.candidatesByJob.isLoading) ||
    (jobs.jobs.isStale && jobs.jobs.isLoading) ||
    (interviews.interviews.isStale && interviews.interviews.isLoading);

  return {
    isLoading: isAnyStoreLoading,
    stage: isAnyStoreLoading ? "data" : "complete",
  };
};
