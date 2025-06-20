import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { authenticatedFetch } from "@/lib/auth-client";

interface DashboardStats {
  activeInterviews: number;
  totalCandidates: number;
  completionRate: string;
}

interface RecentInterview {
  id: string;
  title: string;
  status: string;
  candidates: number;
  date: string;
  job_id: string;
}

interface DashboardData {
  stats: DashboardStats;
  recentInterviews: RecentInterview[];
}

interface DataState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  isStale: boolean;
}

interface DashboardState {
  dashboard: DataState<DashboardData>;
  cacheTTL: number; // 2 minutes for dashboard
  staleTime: number; // 30 seconds

  // Actions
  fetchDashboardData: (force?: boolean) => Promise<void>;
  invalidateCache: () => void;
  isDataStale: (lastFetched: number | null) => boolean;
}

const initialDashboardData: DashboardData = {
  stats: {
    activeInterviews: 0,
    totalCandidates: 0,
    completionRate: "0%",
  },
  recentInterviews: [],
};

const initialDataState = <T>(initialData: T): DataState<T> => ({
  data: initialData,
  isLoading: false,
  error: null,
  lastFetched: null,
  isStale: true,
});

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      dashboard: initialDataState<DashboardData>(initialDashboardData),
      cacheTTL: 2 * 60 * 1000, // 2 minutes
      staleTime: 30 * 1000, // 30 seconds

      isDataStale: (lastFetched) => {
        if (!lastFetched) return true;
        const { staleTime } = get();
        return Date.now() - lastFetched > staleTime;
      },

      invalidateCache: () => {
        set((state) => ({
          dashboard: {
            ...state.dashboard,
            isStale: true,
            lastFetched: null,
          },
        }));
      },

      fetchDashboardData: async (force = false) => {
        const state = get();
        const { dashboard, isDataStale, cacheTTL } = state;

        // Check if we need to fetch
        const needsFetch =
          force ||
          dashboard.isStale ||
          isDataStale(dashboard.lastFetched) ||
          (dashboard.lastFetched &&
            Date.now() - dashboard.lastFetched > cacheTTL);

        if (!needsFetch && !dashboard.isLoading) {
          return;
        }

        // Try to load from localStorage first for instant display
        if (!force && dashboard.isStale) {
          try {
            const cached = localStorage.getItem("dashboard-cache");
            if (cached) {
              const { data, timestamp } = JSON.parse(cached);
              // Use cached data if it's less than 5 minutes old
              if (Date.now() - timestamp < 5 * 60 * 1000) {
                set({
                  dashboard: {
                    data,
                    isLoading: true, // Still loading fresh data in background
                    error: null,
                    lastFetched: timestamp,
                    isStale: false,
                  },
                });
              }
            }
          } catch (error) {
            console.log("Failed to load dashboard cache:", error);
          }
        }

        set((state) => ({
          dashboard: {
            ...state.dashboard,
            isLoading: true,
            error: null,
          },
        }));

        try {
          // Try optimized endpoints first, fallback to existing ones
          let stats: DashboardStats;
          let recentInterviews: RecentInterview[];

          try {
            // Try optimized dashboard endpoints
            const [statsResponse, recentInterviewsResponse] = await Promise.all(
              [
                authenticatedFetch(
                  `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/dashboard/stats`
                ),
                authenticatedFetch(
                  `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/dashboard/recent-interviews?limit=4`
                ),
              ]
            );

            if (statsResponse.ok && recentInterviewsResponse.ok) {
              [stats, recentInterviews] = await Promise.all([
                statsResponse.json(),
                recentInterviewsResponse.json(),
              ]);
            } else {
              throw new Error("Optimized endpoints not available");
            }
          } catch (error) {
            console.log("Using fallback data fetching");
            // Fallback to existing endpoints
            const [candidatesResponse, interviewsResponse] = await Promise.all([
              authenticatedFetch(
                `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/candidates/by-job`
              ),
              authenticatedFetch(
                `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews`
              ),
            ]);

            if (!candidatesResponse.ok || !interviewsResponse.ok) {
              throw new Error("Failed to fetch fallback data");
            }

            const [candidatesData, interviewsData] = await Promise.all([
              candidatesResponse.json(),
              interviewsResponse.json(),
            ]);

            // Calculate stats from raw data
            const candidatesArray = Object.values(
              candidatesData
            ).flat() as any[];
            const activeInterviews = interviewsData.filter(
              (i: any) => i.status === "active"
            );

            stats = {
              activeInterviews: activeInterviews.length,
              totalCandidates: candidatesArray.length,
              completionRate: "92%", // Placeholder calculation
            };

            recentInterviews = interviewsData
              .slice(0, 4)
              .map((interview: any) => ({
                id: interview.id,
                title: interview.title,
                status: interview.status,
                candidates: interview.candidates_invited?.length || 0,
                date: new Date(interview.created_at).toLocaleDateString(),
                job_id: interview.job_id,
              }));
          }

          const dashboardData: DashboardData = {
            stats,
            recentInterviews,
          };

          set({
            dashboard: {
              data: dashboardData,
              isLoading: false,
              error: null,
              lastFetched: Date.now(),
              isStale: false,
            },
          });

          // Cache the data in localStorage for faster subsequent loads
          try {
            localStorage.setItem(
              "dashboard-cache",
              JSON.stringify({
                data: dashboardData,
                timestamp: Date.now(),
              })
            );
          } catch (error) {
            console.log("Failed to cache dashboard data:", error);
          }
        } catch (error) {
          set((state) => ({
            dashboard: {
              ...state.dashboard,
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to fetch dashboard data",
            },
          }));
        }
      },
    }),
    {
      name: "dashboard-store",
    }
  )
);
