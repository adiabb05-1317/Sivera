"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateRelatedQueries } from '@/lib/query-client';
import { authenticatedFetch } from '@/lib/auth-client';
import { 
  addCandidate, 
  addBulkCandidates, 
  fetchCandidatesSortedByJob,
  CandidateStatus 
} from '@/lib/supabase-candidates';
import { toast } from 'sonner';

// Candidates queries with route-based data fetching
export const useCandidates = (filters?: Record<string, any>) => {
  const queryClient = useQueryClient();

  // Main candidates query - fetches candidates grouped by job
  const candidatesQuery = useQuery({
    queryKey: queryKeys.candidates.byJob(),
    queryFn: fetchCandidatesSortedByJob,
    staleTime: 1 * 60 * 1000, // Candidates data is fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filtered candidates query - only runs when filters are applied
  const filteredCandidatesQuery = useQuery({
    queryKey: queryKeys.candidates.list(filters || {}),
    queryFn: async () => {
      // Apply client-side filtering to cached data
      const allCandidates = candidatesQuery.data;
      if (!allCandidates || !filters) return allCandidates;

      // Transform grouped data to flat array for filtering
      const flatCandidates = Object.values(allCandidates).flat();
      
      return flatCandidates.filter((candidate: any) => {
        // Apply filters logic here
        if (filters.status && candidate.status !== filters.status) return false;
        if (filters.jobId && candidate.job_id !== filters.jobId) return false;
        if (filters.search) {
          const search = filters.search.toLowerCase();
          const matchesName = candidate.name?.toLowerCase().includes(search);
          const matchesEmail = candidate.email?.toLowerCase().includes(search);
          if (!matchesName && !matchesEmail) return false;
        }
        return true;
      });
    },
    enabled: !!candidatesQuery.data && !!filters, // Only run if we have data and filters
    staleTime: 30 * 1000, // Filtered results are fresh for 30 seconds
  });

  // Add single candidate mutation with optimistic updates
  const addCandidateMutation = useMutation({
    mutationFn: addCandidate,
    onMutate: async (newCandidate) => {
      // Cancel outgoing queries to prevent conflicts
      await queryClient.cancelQueries({ queryKey: queryKeys.candidates.byJob() });

      // Snapshot previous value
      const previousCandidates = queryClient.getQueryData(queryKeys.candidates.byJob());

      // Optimistically update UI
      toast.loading('Adding candidate...', { 
        id: 'add-candidate',
        description: `Adding ${newCandidate.name}` 
      });

      return { previousCandidates };
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch candidates data
      invalidateRelatedQueries(queryClient, 'create', 'candidates');
      
      toast.success('Candidate added successfully', {
        id: 'add-candidate',
        description: `${variables.name} has been added to the interview`,
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousCandidates) {
        queryClient.setQueryData(queryKeys.candidates.byJob(), context.previousCandidates);
      }
      
      toast.error('Failed to add candidate', {
        id: 'add-candidate',
        description: error.message,
      });
    },
  });

  // Bulk add candidates mutation
  const addBulkCandidatesMutation = useMutation({
    mutationFn: addBulkCandidates,
    onMutate: async (bulkData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.candidates.byJob() });
      
      const candidateCount = bulkData.candidates.length;
      toast.loading(`Adding ${candidateCount} candidates...`, { 
        id: 'bulk-add-candidates',
        description: 'This may take a moment'
      });

      return { candidateCount };
    },
    onSuccess: (data, variables, context) => {
      invalidateRelatedQueries(queryClient, 'create', 'candidates');
      
      const successCount = data?.length || 0;
      const totalCount = context?.candidateCount || 0;
      
      toast.success(`Candidates added successfully`, {
        id: 'bulk-add-candidates',
        description: `${successCount} of ${totalCount} candidates added`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to add candidates', {
        id: 'bulk-add-candidates',
        description: error.message,
      });
    },
  });

  // Update candidate status mutation
  const updateCandidateStatusMutation = useMutation({
    mutationFn: async ({ candidateId, status }: { candidateId: string; status: CandidateStatus }) => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/candidates/${candidateId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update candidate status: ${response.status}`);
      }

      return response.json();
    },
    onMutate: async ({ candidateId, status }) => {
      // Optimistic update
      const queryKey = queryKeys.candidates.byJob();
      const previousCandidates = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        // Update the specific candidate's status in the grouped data
        const updated = { ...old };
        Object.keys(updated).forEach(jobId => {
          updated[jobId] = updated[jobId].map((candidate: any) =>
            candidate.id === candidateId ? { ...candidate, status } : candidate
          );
        });
        
        return updated;
      });

      toast.loading('Updating candidate status...', { id: `status-${candidateId}` });

      return { previousCandidates, candidateId, status };
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      invalidateRelatedQueries(queryClient, 'update', 'candidates');
      
      toast.success('Status updated', {
        id: `status-${variables.candidateId}`,
        description: `Candidate status changed to ${variables.status}`,
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousCandidates) {
        queryClient.setQueryData(queryKeys.candidates.byJob(), context.previousCandidates);
      }
      
      toast.error('Failed to update status', {
        id: `status-${variables.candidateId}`,
        description: error.message,
      });
    },
  });

  return {
    // Data
    candidatesGrouped: candidatesQuery.data,
    filteredCandidates: filteredCandidatesQuery.data,
    
    // Transform grouped data to flat array for UI components
    allCandidates: candidatesQuery.data ? Object.values(candidatesQuery.data).flat() : [],
    
    // Loading states
    isLoading: candidatesQuery.isLoading,
    isLoadingFiltered: filteredCandidatesQuery.isLoading,
    
    // Error states  
    error: candidatesQuery.error || filteredCandidatesQuery.error,
    
    // Actions
    addCandidate: addCandidateMutation.mutateAsync,
    addBulkCandidates: addBulkCandidatesMutation.mutateAsync,
    updateCandidateStatus: updateCandidateStatusMutation.mutateAsync,
    
    // Mutation states
    isAddingCandidate: addCandidateMutation.isPending,
    isAddingBulkCandidates: addBulkCandidatesMutation.isPending,
    isUpdatingStatus: updateCandidateStatusMutation.isPending,
    
    // Query controls
    refetch: candidatesQuery.refetch,
    
    // Helper functions
    getCandidatesByJobId: (jobId: string) => {
      return candidatesQuery.data?.[jobId] || [];
    },
    getCandidateById: (candidateId: string) => {
      if (!candidatesQuery.data) return undefined;
      
      for (const candidates of Object.values(candidatesQuery.data)) {
        const candidate = (candidates as any[]).find((c: any) => c.id === candidateId);
        if (candidate) return candidate;
      }
      return undefined;
    },
  };
};