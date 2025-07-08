import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { DataState } from "./types";
import { authenticatedFetch } from "@/lib/auth-client";

// Analytics Types
export interface ChatMessage {
  role: string;
  content: string;
}

export interface InterviewAnalytics {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  overall_score: number;
  technical_score: number;
  technical_topics: string[];
  interview_end_time: string;
  overall_assessment: string;
  communication_score: number;
  interview_start_time: string;
  areas_for_improvement: string[];
  interview_duration_seconds: number;
}

export interface InterviewAnalyticsResponse {
  analytics: InterviewAnalytics;
}

export interface AnalyzeInterviewRequest {
  chat_history: ChatMessage[];
}

export interface AnalyticsOverview {
  total_interviews: number;
  completion_rate: number;
  average_score: number;
  candidate_satisfaction: number;
  monthly_trends: {
    month: string;
    interviews: number;
    completion_rate: number;
    average_score: number;
  }[];
  performance_distribution: {
    name: string;
    value: number;
    color: string;
  }[];
  completion_by_role: {
    name: string;
    rate: number;
  }[];
}

interface AnalyticsState {
  // Data states
  overview: DataState<AnalyticsOverview | null>;
  interviewAnalytics: Record<string, DataState<InterviewAnalytics | null>>;
  candidateAnalytics: Record<string, DataState<InterviewAnalytics | null>>;
  averageScores: Record<string, DataState<{ average_score: number } | null>>;
  organizationAverageScore: DataState<{ average_score: number | null } | null>;

  // Cache settings (5 minutes TTL, 1 minute stale time)
  cacheTTL: number;
  staleTime: number;

  // Actions - Data fetching
  fetchOverview: (force?: boolean) => Promise<void>;
  fetchInterviewAnalytics: (
    interviewId: string,
    force?: boolean
  ) => Promise<void>;
  fetchCandidateAnalytics: (
    interviewId: string,
    candidateId: string,
    force?: boolean
  ) => Promise<void>;
  fetchAverageScore: (interviewId: string, force?: boolean) => Promise<void>;
  fetchOrganizationAverageScore: (force?: boolean) => Promise<void>;
  analyzeInterview: (
    request: AnalyzeInterviewRequest
  ) => Promise<InterviewAnalytics | null>;

  // Actions - Cache management
  invalidateCache: () => void;
  invalidateInterviewCache: (interviewId: string) => void;
  isDataStale: (lastFetched: number | null) => boolean;

  // Selectors
  getInterviewAnalytics: (interviewId: string) => InterviewAnalytics | null;
  getCandidateAnalytics: (
    interviewId: string,
    candidateId: string
  ) => InterviewAnalytics | null;
  getAverageScore: (interviewId: string) => number | null;
  getOrganizationAverageScore: () => number | null;
  getOverviewData: () => AnalyticsOverview | null;
}

