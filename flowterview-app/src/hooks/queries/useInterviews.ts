"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateRelatedQueries } from '@/lib/query-client';
import { authenticatedFetch } from '@/lib/auth-client';
import { updateInterviewStatus } from '@/lib/supabase-candidates';
import { toast } from 'sonner';

// Interviews queries for route-based data fetching
export const useInterviews = (filters?: Record<string, any>) => {
  const queryClient = useQueryClient();

  // Main interviews query
  const interviewsQuery = useQuery({
    queryKey: queryKeys.interviews.all(),
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch interviews: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000, // Interviews are fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Filtered interviews query - client-side filtering
  const filteredInterviewsQuery = useQuery({
    queryKey: queryKeys.interviews.list(filters || {}),
    queryFn: async () => {
      const allInterviews = interviewsQuery.data;
      if (!allInterviews || !filters) return allInterviews;

      return allInterviews.filter((interview: any) => {
        if (filters.status && interview.status !== filters.status) return false;
        if (filters.createdBy && interview.created_by !== filters.createdBy) return false;
        if (filters.search) {
          const search = filters.search.toLowerCase();
          const matchesTitle = interview.title?.toLowerCase().includes(search);
          const matchesCreator = interview.created_by?.toLowerCase().includes(search);
          if (!matchesTitle && !matchesCreator) return false;
        }
        return true;
      });
    },
    enabled: !!interviewsQuery.data && !!filters,
    staleTime: 30 * 1000, // Filtered results fresh for 30 seconds
  });

  // Create interview mutation
  const createInterviewMutation = useMutation({
    mutationFn: async (interviewData: { title: string; job_id: string; status?: string }) => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(interviewData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create interview: ${response.status}`);
      }

      return response.json();
    },
    onMutate: async (newInterview) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.interviews.all() });

      toast.loading('Creating interview...', { 
        id: 'create-interview',
        description: `Creating "${newInterview.title}"`
      });

      return { newInterview };
    },
    onSuccess: (data, variables) => {
      invalidateRelatedQueries(queryClient, 'create', 'interviews');
      
      toast.success('Interview created successfully', {
        id: 'create-interview',
        description: `"${variables.title}" is ready for candidates`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to create interview', {
        id: 'create-interview',
        description: error.message,
      });
    },
  });

  // Update interview status mutation
  const updateInterviewStatusMutation = useMutation({
    mutationFn: async ({ interviewId, status }: { interviewId: string; status: 'draft' | 'active' | 'completed' }) => {
      await updateInterviewStatus(interviewId, status);
      return { interviewId, status };
    },
    onMutate: async ({ interviewId, status }) => {
      // Optimistic update
      const queryKey = queryKeys.interviews.all();
      const previousInterviews = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any[]) => {
        if (!old) return old;
        return old.map(interview => 
          interview.id === interviewId ? { ...interview, status } : interview
        );
      });

      toast.loading(`Updating interview status...`, { id: `status-${interviewId}` });

      return { previousInterviews, interviewId, status };
    },
    onSuccess: (data) => {
      invalidateRelatedQueries(queryClient, 'update', 'interviews');
      
      toast.success('Interview status updated', {
        id: `status-${data.interviewId}`,
        description: `Status changed to ${data.status}`,
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousInterviews) {
        queryClient.setQueryData(queryKeys.interviews.all(), context.previousInterviews);
      }
      
      toast.error('Failed to update status', {
        id: `status-${variables.interviewId}`,
        description: error.message,
      });
    },
  });

  // Add candidates to interview mutation
  const addCandidatesToInterviewMutation = useMutation({
    mutationFn: async ({ interviewId, candidateIds }: { interviewId: string; candidateIds: string[] }) => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}/add-candidates-bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_ids: candidateIds }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to add candidates to interview: ${response.status}`);
      }

      return response.json();
    },
    onMutate: async ({ candidateIds }) => {
      toast.loading(`Adding ${candidateIds.length} candidates to interview...`, { 
        id: 'add-candidates-interview'
      });
    },
    onSuccess: (data, variables) => {
      invalidateRelatedQueries(queryClient, 'update', 'interviews');
      
      toast.success('Candidates added to interview', {
        id: 'add-candidates-interview',
        description: `${variables.candidateIds.length} candidates added successfully`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to add candidates', {
        id: 'add-candidates-interview',
        description: error.message,
      });
    },
  });

  return {
    // Data
    interviews: interviewsQuery.data || [],
    filteredInterviews: filteredInterviewsQuery.data || [],
    
    // Loading states
    isLoading: interviewsQuery.isLoading,
    isLoadingFiltered: filteredInterviewsQuery.isLoading,
    
    // Error states
    error: interviewsQuery.error || filteredInterviewsQuery.error,
    
    // Actions
    createInterview: createInterviewMutation.mutateAsync,
    updateInterviewStatus: updateInterviewStatusMutation.mutateAsync,
    addCandidatesToInterview: addCandidatesToInterviewMutation.mutateAsync,
    
    // Mutation states
    isCreatingInterview: createInterviewMutation.isPending,
    isUpdatingStatus: updateInterviewStatusMutation.isPending,
    isAddingCandidates: addCandidatesToInterviewMutation.isPending,
    
    // Query controls
    refetch: interviewsQuery.refetch,
    
    // Helper functions
    getInterviewById: (interviewId: string) => {
      return interviewsQuery.data?.find((interview: any) => interview.id === interviewId);
    },
    getActiveInterviews: () => {
      return interviewsQuery.data?.filter((interview: any) => interview.status === 'active') || [];
    },
    getInterviewsByJobId: (jobId: string) => {
      return interviewsQuery.data?.filter((interview: any) => interview.job_id === jobId) || [];
    },
  };
};

// Hook for specific interview details - route-based lazy loading
export const useInterviewDetails = (interviewId: string) => {
  const queryClient = useQueryClient();

  const interviewDetailsQuery = useQuery({
    queryKey: queryKeys.interviews.detail(interviewId),
    queryFn: async () => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch interview details: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!interviewId, // Only fetch if interviewId is provided
    staleTime: 5 * 60 * 1000, // Interview details are fresh for 5 minutes
    gcTime: 15 * 60 * 1000, // Cache for 15 minutes
  });

  return {
    interviewDetails: interviewDetailsQuery.data,
    isLoading: interviewDetailsQuery.isLoading,
    error: interviewDetailsQuery.error,
    refetch: interviewDetailsQuery.refetch,
  };
};