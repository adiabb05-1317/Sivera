import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Simplified jobs store - ONLY for UI state
// Data fetching is now handled by TanStack Query (useJobs hook)
interface JobsUIState {
  // UI-only state
  selectedJobId: string | null;
  showCreateJobModal: boolean;
  showEditJobModal: boolean;
  
  // Local UI filters
  localSearchTerm: string;
  localStatusFilter: string[];
  
  // Actions for UI state only
  setSelectedJob: (id: string | null) => void;
  setShowCreateJobModal: (show: boolean) => void;
  setShowEditJobModal: (show: boolean) => void;
  setLocalSearchTerm: (term: string) => void;
  setLocalStatusFilter: (statuses: string[]) => void;
  clearFilters: () => void;
}

export const useJobsStore = create<JobsUIState>()(
  devtools(
    (set) => ({
      // UI-only state
      selectedJobId: null,
      showCreateJobModal: false,
      showEditJobModal: false,
      localSearchTerm: "",
      localStatusFilter: [],

      // Actions for UI state only
      setSelectedJob: (id) => set({ selectedJobId: id }),
      setShowCreateJobModal: (show) => set({ showCreateJobModal: show }),
      setShowEditJobModal: (show) => set({ showEditJobModal: show }),
      setLocalSearchTerm: (term) => set({ localSearchTerm: term }),
      setLocalStatusFilter: (statuses) => set({ localStatusFilter: statuses }),
      clearFilters: () => set({ 
        localSearchTerm: "", 
        localStatusFilter: [],
        selectedJobId: null 
      }),
    }),
    {
      name: "jobs-ui-store",
    }
  )
);