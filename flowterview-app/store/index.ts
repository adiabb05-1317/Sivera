// Import stores
import { useAuthStore } from "./authStore";
import { useCandidatesStore } from "./candidatesStore";
import { useJobsStore } from "./jobsStore";
import { useInterviewsStore } from "./interviewsStore";
import { useAnalyticsStore } from "./analyticsStore";

// Main store exports
export { useAuthStore } from "./authStore";
export { useCandidatesStore } from "./candidatesStore";
export { useJobsStore } from "./jobsStore";
export { useInterviewsStore } from "./interviewsStore";
export { useAnalyticsStore } from "./analyticsStore";

// Type exports
export type * from "./types";

// Production-ready cache management
interface CacheState {
  hasInitialized: boolean;
  lastFullSync: number;
  user_id: string | null;
}

const CACHE_KEY = 'sivera_app_cache';
const FULL_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

// Store initialization state with persistence
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

// Cache utilities for production performance
const getCacheState = (): CacheState => {
  if (typeof window === 'undefined') return { hasInitialized: false, lastFullSync: 0, user_id: null };
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : { hasInitialized: false, lastFullSync: 0, user_id: null };
  } catch {
    return { hasInitialized: false, lastFullSync: 0, user_id: null };
  }
};

const setCacheState = (state: CacheState) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save cache state:', error);
  }
};

const shouldForceRefresh = (currentUserId: string): boolean => {
  const cache = getCacheState();
  const now = Date.now();
  
  // Force refresh if:
  // 1. Different user logged in
  // 2. Never synced before
  // 3. Last sync was more than FULL_SYNC_INTERVAL ago
  return (
    cache.user_id !== currentUserId ||
    !cache.hasInitialized ||
    (now - cache.lastFullSync) > FULL_SYNC_INTERVAL
  );
};

const isDataStale = (): boolean => {
  const cache = getCacheState();
  const now = Date.now();
  return (now - cache.lastFullSync) > STALE_THRESHOLD;
};

// Helper to wait for authentication to be ready
const waitForAuthReady = async (maxWaitMs = 10000): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const authState = useAuthStore.getState();

    if (!authState.isLoading) {
      return authState.isAuthenticated;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.warn("⚠️ Auth readiness timeout, proceeding anyway");
  return useAuthStore.getState().isAuthenticated;
};

export const initializeStores = async (force = false) => {
  // Return existing promise if already initializing
  if (isInitializing && initializationPromise && !force) {
    return initializationPromise;
  }

  isInitializing = true;

  initializationPromise = (async () => {
    const authStore = useAuthStore.getState();

    try {
      // Initialize auth first and wait for it to complete
      await authStore.initialize();

      // Wait for auth to be ready (either authenticated or definitively not)
      const isAuthenticated = await waitForAuthReady();

      if (isAuthenticated) {
        const authState = useAuthStore.getState();
        const currentUserId = authState.user?.id;
        
        if (!currentUserId) {
          console.warn("⚠️ No user ID available, skipping data fetch");
          return;
        }

        const cache = getCacheState();
        const needsRefresh = force || shouldForceRefresh(currentUserId);
        
        // Show what we're doing for debugging
        console.log(`🔄 Store initialization: ${needsRefresh ? 'FETCHING' : 'USING_CACHE'} (force: ${force})`);

        if (needsRefresh) {

          console.log("📡 Fetching fresh data from all APIs...");
          
          await Promise.all([
            
          ]).catch(console.error);

          // Update cache state after successful fetch
          setCacheState({
            hasInitialized: true,
            lastFullSync: Date.now(),
            user_id: currentUserId
          });
          
          console.log("✅ Fresh data loaded and cached");
        } else {
          console.log("⚡ Using cached data, skipping API calls");
          
          // Still check if we need background refresh for stale data
          if (isDataStale()) {
            console.log("🔄 Background refresh triggered for stale data");
            
            // Non-blocking background refresh
            setTimeout(() => {
              initializeStores(true).catch(console.error);
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error initializing stores:", error);
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

// Reset initialization state (useful for testing or logout)
export const resetInitialization = () => {
  isInitializing = false;
  initializationPromise = null;
  
  // Clear cache on logout/reset
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log("🧹 Cache cleared on reset");
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }
};
