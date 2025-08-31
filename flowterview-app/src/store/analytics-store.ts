import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AnalyticsData {
  candidate_id: string;
  data: {
    overall_score: number;
    technical_score: number;
    communication_score: number;
    [key: string]: any;
  };
}

interface AnalyticsState {
  // Interview analytics cache
  interviewAnalytics: Record<string, AnalyticsData[]>; // interviewId -> analytics[]
  
  // Actions
  setInterviewAnalytics: (interviewId: string, analytics: AnalyticsData[]) => void;
  updateCandidateAnalytics: (interviewId: string, candidateId: string, analytics: AnalyticsData) => void;
  clearInterviewAnalytics: (interviewId: string) => void;
  clearAllAnalytics: () => void;
  
  // Helper methods
  getCandidateScore: (interviewId: string, candidateId: string) => number | null;
  hasAnalytics: (interviewId: string) => boolean;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      interviewAnalytics: {},

      setInterviewAnalytics: (interviewId: string, analytics: AnalyticsData[]) => {
        set((state) => ({
          interviewAnalytics: {
            ...state.interviewAnalytics,
            [interviewId]: analytics,
          },
        }));
      },

      updateCandidateAnalytics: (interviewId: string, candidateId: string, analytics: AnalyticsData) => {
        set((state) => {
          const currentAnalytics = state.interviewAnalytics[interviewId] || [];
          const existingIndex = currentAnalytics.findIndex(
            (a) => a.candidate_id === candidateId
          );

          let updatedAnalytics;
          if (existingIndex >= 0) {
            // Update existing
            updatedAnalytics = [...currentAnalytics];
            updatedAnalytics[existingIndex] = analytics;
          } else {
            // Add new
            updatedAnalytics = [...currentAnalytics, analytics];
          }

          return {
            interviewAnalytics: {
              ...state.interviewAnalytics,
              [interviewId]: updatedAnalytics,
            },
          };
        });
      },

      clearInterviewAnalytics: (interviewId: string) => {
        set((state) => {
          const { [interviewId]: removed, ...rest } = state.interviewAnalytics;
          return { interviewAnalytics: rest };
        });
      },

      clearAllAnalytics: () => {
        set({ interviewAnalytics: {} });
      },

      getCandidateScore: (interviewId: string, candidateId: string) => {
        const state = get();
        const analytics = state.interviewAnalytics[interviewId];
        if (!analytics) return null;

        const candidateAnalytics = analytics.find(
          (a) => a.candidate_id === candidateId
        );
        
        if (!candidateAnalytics || !candidateAnalytics.data) return null;
        
        // Handle both string and object formats
        let data = candidateAnalytics.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return null;
          }
        }
        
        return typeof data.overall_score === 'number' ? data.overall_score : null;
      },

      hasAnalytics: (interviewId: string) => {
        const state = get();
        const analytics = state.interviewAnalytics[interviewId];
        return !!(analytics && analytics.length > 0);
      },
    }),
    {
      name: 'analytics-storage',
      // Only persist the interviewAnalytics data
      partialize: (state) => ({ interviewAnalytics: state.interviewAnalytics }),
    }
  )
);
