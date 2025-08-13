"use client";

import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Production-optimized QueryClient configuration
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Stale-while-revalidate: Show cached data immediately, fetch fresh data in background
        staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache for 10 minutes

        // Network optimizations
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnReconnect: true, // Refetch when network reconnects
        refetchOnMount: false, // Don't refetch if data exists and is not stale

        // Error handling with exponential backoff
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // Retry up to 3 times for 5xx errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff

        // Performance optimizations
        structuralSharing: true, // Only re-render if data actually changed
      },
      mutations: {
        // Error handling for mutations
        onError: (error: any) => {
          const errorMessage = error?.message || "An error occurred";
          toast.error("Operation failed", {
            description: errorMessage,
          });
        },

        // Global success handler (can be overridden)
        onSuccess: () => {
          // Most mutations will override this with specific success messages
        },

        // Retry mutations once on network error
        retry: (failureCount, error: any) => {
          if (error?.name === "NetworkError" && failureCount < 1) {
            return true;
          }
          return false;
        },
      },
    },
  });

// Singleton pattern for consistent query client across app
let queryClient: QueryClient | undefined = undefined;

export const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server-side: always create new client
    return createQueryClient();
  }

  // Client-side: create once and reuse
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
};

// Query keys factory for consistent key management
export const queryKeys = {
  // Auth-related queries
  auth: {
    user: () => ["auth", "user"] as const,
    organization: (orgId: string) => ["auth", "organization", orgId] as const,
  },

  // Candidates queries with hierarchical keys
  candidates: {
    all: () => ["candidates"] as const,
    lists: () => [...queryKeys.candidates.all(), "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.candidates.lists(), filters] as const,
    byJob: () => [...queryKeys.candidates.all(), "by-job"] as const,
    detail: (id: string) =>
      [...queryKeys.candidates.all(), "detail", id] as const,
    analytics: (candidateId: string, interviewId: string) =>
      [
        ...queryKeys.candidates.detail(candidateId),
        "analytics",
        interviewId,
      ] as const,
  },

  // Interviews queries
  interviews: {
    all: () => ["interviews"] as const,
    lists: () => [...queryKeys.interviews.all(), "list"] as const,
    list: (filters: Record<string, any>) =>
      [...queryKeys.interviews.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.interviews.all(), "detail", id] as const,
    byJob: (jobId: string) =>
      [...queryKeys.interviews.all(), "by-job", jobId] as const,
  },

  // Jobs queries
  jobs: {
    all: () => ["jobs"] as const,
    lists: () => [...queryKeys.jobs.all(), "list"] as const,
    detail: (id: string) => [...queryKeys.jobs.all(), "detail", id] as const,
  },

  // Analytics queries
  analytics: {
    all: () => ["analytics"] as const,
    overview: () => [...queryKeys.analytics.all(), "overview"] as const,
    orgAverageScore: () =>
      [...queryKeys.analytics.all(), "org-average-score"] as const,
    interview: (interviewId: string) =>
      [...queryKeys.analytics.all(), "interview", interviewId] as const,
    candidate: (candidateId: string) =>
      [...queryKeys.analytics.all(), "candidate", candidateId] as const,
  },
} as const;

// Helper function to invalidate related queries
export const invalidateRelatedQueries = async (
  queryClient: QueryClient,
  action: string,
  entityType: string
) => {
  try {
    switch (entityType) {
      case "candidates":
        // Invalidate all candidate-related queries
        await queryClient.invalidateQueries({
          queryKey: queryKeys.candidates.all(),
        });
        // Also invalidate interviews since they show candidate counts
        await queryClient.invalidateQueries({
          queryKey: queryKeys.interviews.all(),
        });
        // Invalidate analytics as candidate changes affect metrics
        await queryClient.invalidateQueries({
          queryKey: queryKeys.analytics.all(),
        });
        break;

      case "interviews":
        await queryClient.invalidateQueries({
          queryKey: queryKeys.interviews.all(),
        });
        // Interview changes might affect candidate data (statuses, assignments)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.candidates.all(),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.analytics.all(),
        });
        break;

      case "jobs":
        await queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
        // Job changes affect candidates and interviews
        await queryClient.invalidateQueries({
          queryKey: queryKeys.candidates.all(),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.interviews.all(),
        });
        break;

      default:
        // Fallback: invalidate everything
        await queryClient.invalidateQueries();
    }
  } catch (error) {
    console.error("Error invalidating queries:", error);
    // Fallback to invalidating everything if specific invalidation fails
    await queryClient.invalidateQueries();
  }
};
