import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  Interview,
  DataState,
  InterviewFilters,
  InterviewDataResponse,
} from "./types";
import {
  fetchInterviewById,
  fetchInterviewIdFromJobId,
  updateInterviewStatus,
} from "@/lib/supabase-candidates";
import { authenticatedFetch } from "@/lib/auth-client";

interface InterviewsState {
  // Data states
  interviews: DataState<Interview[]>;
  interviewDetails: Record<string, DataState<InterviewDataResponse>>;

  // Filters and UI state
  filters: InterviewFilters;
  filteredInterviews: Interview[];

  // Cache settings (5 minutes TTL, 1 minute stale time)
  cacheTTL: number;
  staleTime: number;

  // Actions - Data fetching
  fetchInterviews: (force?: boolean) => Promise<void>;
  fetchInterviewDetails: (
    interviewId: string,
    force?: boolean
  ) => Promise<void>;

  // Actions - Data mutations
  createInterview: (interviewData: {
    title: string;
    job_id: string;
    status?: Interview["status"];
  }) => Promise<Interview>;

  updateInterview: (
    interviewId: string,
    updates: Partial<Interview>
  ) => Promise<void>;

  updateInterviewStatusAction: (
    interviewId: string,
    status: Interview["status"]
  ) => Promise<void>;

  addCandidateToInterview: (
    interviewId: string,
    candidateId: string
  ) => Promise<void>;

  addCandidatesToInterview: (
    interviewId: string,
    candidateIds: string[]
  ) => Promise<void>;

  sendBulkInvitations: (
    interviewId: string,
    candidateIds: string[]
  ) => Promise<void>;

  // Actions - Filtering and search
  setFilters: (filters: Partial<InterviewFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;

  // Actions - Cache management
  invalidateCache: () => void;
  invalidateInterviewDetails: (interviewId: string) => void;
  isDataStale: (lastFetched: number | null) => boolean;

  // Selectors
  getInterviewById: (interviewId: string) => Interview | undefined;
  getInterviewDetails: (
    interviewId: string
  ) => InterviewDataResponse | undefined;
  getInterviewsByJobId: (jobId: string) => Interview[];
  getInterviewsCount: () => number;
  getActiveInterviews: () => Interview[];
}

const initialDataState = <T>(initialData: T): DataState<T> => ({
  data: initialData,
  isLoading: false,
  error: null,
  lastFetched: null,
  isStale: true,
});

export const useInterviewsStore = create<InterviewsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      interviews: initialDataState<Interview[]>([]),
      interviewDetails: {},
      filters: {},
      filteredInterviews: [],
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      staleTime: 1 * 60 * 1000, // 1 minute

      // Cache management
      isDataStale: (lastFetched) => {
        if (!lastFetched) return true;
        const { staleTime } = get();
        return Date.now() - lastFetched > staleTime;
      },

      invalidateCache: () => {
        set((state) => ({
          interviews: {
            ...state.interviews,
            isStale: true,
            lastFetched: null,
          },
        }));
      },

      invalidateInterviewDetails: (interviewId) => {
        set((state) => ({
          interviewDetails: {
            ...state.interviewDetails,
            [interviewId]: {
              ...state.interviewDetails[interviewId],
              isStale: true,
              lastFetched: null,
            },
          },
        }));
      },

      // Data fetching
      fetchInterviews: async (force = false) => {
        const state = get();
        const { interviews, isDataStale, cacheTTL } = state;

        // Check if we need to fetch
        const needsFetch =
          force ||
          interviews.isStale ||
          isDataStale(interviews.lastFetched) ||
          (interviews.lastFetched &&
            Date.now() - interviews.lastFetched > cacheTTL);

        if (!needsFetch && !interviews.isLoading) {
          return;
        }

        set((state) => ({
          interviews: {
            ...state.interviews,
            isLoading: true,
            error: null,
          },
        }));

        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch interviews");
          }

          const data = await response.json();

          set({
            interviews: {
              data,
              isLoading: false,
              error: null,
              lastFetched: Date.now(),
              isStale: false,
            },
          });

