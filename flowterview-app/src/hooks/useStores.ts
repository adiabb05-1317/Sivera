import { useEffect, useRef } from "react";
import {
  useAuthStore,
  useCandidatesStore,
  useJobsStore,
  useInterviewsStore,
  useAnalyticsStore,
} from "../../store";

// Import React Query hooks
import { useCandidates as useCandidatesQuery } from "./queries/useCandidates";
import { useInterviews as useInterviewsQuery } from "./queries/useInterviews";
import { useJobs as useJobsQuery } from "./queries/useJobs";
import { useUserProfile, useOrganization } from "./queries/useAuth";
import { useAnalytics as useAnalyticsRealQuery } from "./queries/useAnalytics";
import { useInterviewDetails as useInterviewDetailsQuery } from "./queries/useInterviews";

// Auth hook - combines React Query with Zustand core auth state
export const useAuth = () => {
  const authStore = useAuthStore();

  useEffect(() => {
    // Only initialize if not already authenticated or loading
    if (!authStore.isAuthenticated && !authStore.isLoading) {
      authStore.initialize();
    }
  }, [authStore.isAuthenticated, authStore.isLoading]);

  // Use React Query for user profile and organization data
  const userProfileQuery = useUserProfile(authStore.session?.user?.email);
  const organizationQuery = useOrganization(
    userProfileQuery.data?.organization_id
  );

  // Update Zustand store when React Query data changes
  useEffect(() => {
    if (userProfileQuery.data && userProfileQuery.data !== authStore.user) {
      authStore.setUser(userProfileQuery.data);
    }
  }, [userProfileQuery.data, authStore.user, authStore.setUser]);

  useEffect(() => {
    if (
      organizationQuery.data &&
      organizationQuery.data !== authStore.organization
    ) {
      authStore.setOrganization(organizationQuery.data);
    }
  }, [
    organizationQuery.data,
    authStore.organization,
    authStore.setOrganization,
  ]);

  return {
    // Core auth state from Zustand
    session: authStore.session,
    isAuthenticated: authStore.isAuthenticated,

    // Data from React Query
    user: userProfileQuery.data || authStore.user,
    organization: organizationQuery.data || authStore.organization,
    isLoading:
      authStore.isLoading ||
      userProfileQuery.isLoading ||
      organizationQuery.isLoading,

    // UI state
    showCompanySetupModal: authStore.showCompanySetupModal,
    showUserSetupModal: authStore.showUserSetupModal,

    // Actions
    setUser: authStore.setUser,
    setOrganization: authStore.setOrganization,
    setSession: authStore.setSession,
    setShowCompanySetupModal: authStore.setShowCompanySetupModal,
    setShowUserSetupModal: authStore.setShowUserSetupModal,
    logout: authStore.logout,
    initialize: authStore.initialize,

    // Query controls
    refetchUser: userProfileQuery.refetch,
    refetchOrganization: organizationQuery.refetch,
  };
};

