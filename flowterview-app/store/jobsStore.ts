import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Job, DataState } from "./types";
import { fetchJobs } from "@/lib/supabase-candidates";
import { authenticatedFetch } from "@/lib/auth-client";

interface JobsState {
  // Data state
  jobs: DataState<Job[]>;

  // Cache settings (10 minutes TTL, 2 minutes stale time)
  cacheTTL: number;
  staleTime: number;

  // Actions - Data fetching
  fetchJobs: (force?: boolean) => Promise<void>;

  // Actions - Data mutations
  createJob: (jobData: { title: string; description?: string }) => Promise<Job>;

  updateJob: (jobId: string, updates: Partial<Job>) => Promise<void>;

  deleteJob: (jobId: string) => Promise<void>;

  // Actions - Cache management
  invalidateCache: () => void;
  isDataStale: (lastFetched: number | null) => boolean;

  // Selectors
  getJobById: (jobId: string) => Job | undefined;
  getJobsCount: () => number;
  getJobsByOrganization: (organizationId: string) => Job[];
}

const initialDataState = <T>(initialData: T): DataState<T> => ({
  data: initialData,
  isLoading: false,
  error: null,
  lastFetched: null,
  isStale: true,
});

export const useJobsStore = create<JobsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      jobs: initialDataState<Job[]>([]),
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      staleTime: 2 * 60 * 1000, // 2 minutes

      // Cache management
      isDataStale: (lastFetched) => {
        if (!lastFetched) return true;
        const { staleTime } = get();
        return Date.now() - lastFetched > staleTime;
      },

      invalidateCache: () => {
        set((state) => ({
          jobs: {
            ...state.jobs,
            isStale: true,
            lastFetched: null,
          },
        }));
      },

      // Data fetching
      fetchJobs: async (force = false) => {
        const state = get();
        const { jobs, isDataStale, cacheTTL } = state;

        // Check if we need to fetch
        const needsFetch =
          force ||
          jobs.isStale ||
          isDataStale(jobs.lastFetched) ||
          (jobs.lastFetched && Date.now() - jobs.lastFetched > cacheTTL);

        if (!needsFetch && !jobs.isLoading) {
          return;
        }

        if (jobs.isLoading) {
          return;
        }
        set((state) => ({
          jobs: {
            ...state.jobs,
            isLoading: true,
            error: null,
          },
        }));

        try {
          const data = await fetchJobs();
          set({
            jobs: {
              data,
              isLoading: false,
              error: null,
              lastFetched: Date.now(),
              isStale: false,
            },
          });
        } catch (error) {
          console.error("❌ Jobs fetch failed:", error);
          set((state) => ({
            jobs: {
              ...state.jobs,
              isLoading: false,
              error:
                error instanceof Error ? error.message : "Failed to fetch jobs",
            },
          }));
        }
      },

      // Data mutations
      createJob: async (jobData) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/jobs`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(jobData),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to create job");
          }

          const newJob = await response.json();

          // Update local state
          set((state) => ({
            jobs: {
              ...state.jobs,
              data: [...state.jobs.data, newJob],
            },
          }));

          return newJob;
        } catch (error) {
          throw error;
        }
      },

      updateJob: async (jobId, updates) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/jobs/${jobId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to update job");
          }

          // Update local state
          set((state) => ({
            jobs: {
              ...state.jobs,
              data: state.jobs.data.map((job) =>
                job.id === jobId ? { ...job, ...updates } : job
              ),
            },
          }));
        } catch (error) {
          throw error;
        }
      },

      deleteJob: async (jobId) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/jobs/${jobId}`,
            {
              method: "DELETE",
            }
          );

          if (!response.ok) {
            throw new Error("Failed to delete job");
          }

          // Update local state
          set((state) => ({
            jobs: {
              ...state.jobs,
              data: state.jobs.data.filter((job) => job.id !== jobId),
            },
          }));
        } catch (error) {
          throw error;
        }
      },

      // Selectors
      getJobById: (jobId) => {
        const { jobs } = get();
        return jobs.data.find((job) => job.id === jobId);
      },

      getJobsCount: () => {
        const { jobs } = get();
        return jobs.data.length;
      },

      getJobsByOrganization: (organizationId) => {
        const { jobs } = get();
        return jobs.data.filter(
          (job) => job.organization_id === organizationId
        );
      },
    }),
    { name: "jobs-store" }
  )
);
