import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Simplified candidates store - ONLY for UI state
// Data fetching is now handled by TanStack Query (useCandidates hook)
interface CandidatesUIState {
  // UI-only state - filters, selections, etc.
  selectedCandidateId: string | null;
  showAddCandidateModal: boolean;
  showBulkImportModal: boolean;
  
  // Local filters (if needed beyond TanStack Query)
  localSearchTerm: string;
  localStatusFilter: string[];
  
  // Actions for UI state only
  setSelectedCandidate: (id: string | null) => void;
  setShowAddCandidateModal: (show: boolean) => void;
  setShowBulkImportModal: (show: boolean) => void;
  setLocalSearchTerm: (term: string) => void;
  setLocalStatusFilter: (statuses: string[]) => void;
  clearFilters: () => void;
}

export const useCandidatesStore = create<CandidatesUIState>()(
  devtools(
    (set) => ({
      // UI-only state
      selectedCandidateId: null,
      showAddCandidateModal: false,
      showBulkImportModal: false,
      localSearchTerm: "",
      localStatusFilter: [],

      // Actions for UI state only
      setSelectedCandidate: (id) => set({ selectedCandidateId: id }),
      setShowAddCandidateModal: (show) => set({ showAddCandidateModal: show }),
      setShowBulkImportModal: (show) => set({ showBulkImportModal: show }),
      setLocalSearchTerm: (term) => set({ localSearchTerm: term }),
      setLocalStatusFilter: (statuses) => set({ localStatusFilter: statuses }),
      clearFilters: () => set({ 
        localSearchTerm: "", 
        localStatusFilter: [],
        selectedCandidateId: null 
      }),
    }),
    {
      name: "candidates-ui-store",
    }
  )
);