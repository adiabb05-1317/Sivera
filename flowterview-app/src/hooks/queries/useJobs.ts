"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateRelatedQueries } from "@/lib/query-client";
import { authenticatedFetch } from "@/lib/auth-client";
import { fetchJobs } from "@/lib/supabase-candidates";
import { toast } from "sonner";

// Jobs queries for route-based data fetching
export const useJobs = () => {
  const queryClient = useQueryClient();

  // Main jobs query
  const jobsQuery = useQuery({
    queryKey: queryKeys.jobs.all(),
    queryFn: fetchJobs,
    staleTime: 10 * 60 * 1000, // Jobs are relatively stable, fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (jobData: {
      title: string;
      description?: string;
      requirements?: string[];
      department?: string;
    }) => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/jobs/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jobData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create job: ${response.status}`);
      }

      return response.json();
    },
    onMutate: async (newJob) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.all() });

      toast.loading("Creating job posting...", {
        id: "create-job",
        description: `Creating "${newJob.title}"`,
      });

      return { newJob };
    },
    onSuccess: (data, variables) => {
      invalidateRelatedQueries(queryClient, "create", "jobs");

      toast.success("Job created successfully", {
        id: "create-job",
        description: `"${variables.title}" is now available for candidates`,
      });
    },
    onError: (error: any) => {
      toast.error("Failed to create job", {
        id: "create-job",
        description: error.message,
      });
    },
  });

  // Update job mutation
  const updateJobMutation = useMutation({
    mutationFn: async ({
      jobId,
      updates,
    }: {
      jobId: string;
      updates: Partial<{
        title: string;
        description: string;
        requirements: string[];
      }>;
    }) => {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/jobs/${jobId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update job: ${response.status}`);
      }

      return response.json();
    },
    onMutate: async ({ jobId, updates }) => {
      // Optimistic update
      const queryKey = queryKeys.jobs.all();
      const previousJobs = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any[]) => {
        if (!old) return old;
        return old.map((job) =>
          job.id === jobId ? { ...job, ...updates } : job
        );
      });

      toast.loading("Updating job...", { id: `update-job-${jobId}` });

      return { previousJobs, jobId, updates };
    },
    onSuccess: (data, variables) => {
      invalidateRelatedQueries(queryClient, "update", "jobs");

      toast.success("Job updated successfully", {
        id: `update-job-${variables.jobId}`,
        description: "Job details have been saved",
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousJobs) {
        queryClient.setQueryData(queryKeys.jobs.all(), context.previousJobs);
      }

      toast.error("Failed to update job", {
        id: `update-job-${variables.jobId}`,
        description: error.message,
      });
    },
  });

  return {
    // Data
    jobs: jobsQuery.data || [],

    // Loading states
    isLoading: jobsQuery.isLoading,

    // Error states
    error: jobsQuery.error,

    // Actions
    createJob: createJobMutation.mutateAsync,
    updateJob: updateJobMutation.mutateAsync,

    // Mutation states
    isCreatingJob: createJobMutation.isPending,
    isUpdatingJob: updateJobMutation.isPending,

    // Query controls
    refetch: jobsQuery.refetch,

    // Helper functions
    getJobById: (jobId: string) => {
      return jobsQuery.data?.find((job: any) => job.id === jobId);
    },
    getJobsByDepartment: (department: string) => {
      return (
        jobsQuery.data?.filter((job: any) => job.department === department) ||
        []
      );
    },
  };
};
