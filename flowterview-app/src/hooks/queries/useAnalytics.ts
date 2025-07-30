"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { authenticatedFetch } from "@/lib/auth-client";

// Analytics queries - route-based data fetching
export const useAnalytics = () => {
  // Basic analytics endpoint (placeholder for overview)
  const overviewQuery = useQuery({
    queryKey: queryKeys.analytics.overview(),
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analytics overview: ${response.status}`
        );
      }

      return response.json();
    },
    staleTime: 3 * 60 * 1000, // Analytics fresh for 3 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Organization average score query - using the correct endpoint
  const orgAverageScoreQuery = useQuery({
    queryKey: queryKeys.analytics.orgAverageScore(),
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/average-score`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch organization average score: ${response.status}`
        );
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Org scores change less frequently
    gcTime: 15 * 60 * 1000, // Cache for 15 minutes
  });

  return {
    // Data
    overview: overviewQuery.data,
    organizationAverageScore: orgAverageScoreQuery.data?.average_score,

    // Loading states
    isLoading: overviewQuery.isLoading || orgAverageScoreQuery.isLoading,
    isLoadingOverview: overviewQuery.isLoading,
    isLoadingAverageScore: orgAverageScoreQuery.isLoading,

    // Error states
    error: overviewQuery.error || orgAverageScoreQuery.error,

    // Query controls
    refetchOverview: overviewQuery.refetch,
    refetchAverageScore: orgAverageScoreQuery.refetch,
    refetchAll: () => {
      overviewQuery.refetch();
      orgAverageScoreQuery.refetch();
    },
  };
};

// Candidate analytics query - lazy loaded when needed
export const useCandidateAnalytics = (
  candidateId: string,
  interviewId: string
) => {
  const candidateAnalyticsQuery = useQuery({
    queryKey: queryKeys.candidates.analytics(candidateId, interviewId),
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/interview/${interviewId}/candidate/${candidateId}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch candidate analytics: ${response.status}`
        );
      }

      const data = await response.json();
      return data.analytics;
    },
    enabled: !!(candidateId && interviewId), // Only fetch if both IDs are provided
    staleTime: 10 * 60 * 1000, // Candidate analytics are relatively stable
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  return {
    analytics: candidateAnalyticsQuery.data,
    isLoading: candidateAnalyticsQuery.isLoading,
    error: candidateAnalyticsQuery.error,
    refetch: candidateAnalyticsQuery.refetch,
  };
};

// Interview analytics query - for detailed interview analysis
export const useInterviewAnalytics = (interviewId: string) => {
  const interviewAnalyticsQuery = useQuery({
    queryKey: queryKeys.analytics.interview(interviewId),
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/interview/${interviewId}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch interview analytics: ${response.status}`
        );
      }

      return response.json();
    },
    enabled: !!interviewId,
    staleTime: 5 * 60 * 1000, // Interview analytics fresh for 5 minutes
    gcTime: 20 * 60 * 1000, // Cache for 20 minutes
  });

  return {
    analytics: interviewAnalyticsQuery.data,
    isLoading: interviewAnalyticsQuery.isLoading,
    error: interviewAnalyticsQuery.error,
    refetch: interviewAnalyticsQuery.refetch,
  };
};
