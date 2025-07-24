import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  Candidate,
  DataState,
  CandidateFilters,
  CandidatesByJobResponse,
} from "./types";
import {
  fetchCandidatesSortedByJob,
  addCandidate,
  addBulkCandidates,
  CandidateStatus,
} from "@/lib/supabase-candidates";
import { authenticatedFetch } from "@/lib/auth-client";
import { AppErrorHandler } from "@/lib/error-handler";
import { config } from "@/lib/config";

interface CandidatesState {
  // Data states
  candidatesByJob: DataState<CandidatesByJobResponse>;
  allCandidates: DataState<Candidate[]>;

  // Filters and UI state
  filters: CandidateFilters;
  filteredCandidates: Candidate[];

  // Cache settings (5 minutes TTL, 1 minute stale time)
  cacheTTL: number;
  staleTime: number;

  // Actions - Data fetching
  fetchCandidatesByJob: (force?: boolean) => Promise<void>;
  fetchAllCandidates: (force?: boolean) => Promise<void>;

  // Actions - Data mutations
  addSingleCandidate: (candidateData: {
    name: string;
    email: string;
    jobId: string;
    resumeFile?: File;
    status?: CandidateStatus;
    interviewId: string;
  }) => Promise<Candidate>;

  addMultipleCandidates: (candidatesData: {
    candidates: Array<{
      name: string;
      email: string;
      phone: string;
      resumeFile?: File;
      resume_url?: string;
      status?: CandidateStatus;
    }>;
    jobId: string;
    interviewId: string;
  }) => Promise<Candidate[]>;

  updateCandidateStatus: (
    candidateId: string,
    status: CandidateStatus
  ) => Promise<void>;

  sendInvitation: (candidate: Candidate) => Promise<void>;

  // Actions - Filtering and search
  setFilters: (filters: Partial<CandidateFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;

  // Actions - Cache management
  invalidateCache: () => void;
  isDataStale: (lastFetched: number | null) => boolean;

  // Selectors
  getCandidatesByJobId: (jobId: string) => Candidate[];
  getCandidateById: (candidateId: string) => Candidate | undefined;
  getCandidatesCount: () => number;
}

const initialDataState = <T>(initialData: T): DataState<T> => ({
  data: initialData,
  isLoading: false,
  error: null,
  lastFetched: null,
  isStale: true,
});

export const useCandidatesStore = create<CandidatesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      candidatesByJob: initialDataState<CandidatesByJobResponse>({}),
      allCandidates: initialDataState<Candidate[]>([]),
      filters: {},
      filteredCandidates: [],
      cacheTTL: config.cache.defaultTTL,
      staleTime: config.cache.staleTime,

      // Cache management
      isDataStale: (lastFetched) => {
        if (!lastFetched) return true;
        const { staleTime } = get();
        return Date.now() - lastFetched > staleTime;
      },

      invalidateCache: () => {
        set((state) => ({
          candidatesByJob: {
            ...state.candidatesByJob,
            isStale: true,
            lastFetched: null,
          },
          allCandidates: {
            ...state.allCandidates,
            isStale: true,
            lastFetched: null,
          },
        }));
      },

      // Data fetching
      fetchCandidatesByJob: async (force = false) => {
        const state = get();
        const { candidatesByJob, isDataStale, cacheTTL } = state;

        // Check if we need to fetch
        const needsFetch =
          force ||
          candidatesByJob.isStale ||
          isDataStale(candidatesByJob.lastFetched) ||
          (candidatesByJob.lastFetched &&
            Date.now() - candidatesByJob.lastFetched > cacheTTL);

        if (!needsFetch && !candidatesByJob.isLoading) {
          return;
        }

        set((state) => ({
          candidatesByJob: {
            ...state.candidatesByJob,
            isLoading: true,
            error: null,
          },
        }));

        try {
          const data = await AppErrorHandler.withRetry(
            () => fetchCandidatesSortedByJob(),
            config.api.retryAttempts,
            "fetchCandidatesByJob"
          );
          const candidatesArray = Object.values(data).flat() as Candidate[];

          set((state) => ({
            candidatesByJob: {
              data,
              isLoading: false,
              error: null,
              lastFetched: Date.now(),
              isStale: false,
            },
            // Update allCandidates as well
            allCandidates: {
              ...state.allCandidates,
              data: candidatesArray,
              lastFetched: Date.now(),
              isStale: false,
            },
          }));

          // Apply current filters
          get().applyFilters();
        } catch (error) {
          const appError = AppErrorHandler.createError(
            error,
            "fetchCandidatesByJob"
          );
          
          set((state) => ({
            candidatesByJob: {
              ...state.candidatesByJob,
              isLoading: false,
              error: appError.message,
            },
          }));

          console.error("Failed to fetch candidates:", appError);
        }
      },

      fetchAllCandidates: async (force = false) => {
        // For now, this will use the same data as candidatesByJob
        // but flattened. In the future, you might have a separate endpoint
        await get().fetchCandidatesByJob(force);
      },

