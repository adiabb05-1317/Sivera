import { create } from "zustand";
import { User, Organization } from "./types";
import {
  authenticatedFetch,
  getCurrentUser,
  getSession,
  clearUserContext,
} from "@/lib/auth-client";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setOrganization: (organization: Organization | null) => void;
  fetchUserProfile: () => Promise<void>;
  fetchOrganization: () => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  // Initial state - always start fresh
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: false,

  // Actions
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setOrganization: (organization) => set({ organization }),

  fetchUserProfile: async () => {
    try {
      set({ isLoading: true });

      // Get current user from Supabase
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

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
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
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
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
    }
  },

  logout: () => {
    console.log("Clearing auth state...");

    // Clear our custom cookies
    clearUserContext();

    // Clear Zustand state (no persist, so just in-memory)
    set({
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Reset store initialization state
    import("./index").then(({ resetInitialization }) => {
      resetInitialization();
    });

    console.log("Auth state cleared");
  },

  initialize: async () => {
    try {
      const { session } = await getSession();
      if (session?.user) {
        // Always fetch fresh user data
        await get().fetchUserProfile();
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
