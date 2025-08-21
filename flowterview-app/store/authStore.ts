import { create } from "zustand";
import { User, Organization } from "./types";
import { 
  clearUserContext,
  getSession 
} from "@/lib/auth-client";
import { Session } from "@supabase/supabase-js";

// Simplified auth store - Core auth state only
// User profile and organization data fetching handled by TanStack Query
interface AuthState {
  // Core auth state
  user: User | null;
  organization: Organization | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // UI state
  showCompanySetupModal: boolean;
  showUserSetupModal: boolean;

  // Actions - simplified to core auth operations only
  setUser: (user: User | null) => void;
  setOrganization: (organization: Organization | null) => void;
  setSession: (session: Session | null) => void;
  setShowCompanySetupModal: (show: boolean) => void;
  setShowUserSetupModal: (show: boolean) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  // Initial state - always start fresh
  user: null,
  organization: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  showCompanySetupModal: false,
  showUserSetupModal: false,

  // Actions - core auth operations only
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setOrganization: (organization) => set({ organization }),

  setSession: (session) => set({ session }),

  setShowCompanySetupModal: (show) => set({ showCompanySetupModal: show }),

  setShowUserSetupModal: (show) => set({ showUserSetupModal: show }),

  logout: () => {
    // Clear our custom cookies
    clearUserContext();

    // Clear Zustand state (no persist, so just in-memory)
    set({
      user: null,
      organization: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      showCompanySetupModal: false,
      showUserSetupModal: false,
    });

    // Reset store initialization state
    import("./index").then(({ resetInitialization }) => {
      resetInitialization();
    });
  },

  initialize: async () => {
    try {
      set({ isLoading: true });
      const { session } = await getSession();

      // Store the session in Zustand
      set({ session });

      if (session?.user) {
        set({ isAuthenticated: true });
        // Note: User profile and organization data will be fetched by React Query hooks
      } else {
        set({ isAuthenticated: false });
      }
    } catch (error) {
      // Error initializing auth
      set({ isAuthenticated: false, session: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));