      // Data mutations
      addSingleCandidate: async (candidateData) => {
        try {
          const newCandidate = await addCandidate(candidateData);

          // Update local state
          set((state) => {
            const updatedCandidatesByJob = { ...state.candidatesByJob.data };
            const jobId = candidateData.jobId;

            if (!updatedCandidatesByJob[jobId]) {
              updatedCandidatesByJob[jobId] = [];
            }
            updatedCandidatesByJob[jobId].push(newCandidate);

            return {
              candidatesByJob: {
                ...state.candidatesByJob,
                data: updatedCandidatesByJob,
              },
              allCandidates: {
                ...state.allCandidates,
                data: [...state.allCandidates.data, newCandidate],
              },
            };
          });

          get().applyFilters();
          return newCandidate;
        } catch (error) {
          throw error;
        }
      },

      addMultipleCandidates: async (candidatesData) => {
        try {
          const newCandidates = await addBulkCandidates(candidatesData);

          // Update local state
          set((state) => {
            const updatedCandidatesByJob = { ...state.candidatesByJob.data };
            const jobId = candidatesData.jobId;

            if (!updatedCandidatesByJob[jobId]) {
              updatedCandidatesByJob[jobId] = [];
            }
            updatedCandidatesByJob[jobId].push(...newCandidates);

            return {
              candidatesByJob: {
                ...state.candidatesByJob,
                data: updatedCandidatesByJob,
              },
              allCandidates: {
                ...state.allCandidates,
                data: [...state.allCandidates.data, ...newCandidates],
              },
            };
          });

          get().applyFilters();
          return newCandidates;
        } catch (error) {
          throw error;
        }
      },

      updateCandidateStatus: async (candidateId, status) => {
        // Get current candidate for rollback if needed
        const currentCandidate = get().getCandidateById(candidateId);
        const previousStatus = currentCandidate?.status;

        // Optimistic update - update UI immediately
        const updateCandidate = (candidate: Candidate) =>
          candidate.id === candidateId
            ? { ...candidate, status }
            : candidate;

        set((state) => {
          const updatedCandidatesByJob = Object.fromEntries(
            Object.entries(state.candidatesByJob.data).map(
              ([jobId, candidates]) => [
                jobId,
                candidates.map(updateCandidate),
              ]
            )
          );

          return {
            candidatesByJob: {
              ...state.candidatesByJob,
              data: updatedCandidatesByJob,
            },
            allCandidates: {
              ...state.allCandidates,
              data: state.allCandidates.data.map(updateCandidate),
            },
          };
        });

        get().applyFilters();

        try {
          // Call API to persist the change
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/candidates/${candidateId}/status`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to update candidate status");
          }
        } catch (error) {
          // Rollback optimistic update on error
          if (previousStatus) {
            const rollbackUpdate = (candidate: Candidate) =>
              candidate.id === candidateId
                ? { ...candidate, status: previousStatus }
                : candidate;

            set((state) => {
              const rolledBackCandidatesByJob = Object.fromEntries(
                Object.entries(state.candidatesByJob.data).map(
                  ([jobId, candidates]) => [
                    jobId,
                    candidates.map(rollbackUpdate),
                  ]
                )
              );

              return {
                candidatesByJob: {
                  ...state.candidatesByJob,
                  data: rolledBackCandidatesByJob,
                },
                allCandidates: {
                  ...state.allCandidates,
                  data: state.allCandidates.data.map(rollbackUpdate),
                },
              };
            });

            get().applyFilters();
          }
          throw error;
        }
      },

      sendInvitation: async (candidate) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/send-invite`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: candidate.email,
                name: candidate.name,
                job: candidate.jobs?.title || "",
                organization_id: candidate.organization_id,
                sender_id: "system",
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to send invitation");
          }

          // Optionally update candidate status to indicate invitation sent
          // await get().updateCandidateStatus(candidate.id, "Interview_Scheduled");
        } catch (error) {
          throw error;
        }
      },

      // Filtering and search
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
        get().applyFilters();
      },

      clearFilters: () => {
        set({ filters: {} });
        get().applyFilters();
      },

      applyFilters: () => {
        const { allCandidates, filters } = get();
        let filtered = [...allCandidates.data];

        // Apply search term filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          filtered = filtered.filter(
            (candidate) =>
              candidate.name.toLowerCase().includes(searchLower) ||
              candidate.email.toLowerCase().includes(searchLower) ||
              candidate.jobs?.title?.toLowerCase().includes(searchLower)
          );
        }

        // Apply job filter
        if (filters.jobIds && filters.jobIds.length > 0) {
          filtered = filtered.filter((candidate) =>
            filters.jobIds!.includes(candidate.job_id)
          );
        }

        // Apply status filter
        if (filters.statuses && filters.statuses.length > 0) {
          filtered = filtered.filter((candidate) =>
            filters.statuses!.includes(candidate.status)
          );
        }

        // Apply organization filter
        if (filters.organization_id) {
          filtered = filtered.filter(
            (candidate) => candidate.organization_id === filters.organization_id
          );
        }

        set({ filteredCandidates: filtered });
      },

      // Selectors
      getCandidatesByJobId: (jobId) => {
        const { candidatesByJob } = get();
        return candidatesByJob.data[jobId] || [];
      },

      getCandidateById: (candidateId) => {
        const { allCandidates } = get();
        return allCandidates.data.find(
          (candidate) => candidate.id === candidateId
        );
      },

      getCandidatesCount: () => {
        const { allCandidates } = get();
        return allCandidates.data.length;
      },
    }),
    { name: "candidates-store" }
  )
);