          // Apply current filters
          get().applyFilters();
        } catch (error) {
          set((state) => ({
            interviews: {
              ...state.interviews,
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to fetch interviews",
            },
          }));
        }
      },

      fetchInterviewDetails: async (interviewId, force = false) => {
        const state = get();
        const { interviewDetails, isDataStale, cacheTTL } = state;
        const currentDetails = interviewDetails[interviewId];

        // Check if we need to fetch
        const needsFetch =
          force ||
          !currentDetails ||
          currentDetails.isStale ||
          isDataStale(currentDetails.lastFetched) ||
          (currentDetails.lastFetched &&
            Date.now() - currentDetails.lastFetched > cacheTTL);

        if (!needsFetch && currentDetails && !currentDetails.isLoading) {
          console.log(
            `🚫 Skipping fetch for interview ${interviewId} - already have fresh data`
          );
          return;
        }

        // Prevent concurrent fetches for the same interview
        if (currentDetails && currentDetails.isLoading) {
          console.log(
            `⏳ Already fetching interview ${interviewId} - skipping duplicate request`
          );
          return;
        }

        set((state) => ({
          interviewDetails: {
            ...state.interviewDetails,
            [interviewId]: currentDetails
              ? {
                  ...currentDetails,
                  isLoading: true,
                  error: null,
                }
              : {
                  data: undefined as any,
                  isLoading: true,
                  error: null,
                  lastFetched: null,
                  isStale: true,
                },
          },
        }));

        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch interview details");
          }

          const data = await response.json();

          set((state) => ({
            interviewDetails: {
              ...state.interviewDetails,
              [interviewId]: {
                data,
                isLoading: false,
                error: null,
                lastFetched: Date.now(),
                isStale: false,
              },
            },
          }));
        } catch (error) {
          set((state) => ({
            interviewDetails: {
              ...state.interviewDetails,
              [interviewId]: currentDetails
                ? {
                    ...currentDetails,
                    isLoading: false,
                    error:
                      error instanceof Error
                        ? error.message
                        : "Failed to fetch interview details",
                  }
                : {
                    data: undefined as any,
                    isLoading: false,
                    error:
                      error instanceof Error
                        ? error.message
                        : "Failed to fetch interview details",
                    lastFetched: null,
                    isStale: true,
                  },
            },
          }));
        }
      },

      // Data mutations
      createInterview: async (interviewData) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...interviewData,
                status: interviewData.status || "draft",
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to create interview");
          }

          const newInterview = await response.json();

          // Update local state
          set((state) => ({
            interviews: {
              ...state.interviews,
              data: [...state.interviews.data, newInterview],
            },
          }));

          get().applyFilters();
          return newInterview;
        } catch (error) {
          throw error;
        }
      },

      updateInterview: async (interviewId, updates) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to update interview");
          }

          // Update local state
          set((state) => ({
            interviews: {
              ...state.interviews,
              data: state.interviews.data.map((interview) =>
                interview.id === interviewId
                  ? { ...interview, ...updates }
                  : interview
              ),
            },
          }));

          // Invalidate cached details for this interview
          get().invalidateInterviewDetails(interviewId);
          get().applyFilters();
        } catch (error) {
          throw error;
        }
      },

      updateInterviewStatusAction: async (interviewId, status) => {
        try {
          await updateInterviewStatus(interviewId, status);

          // Update local state
          set((state) => ({
            interviews: {
              ...state.interviews,
              data: state.interviews.data.map((interview) =>
                interview.id === interviewId
                  ? { ...interview, status }
                  : interview
              ),
            },
          }));

          get().applyFilters();
        } catch (error) {
          throw error;
        }
      },

      addCandidateToInterview: async (interviewId, candidateId) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}/add-candidate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ candidate_id: candidateId }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to add candidate to interview");
          }

          // Update local state
          set((state) => ({
            interviews: {
              ...state.interviews,
              data: state.interviews.data.map((interview) =>
                interview.id === interviewId
                  ? {
                      ...interview,
                      candidates: interview.candidates + 1,
                    }
                  : interview
              ),
            },
          }));

          // Invalidate cached details for this interview
          get().invalidateInterviewDetails(interviewId);
        } catch (error) {
          throw error;
        }
      },

      addCandidatesToInterview: async (interviewId, candidateIds) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}/add-candidates-bulk`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ candidate_ids: candidateIds }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to add candidates to interview");
          }

          // Update local state
          set((state) => ({
            interviews: {
              ...state.interviews,
              data: state.interviews.data.map((interview) =>
                interview.id === interviewId
                  ? {
                      ...interview,
                      candidates: interview.candidates + 1,
                    }
                  : interview
              ),
            },
          }));

          // Invalidate cached details for this interview
          get().invalidateInterviewDetails(interviewId);
        } catch (error) {
          throw error;
        }
      },

      sendBulkInvitations: async (interviewId, candidateIds) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/${interviewId}/send-bulk-invites`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ candidate_ids: candidateIds }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to send bulk invitations");
          }

          return await response.json();
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
        const { interviews, filters } = get();
        let filtered = [...interviews.data];

        // Apply search term filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          filtered = filtered.filter((interview) =>
            interview.title.toLowerCase().includes(searchLower)
          );
        }

        // Apply status filter
        if (filters.statuses && filters.statuses.length > 0) {
          filtered = filtered.filter((interview) =>
            filters.statuses!.includes(interview.status)
          );
        }

        // Apply organization filter
        if (filters.organization_id) {
          filtered = filtered.filter(
            (interview) => interview.organization_id === filters.organization_id
          );
        }

        set({ filteredInterviews: filtered });
      },

      // Selectors
      getInterviewById: (interviewId) => {
        const { interviews } = get();
        return interviews.data.find(
          (interview) => interview.id === interviewId
        );
      },

      getInterviewDetails: (interviewId) => {
        const { interviewDetails } = get();
        return interviewDetails[interviewId]?.data;
      },

      getInterviewsByJobId: (jobId) => {
        const { interviews } = get();
        return interviews.data.filter(
          (interview) => interview.job_id === jobId
        );
      },

      getInterviewsCount: () => {
        const { interviews } = get();
        return interviews.data.length;
      },

      getActiveInterviews: () => {
        const { interviews } = get();
        return interviews.data.filter(
          (interview) => interview.status === "active"
        );
      },
    }),
    { name: "interviews-store" }
  )
);