// Candidates hooks - combines React Query with Zustand UI state
export const useCandidates = () => {
  const uiStore = useCandidatesStore();
  const auth = useAuthStore();

  // Build filters from UI state
  const filters = {
    search: uiStore.localSearchTerm,
    status:
      uiStore.localStatusFilter.length > 0
        ? uiStore.localStatusFilter
        : undefined,
  };

  // Use React Query for data fetching
  const candidatesQuery = useCandidatesQuery(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  return {
    // Data from React Query
    candidates: candidatesQuery.filteredCandidates || [],
    candidatesByJob: candidatesQuery.candidatesGrouped,
    allCandidates: candidatesQuery.allCandidates,
    isLoading: candidatesQuery.isLoading || candidatesQuery.isLoadingFiltered,
    error: candidatesQuery.error,

    // Actions from React Query
    addCandidate: candidatesQuery.addCandidate,
    addMultipleCandidates: candidatesQuery.addBulkCandidates,
    updateCandidateStatus: candidatesQuery.updateCandidateStatus,

    // UI state from Zustand
    selectedCandidateId: uiStore.selectedCandidateId,
    showAddCandidateModal: uiStore.showAddCandidateModal,
    showBulkImportModal: uiStore.showBulkImportModal,
    localSearchTerm: uiStore.localSearchTerm,
    localStatusFilter: uiStore.localStatusFilter,

    // UI actions from Zustand
    setSelectedCandidate: uiStore.setSelectedCandidate,
    setShowAddCandidateModal: uiStore.setShowAddCandidateModal,
    setShowBulkImportModal: uiStore.setShowBulkImportModal,
    setLocalSearchTerm: uiStore.setLocalSearchTerm,
    setLocalStatusFilter: uiStore.setLocalStatusFilter,
    clearFilters: uiStore.clearFilters,

    // Helper functions from React Query
    getCandidatesByJobId: candidatesQuery.getCandidatesByJobId,
    getCandidateById: candidatesQuery.getCandidateById,
    getCandidatesCount: () => candidatesQuery.allCandidates?.length || 0,

    // Query controls
    refresh: candidatesQuery.refetch,
    isAddingCandidate: candidatesQuery.isAddingCandidate,
    isAddingBulkCandidates: candidatesQuery.isAddingBulkCandidates,
    isUpdatingStatus: candidatesQuery.isUpdatingStatus,
  };
};

// Jobs hooks - combines React Query with Zustand UI state
export const useJobs = () => {
  const uiStore = useJobsStore();
  const auth = useAuthStore();

  // Use React Query for data fetching
  const jobsQuery = useJobsQuery();

  return {
    // Data from React Query
    jobs: jobsQuery.jobs,
    isLoading: jobsQuery.isLoading,
    error: jobsQuery.error,

    // Actions from React Query
    createJob: jobsQuery.createJob,
    updateJob: jobsQuery.updateJob,

    // UI state from Zustand
    selectedJobId: uiStore.selectedJobId,
    localSearchTerm: uiStore.localSearchTerm,
    localStatusFilter: uiStore.localStatusFilter,

    // UI actions from Zustand
    setSelectedJob: uiStore.setSelectedJob,
    setLocalSearchTerm: uiStore.setLocalSearchTerm,
    setLocalStatusFilter: uiStore.setLocalStatusFilter,
    clearFilters: uiStore.clearFilters,

    // Helper functions from React Query
    getJobById: jobsQuery.getJobById,
    getJobsCount: () => jobsQuery.jobs?.length || 0,

    // Query controls
    refresh: jobsQuery.refetch,
    isCreatingJob: jobsQuery.isCreatingJob,
    isUpdatingJob: jobsQuery.isUpdatingJob,
  };
};

// Interviews hooks - combines React Query with Zustand UI state
export const useInterviews = () => {
  const uiStore = useInterviewsStore();
  const auth = useAuthStore();

  // Build filters from UI state
  const filters = {
    search: uiStore.localSearchTerm,
    status:
      uiStore.localStatusFilter.length > 0
        ? uiStore.localStatusFilter
        : undefined,
    jobId: uiStore.localJobFilter,
  };

  // Use React Query for data fetching
  const interviewsQuery = useInterviewsQuery(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  return {
    // Data from React Query
    interviews:
      interviewsQuery.filteredInterviews || interviewsQuery.interviews,
    allInterviews: interviewsQuery.interviews,
    isLoading: interviewsQuery.isLoading || interviewsQuery.isLoadingFiltered,
    error: interviewsQuery.error,

    // Actions from React Query
    createInterview: interviewsQuery.createInterview,
    updateInterviewStatus: interviewsQuery.updateInterviewStatus,
    addCandidatesToInterview: interviewsQuery.addCandidatesToInterview,

    // UI state from Zustand
    selectedInterviewId: uiStore.selectedInterviewId,
    showCreateInterviewModal: uiStore.showCreateInterviewModal,
    showDetailsModal: uiStore.showDetailsModal,
    localSearchTerm: uiStore.localSearchTerm,
    localStatusFilter: uiStore.localStatusFilter,
    localJobFilter: uiStore.localJobFilter,
    expandedInterviewId: uiStore.expandedInterviewId,

    // UI actions from Zustand
    setSelectedInterview: uiStore.setSelectedInterview,
    setShowCreateInterviewModal: uiStore.setShowCreateInterviewModal,
    setShowDetailsModal: uiStore.setShowDetailsModal,
    setLocalSearchTerm: uiStore.setLocalSearchTerm,
    setLocalStatusFilter: uiStore.setLocalStatusFilter,
    setLocalJobFilter: uiStore.setLocalJobFilter,
    setExpandedInterview: uiStore.setExpandedInterview,
    clearFilters: uiStore.clearFilters,

    // Helper functions from React Query
    getInterviewById: interviewsQuery.getInterviewById,
    getActiveInterviews: interviewsQuery.getActiveInterviews,
    getInterviewsByJobId: interviewsQuery.getInterviewsByJobId,
    getInterviewsCount: () => interviewsQuery.interviews?.length || 0,

    // Query controls
    refresh: interviewsQuery.refetch,
    isCreatingInterview: interviewsQuery.isCreatingInterview,
    isUpdatingStatus: interviewsQuery.isUpdatingStatus,
    isAddingCandidates: interviewsQuery.isAddingCandidates,
  };
};

// Analytics hooks - combines React Query with Zustand UI state
export const useAnalytics = () => {
  const uiStore = useAnalyticsStore();
  const auth = useAuthStore();

  const analyticsQuery = useAnalyticsRealQuery();

  return {
    // Data from React Query
    overview: analyticsQuery.overview,
    organizationAverageScore: analyticsQuery.organizationAverageScore,
    isLoading: analyticsQuery.isLoading,
    error: analyticsQuery.error,

    // UI state from Zustand
    selectedTimeRange: uiStore.selectedTimeRange,
    selectedMetric: uiStore.selectedMetric,
    showDetailedView: uiStore.showDetailedView,
    expandedSectionId: uiStore.expandedSectionId,
    chartType: uiStore.chartType,
    showComparisons: uiStore.showComparisons,
    selectedCandidateIds: uiStore.selectedCandidateIds,
    selectedInterviewIds: uiStore.selectedInterviewIds,
    showExportModal: uiStore.showExportModal,
    showConfigModal: uiStore.showConfigModal,

    // UI actions from Zustand
    setSelectedTimeRange: uiStore.setSelectedTimeRange,
    setSelectedMetric: uiStore.setSelectedMetric,
    setShowDetailedView: uiStore.setShowDetailedView,
    setExpandedSection: uiStore.setExpandedSection,
    setChartType: uiStore.setChartType,
    setShowComparisons: uiStore.setShowComparisons,
    setSelectedCandidates: uiStore.setSelectedCandidates,
    setSelectedInterviews: uiStore.setSelectedInterviews,
    setShowExportModal: uiStore.setShowExportModal,
    setShowConfigModal: uiStore.setShowConfigModal,
    clearSelections: uiStore.clearSelections,

    // Actions from React Query
    refresh: analyticsQuery.refetchAll,
    refetchOverview: analyticsQuery.refetchOverview,
    refetchAverageScore: analyticsQuery.refetchAverageScore,
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
    auth.isLoading ||
    candidates.isLoading ||
    jobs.isLoading ||
    interviews.isLoading ||
    analytics.isLoading;
  const hasError =
    candidates.error || jobs.error || interviews.error || analytics.error;

  return {
    auth,
    candidates,
    jobs,
    interviews,
    analytics,
    isLoading,
    hasError,
    refreshAll: () => {
      auth.refetchUser();
      auth.refetchOrganization();
      candidates.refresh();
      jobs.refresh();
      interviews.refresh();
      analytics.refresh();
    },
  };
};

// Hook for specific interview details page
export const useInterviewDetails = (interviewId: string) => {
  // Use the dedicated interview details hook that makes a direct API call
  return useInterviewDetailsQuery(interviewId);
};
// Hook for comprehensive app loading state
export const useAppLoadingState = () => {
  const auth = useAuth();

  // Since data fetching is now handled by TanStack Query, we only need to check auth loading
  // Individual components will handle their own loading states via the query hooks

  // If auth is loading, the whole app is loading
  if (auth.isLoading) {
    return { isLoading: true, stage: "auth" };
  }

  // If not authenticated, no other loading needed
  if (!auth.isAuthenticated) {
    return { isLoading: false, stage: "none" };
  }

  // Auth is ready and user is authenticated
  return {
    isLoading: false,
    stage: "complete",
  };
};
