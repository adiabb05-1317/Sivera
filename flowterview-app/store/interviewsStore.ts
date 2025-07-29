import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Simplified interviews store - ONLY for UI state
// Data fetching is now handled by TanStack Query (useInterviews hook)
interface InterviewsUIState {
  // UI-only state - filters, selections, modals
  selectedInterviewId: string | null;
  showCreateInterviewModal: boolean;
  showDetailsModal: boolean;
  
  // Local filters (if needed beyond TanStack Query)
  localSearchTerm: string;
  localStatusFilter: string[];
  localJobFilter: string | null;
  
  // UI state for interview management
  expandedInterviewId: string | null;
  
  // Actions for UI state only
  setSelectedInterview: (id: string | null) => void;
  setShowCreateInterviewModal: (show: boolean) => void;
  setShowDetailsModal: (show: boolean) => void;
  setLocalSearchTerm: (term: string) => void;
  setLocalStatusFilter: (statuses: string[]) => void;
  setLocalJobFilter: (jobId: string | null) => void;
  setExpandedInterview: (id: string | null) => void;
  clearFilters: () => void;
}

export const useInterviewsStore = create<InterviewsUIState>()(
  devtools(
    (set) => ({
      // UI-only state
      selectedInterviewId: null,
      showCreateInterviewModal: false,
      showDetailsModal: false,
      localSearchTerm: "",
      localStatusFilter: [],
      localJobFilter: null,
      expandedInterviewId: null,

      // Actions for UI state only
      setSelectedInterview: (id) => set({ selectedInterviewId: id }),
      setShowCreateInterviewModal: (show) => set({ showCreateInterviewModal: show }),
      setShowDetailsModal: (show) => set({ showDetailsModal: show }),
      setLocalSearchTerm: (term) => set({ localSearchTerm: term }),
      setLocalStatusFilter: (statuses) => set({ localStatusFilter: statuses }),
      setLocalJobFilter: (jobId) => set({ localJobFilter: jobId }),
      setExpandedInterview: (id) => set({ expandedInterviewId: id }),
      clearFilters: () => set({ 
        localSearchTerm: "", 
        localStatusFilter: [],
        localJobFilter: null,
        selectedInterviewId: null,
        expandedInterviewId: null
      }),
    }),
    {
      name: "interviews-ui-store",
    }
  )
);
