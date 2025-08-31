import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Simplified analytics store - ONLY for UI state
// Data fetching is now handled by TanStack Query (useAnalytics hook)
interface AnalyticsUIState {
  // UI-only state - view settings, filters, selections
  selectedTimeRange: "day" | "week" | "month" | "quarter" | "year";
  selectedMetric: string | null;
  showDetailedView: boolean;
  expandedSectionId: string | null;

  // Chart and visualization settings
  chartType: "line" | "bar" | "pie" | "area";
  showComparisons: boolean;
  selectedCandidateIds: string[];
  selectedInterviewIds: string[];

  // Modal and overlay states
  showExportModal: boolean;
  showConfigModal: boolean;

  // Actions for UI state only
  setSelectedTimeRange: (
    range: "day" | "week" | "month" | "quarter" | "year"
  ) => void;
  setSelectedMetric: (metric: string | null) => void;
  setShowDetailedView: (show: boolean) => void;
  setExpandedSection: (id: string | null) => void;
  setChartType: (type: "line" | "bar" | "pie" | "area") => void;
  setShowComparisons: (show: boolean) => void;
  setSelectedCandidates: (ids: string[]) => void;
  setSelectedInterviews: (ids: string[]) => void;
  setShowExportModal: (show: boolean) => void;
  setShowConfigModal: (show: boolean) => void;
  clearSelections: () => void;
}

export const useAnalyticsStore = create<AnalyticsUIState>()(
  devtools(
    (set) => ({
      // UI-only state
      selectedTimeRange: "month",
      selectedMetric: null,
      showDetailedView: false,
      expandedSectionId: null,
      chartType: "line",
      showComparisons: false,
      selectedCandidateIds: [],
      selectedInterviewIds: [],
      showExportModal: false,
      showConfigModal: false,

      // Actions for UI state only
      setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
      setSelectedMetric: (metric) => set({ selectedMetric: metric }),
      setShowDetailedView: (show) => set({ showDetailedView: show }),
      setExpandedSection: (id) => set({ expandedSectionId: id }),
      setChartType: (type) => set({ chartType: type }),
      setShowComparisons: (show) => set({ showComparisons: show }),
      setSelectedCandidates: (ids) => set({ selectedCandidateIds: ids }),
      setSelectedInterviews: (ids) => set({ selectedInterviewIds: ids }),
      setShowExportModal: (show) => set({ showExportModal: show }),
      setShowConfigModal: (show) => set({ showConfigModal: show }),
      clearSelections: () =>
        set({
          selectedCandidateIds: [],
          selectedInterviewIds: [],
          selectedMetric: null,
          expandedSectionId: null,
        }),
    }),
    {
      name: "analytics-ui-store",
    }
  )
);