const initialDataState = <T>(initialData: T): DataState<T> => ({
  data: initialData,
  isLoading: false,
  error: null,
  lastFetched: null,
  isStale: true,
});

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      overview: initialDataState<AnalyticsOverview | null>(null),
      interviewAnalytics: {},
      candidateAnalytics: {},
      averageScores: {},
      organizationAverageScore: initialDataState<{
        average_score: number | null;
      } | null>(null),
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
          overview: {
            ...state.overview,
            isStale: true,
            lastFetched: null,
          },
          organizationAverageScore: {
            ...state.organizationAverageScore,
            isStale: true,
            lastFetched: null,
          },
        }));
      },

      invalidateInterviewCache: (interviewId) => {
        set((state) => ({
          interviewAnalytics: {
            ...state.interviewAnalytics,
            [interviewId]: state.interviewAnalytics[interviewId]
              ? {
                  ...state.interviewAnalytics[interviewId],
                  isStale: true,
                  lastFetched: null,
                }
              : initialDataState(null),
          },
          averageScores: {
            ...state.averageScores,
            [interviewId]: state.averageScores[interviewId]
              ? {
                  ...state.averageScores[interviewId],
                  isStale: true,
                  lastFetched: null,
                }
              : initialDataState(null),
          },
        }));
      },

      // Data fetching
      fetchOverview: async (force = false) => {
        const state = get();
        const { overview, isDataStale, cacheTTL } = state;

        // Check if we need to fetch
        const needsFetch =
          force ||
          overview.isStale ||
          isDataStale(overview.lastFetched) ||
          (overview.lastFetched &&
            Date.now() - overview.lastFetched > cacheTTL);

        if (!needsFetch && !overview.isLoading) {
          return;
        }

        if (overview.isLoading) {
          return;
        }

        set((state) => ({
          overview: {
            ...state.overview,
            isLoading: true,
            error: null,
          },
        }));

        try {
          // TODO: Remove this mock data once the backend has an overview endpoint
          // For now, we'll create mock data since the backend doesn't have an overview endpoint
          // In a real implementation, this would call an analytics overview endpoint
          const mockOverview: AnalyticsOverview = {
            total_interviews: 42,
            completion_rate: 88,
            average_score: 7.2,
            candidate_satisfaction: 4.7,
            monthly_trends: [
              {
                month: "Jan",
                interviews: 12,
                completion_rate: 75,
                average_score: 6.8,
              },
              {
                month: "Feb",
                interviews: 19,
                completion_rate: 78,
                average_score: 7.0,
              },
              {
                month: "Mar",
                interviews: 18,
                completion_rate: 81,
                average_score: 7.1,
              },
              {
                month: "Apr",
                interviews: 24,
                completion_rate: 84,
                average_score: 7.2,
              },
              {
                month: "May",
                interviews: 29,
                completion_rate: 85,
                average_score: 7.3,
              },
              {
                month: "Jun",
                interviews: 31,
                completion_rate: 88,
                average_score: 7.2,
              },
            ],
            performance_distribution: [
              { name: "Excellent", value: 24, color: "#059669" },
              { name: "Good", value: 42, color: "#2563EB" },
              { name: "Average", value: 22, color: "#F59E42" },
              { name: "Below Average", value: 8, color: "#EA580C" },
              { name: "Poor", value: 4, color: "#DC2626" },
            ],
            completion_by_role: [
              { name: "Frontend Dev", rate: 92 },
              { name: "UX Designer", rate: 88 },
              { name: "Product Mgr", rate: 85 },
              { name: "DevOps Eng", rate: 79 },
              { name: "Data Scientist", rate: 84 },
              { name: "Backend Dev", rate: 89 },
            ],
          };

          set({
            overview: {
              data: mockOverview,
              isLoading: false,
              error: null,
              lastFetched: Date.now(),
              isStale: false,
            },
          });
        } catch (error) {
          console.error("❌ Analytics overview fetch failed:", error);
          set((state) => ({
            overview: {
              ...state.overview,
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to fetch analytics overview",
            },
          }));
        }
      },

      fetchInterviewAnalytics: async (interviewId, force = false) => {
        const state = get();
        const { interviewAnalytics, isDataStale, cacheTTL } = state;

        const existing = interviewAnalytics[interviewId];

        // Check if we need to fetch
        const needsFetch =
          force ||
          !existing ||
          existing.isStale ||
          isDataStale(existing.lastFetched) ||
          (existing.lastFetched &&
            Date.now() - existing.lastFetched > cacheTTL);

        if (!needsFetch && (!existing || !existing.isLoading)) {
          return;
        }

        if (existing?.isLoading) {
          return;
        }

        set((state) => ({
          interviewAnalytics: {
            ...state.interviewAnalytics,
            [interviewId]: {
              ...(state.interviewAnalytics[interviewId] ||
                initialDataState(null)),
              isLoading: true,
              error: null,
            },
          },
        }));

        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/interview/${interviewId}`
          );

          if (response.ok) {
            const data = await response.json();
            set((state) => ({
              interviewAnalytics: {
                ...state.interviewAnalytics,
                [interviewId]: {
                  data: data.analytics,
                  isLoading: false,
                  error: null,
                  lastFetched: Date.now(),
                  isStale: false,
                },
              },
            }));
          } else {
            throw new Error(
              `Failed to fetch interview analytics: ${response.status}`
            );
          }
        } catch (error) {
          console.error("❌ Interview analytics fetch failed:", error);
          set((state) => ({
            interviewAnalytics: {
              ...state.interviewAnalytics,
              [interviewId]: {
                ...(state.interviewAnalytics[interviewId] ||
                  initialDataState(null)),
                isLoading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to fetch interview analytics",
              },
            },
          }));
        }
      },

      fetchCandidateAnalytics: async (
        interviewId,
        candidateId,
        force = false
      ) => {
        const state = get();
        const { candidateAnalytics, isDataStale, cacheTTL } = state;

        const key = `${interviewId}-${candidateId}`;
        const existing = candidateAnalytics[key];

        // Check if we need to fetch
        const needsFetch =
          force ||
          !existing ||
          existing.isStale ||
          isDataStale(existing.lastFetched) ||
          (existing.lastFetched &&
            Date.now() - existing.lastFetched > cacheTTL);

        if (!needsFetch && (!existing || !existing.isLoading)) {
          return;
        }

        if (existing?.isLoading) {
          return;
        }

        set((state) => ({
          candidateAnalytics: {
            ...state.candidateAnalytics,
            [key]: {
              ...(state.candidateAnalytics[key] || initialDataState(null)),
              isLoading: true,
              error: null,
            },
          },
        }));

        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/interview/${interviewId}/candidate/${candidateId}`
          );

          if (response.ok) {
            const data = await response.json();
            set((state) => ({
              candidateAnalytics: {
                ...state.candidateAnalytics,
                [key]: {
                  data: data.analytics,
                  isLoading: false,
                  error: null,
                  lastFetched: Date.now(),
                  isStale: false,
                },
              },
            }));
          } else {
            throw new Error(
              `Failed to fetch candidate analytics: ${response.status}`
            );
          }
        } catch (error) {
          console.error("❌ Candidate analytics fetch failed:", error);
          set((state) => ({
            candidateAnalytics: {
              ...state.candidateAnalytics,
              [key]: {
                ...(state.candidateAnalytics[key] || initialDataState(null)),
                isLoading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to fetch candidate analytics",
              },
            },
          }));
        }
      },

      fetchAverageScore: async (interviewId, force = false) => {
        const state = get();
        const { averageScores, isDataStale, cacheTTL } = state;

        const existing = averageScores[interviewId];

        // Check if we need to fetch
        const needsFetch =
          force ||
          !existing ||
          existing.isStale ||
          isDataStale(existing.lastFetched) ||
          (existing.lastFetched &&
            Date.now() - existing.lastFetched > cacheTTL);

        if (!needsFetch && (!existing || !existing.isLoading)) {
          return;
        }

        if (existing?.isLoading) {
          return;
        }

        set((state) => ({
          averageScores: {
            ...state.averageScores,
            [interviewId]: {
              ...(state.averageScores[interviewId] || initialDataState(null)),
              isLoading: true,
              error: null,
            },
          },
        }));

        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/average-score/${interviewId}`
          );

          if (response.ok) {
            const data = await response.json();
            set((state) => ({
              averageScores: {
                ...state.averageScores,
                [interviewId]: {
                  data: data,
                  isLoading: false,
                  error: null,
                  lastFetched: Date.now(),
                  isStale: false,
                },
              },
            }));
          } else {
            throw new Error(
              `Failed to fetch average score: ${response.status}`
            );
          }
        } catch (error) {
          console.error("❌ Average score fetch failed:", error);
          set((state) => ({
            averageScores: {
              ...state.averageScores,
              [interviewId]: {
                ...(state.averageScores[interviewId] || initialDataState(null)),
                isLoading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to fetch average score",
              },
            },
          }));
        }
      },

      fetchOrganizationAverageScore: async (force = false) => {
        const state = get();
        const { organizationAverageScore, isDataStale, cacheTTL } = state;

        // Check if we need to fetch
        const needsFetch =
          force ||
          organizationAverageScore.isStale ||
          isDataStale(organizationAverageScore.lastFetched) ||
          (organizationAverageScore.lastFetched &&
            Date.now() - organizationAverageScore.lastFetched > cacheTTL);

        if (!needsFetch && !organizationAverageScore.isLoading) {
          return;
        }

        if (organizationAverageScore.isLoading) {
          return;
        }

        set((state) => ({
          organizationAverageScore: {
            ...state.organizationAverageScore,
            isLoading: true,
            error: null,
          },
        }));

        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/average-score`
          );

          if (response.ok) {
            const data = await response.json();
            set({
              organizationAverageScore: {
                data: { average_score: data.average_score },
                isLoading: false,
                error: null,
                lastFetched: Date.now(),
                isStale: false,
              },
            });
          } else {
            throw new Error(
              `Failed to fetch organization average score: ${response.status}`
            );
          }
        } catch (error) {
          console.error("❌ Organization average score fetch failed:", error);
          set((state) => ({
            organizationAverageScore: {
              ...state.organizationAverageScore,
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to fetch organization average score",
            },
          }));
        }
      },

      analyzeInterview: async (request) => {
        try {
          const response = await authenticatedFetch(
            `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/analytics/analyze-interview`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(request),
            }
          );

          if (response.ok) {
            const data = await response.json();
            return data.analytics;
          } else {
            throw new Error(`Failed to analyze interview: ${response.status}`);
          }
        } catch (error) {
          console.error("❌ Interview analysis failed:", error);
          return null;
        }
      },

      // Selectors
      getInterviewAnalytics: (interviewId) => {
        const { interviewAnalytics } = get();
        return interviewAnalytics[interviewId]?.data || null;
      },

      getCandidateAnalytics: (interviewId, candidateId) => {
        const { candidateAnalytics } = get();
        const key = `${interviewId}-${candidateId}`;
        return candidateAnalytics[key]?.data || null;
      },

      getAverageScore: (interviewId) => {
        const { averageScores } = get();
        return averageScores[interviewId]?.data?.average_score || null;
      },

      getOrganizationAverageScore: () => {
        const { organizationAverageScore } = get();
        return organizationAverageScore.data?.average_score || null;
      },

      getOverviewData: () => {
        const { overview } = get();
        return overview.data;
      },
    }),
    { name: "analytics-store" }
  )
);
