import { create } from "zustand";
import { User, Organization } from "./types";
import {
  authenticatedFetch,
  getCurrentUser,
  getSession,
  clearUserContext,
} from "@/lib/auth-client";
import { Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showCompanySetupModal: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setOrganization: (organization: Organization | null) => void;
  setSession: (session: Session | null) => void;
  setShowCompanySetupModal: (show: boolean) => void;
  fetchUserProfile: () => Promise<void>;
  fetchOrganization: () => Promise<void>;
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

  // Actions
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setOrganization: (organization) => set({ organization }),

  setSession: (session) => set({ session }),

  setShowCompanySetupModal: (show) => set({ showCompanySetupModal: show }),

  fetchUserProfile: async () => {
    try {
      set({ isLoading: true });

      // Get current user from Supabase
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Ensure user context is set in cookies for authenticatedFetch
      const authClient = await import("@/lib/auth-client");
      await authClient.setUserContext(currentUser.id, currentUser.email!);

      // Fetch user profile from backend
      const response = await authenticatedFetch(
        `${
          process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
        }/api/v1/users?email=${encodeURIComponent(currentUser.email!)}`
      );

      if (response.ok) {
        const userData = await response.json();
        if (Array.isArray(userData) && userData.length > 0) {
          const user = userData[0] as User;
          set({
            user,
            isAuthenticated: true,
          });

          // Fetch organization if user has organization_id
          if (user.organization_id) {
            get().fetchOrganization();
          }
        } else {
          console.warn("⚠️ No user data found in response");
          set({ user: null, isAuthenticated: false });
        }
      } else {
        console.error("❌ Failed to fetch user profile:", response.status);
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error("❌ Error fetching user profile:", error);
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchOrganization: async () => {
    try {
      const { user } = get();
      if (!user?.organization_id) return;

      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/organizations/${user.organization_id}`
      );

      if (response.ok) {
        const organization = await response.json();
        set({ organization });

        // Check if organization name is empty and show modal if needed
        if (!organization?.name || organization.name.trim() === "") {
          set({ showCompanySetupModal: true });
        }
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
    }
  },

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
    });

    // Reset store initialization state
    import("./index").then(({ resetInitialization }) => {
      resetInitialization();
    });
  },

  initialize: async () => {
    try {
      const { session } = await getSession();

      // Store the session in Zustand
      set({ session });

      if (session?.user) {
        // Always fetch fresh user data
        await get().fetchUserProfile();
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error("❌ Error initializing auth:", error);
      set({ isAuthenticated: false, isLoading: false, session: null });
    }
  },
}));
