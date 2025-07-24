"use client";

import { supabase } from "./supabase";
import { config } from "./config";

// Store imports for cache invalidation
let useCandidatesStore: any = null;
let useInterviewsStore: any = null;
let useJobsStore: any = null;
let useAuthStore: any = null;

// Lazy loading function for stores to avoid circular dependencies
const getStores = async () => {
  if (
    !useCandidatesStore ||
    !useInterviewsStore ||
    !useJobsStore ||
    !useAuthStore
  ) {
    const [candidatesModule, interviewsModule, jobsModule, authModule] =
      await Promise.all([
        import("../../store/candidatesStore"),
        import("../../store/interviewsStore"),
        import("../../store/jobsStore"),
        import("../../store/authStore"),
      ]);

    useCandidatesStore = candidatesModule.useCandidatesStore;
    useInterviewsStore = interviewsModule.useInterviewsStore;
    useJobsStore = jobsModule.useJobsStore;
    useAuthStore = authModule.useAuthStore;
  }

  return { useCandidatesStore, useInterviewsStore, useJobsStore, useAuthStore };
};

// Cache invalidation helper with cross-store coordination
const invalidateRelevantCaches = async (url: string, method: string) => {
  try {
    const {
      useCandidatesStore,
      useInterviewsStore,
      useJobsStore,
      useAuthStore,
    } = await getStores();

    // Get store instances
    const candidatesStore = useCandidatesStore.getState();
    const interviewsStore = useInterviewsStore.getState();
    const jobsStore = useJobsStore.getState();
    const authStore = useAuthStore.getState();

    // Advanced invalidation with cross-store coordination
    if (url.includes("/candidates")) {
      candidatesStore.invalidateCache();
      
      // Candidates affect interview counts and analytics
      if (method === "POST" || method === "PATCH") {
        interviewsStore.invalidateCache();
        
        // Try to invalidate analytics store if available
        try {
          const { useAnalyticsStore } = await import("../../store/analyticsStore");
          useAnalyticsStore.getState().invalidateCache();
        } catch (error) {
          console.warn("Analytics store not available for invalidation");
        }
      }
    }

    if (url.includes("/interviews")) {
      interviewsStore.invalidateCache();
      const interviewIdMatch = url.match(/\/interviews\/([^/?]+)/);
      if (interviewIdMatch) {
        interviewsStore.invalidateInterviewDetails(interviewIdMatch[1]);
      }
      
      // Interviews affect candidate data and analytics
      candidatesStore.invalidateCache();
      
      try {
        const { useAnalyticsStore } = await import("../../store/analyticsStore");
        useAnalyticsStore.getState().invalidateCache();
      } catch (error) {
        console.warn("Analytics store not available for invalidation");
      }
    }

    if (url.includes("/jobs")) {
      jobsStore.invalidateCache();
      
      // Jobs affect candidates and interviews
      candidatesStore.invalidateCache();
      interviewsStore.invalidateCache();
    }

    if (url.includes("/users") || url.includes("/organizations")) {
      // Refetch user profile and organization data
      authStore.fetchUserProfile();
    }

    // Global invalidation for certain operations
    if (url.includes("/status") || url.includes("/bulk") || url.includes("/invite")) {
      candidatesStore.invalidateCache();
      interviewsStore.invalidateCache();
      
      try {
        const { useAnalyticsStore } = await import("../../store/analyticsStore");
        useAnalyticsStore.getState().invalidateCache();
      } catch (error) {
        console.warn("Analytics store not available for invalidation");
      }
    }

    console.log("🔄 Cache invalidated for:", url, "method:", method);
  } catch (error) {
    console.warn("⚠️ Failed to invalidate caches:", error);
  }
};

// Cookie utility functions
export const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  let cookieString = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=${config.auth.cookieSameSite}`;

  if (config.auth.cookieSecure) {
    cookieString += ";Secure";
  }

  if (config.auth.cookieDomain) {
    cookieString += `;Domain=${config.auth.cookieDomain}`;
  }

  document.cookie = cookieString;
};

export const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return;
  
  // Multiple attempts to ensure cookie is deleted across different configurations
  const expiredDate = "Thu, 01 Jan 1970 00:00:01 GMT";

  // Delete without domain
  document.cookie = `${name}=;expires=${expiredDate};path=/`;

  // Delete with current hostname
  document.cookie = `${name}=;expires=${expiredDate};path=/;domain=${window.location.hostname}`;

  // Delete with dot-prefixed hostname
  document.cookie = `${name}=;expires=${expiredDate};path=/;domain=.${window.location.hostname}`;

  // Delete with production domain if applicable
  if (config.auth.cookieDomain) {
    document.cookie = `${name}=;expires=${expiredDate};path=/;domain=${config.auth.cookieDomain}`;
  }

  // Extra cleanup for stubborn cookies
  const cookieVariations = [
    `${name}=; path=/; expires=${expiredDate}`,
    `${name}=; path=/; domain=${window.location.hostname}; expires=${expiredDate}`,
    `${name}=; path=/; domain=.${window.location.hostname}; expires=${expiredDate}`,
  ];

  if (config.auth.cookieDomain) {
    cookieVariations.push(
      `${name}=; path=/; domain=${config.auth.cookieDomain}; expires=${expiredDate}`
    );
  }

  cookieVariations.forEach(cookieString => {
    document.cookie = cookieString;
  });
};

// User context interface
export interface UserContext {
  user_id: string;
  email: string;
  organization_id: string | null;
}

// Set user context in cookies
export const setUserContext = async (
  user_id: string,
  email: string
): Promise<UserContext> => {
  // Fetch organization_id from backend using regular fetch (no auth needed for org lookup)
  let organization_id: string | null = null;

  try {
    const response = await authenticatedFetch(
      `${
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
      }/api/v1/organizations/by-user-email/${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      },
      false
    );
    if (response.ok) {
      const data = await response.json();
      organization_id = data.id;
    } else {
      console.warn(
        `Failed to fetch organization for ${email}: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.warn("Failed to fetch organization_id:", error);
  }

  const userContext: UserContext = {
    user_id,
    email,
    organization_id,
  };

  // Store in cookies
  setCookie("user_id", user_id);
  setCookie("user_email", email);
  if (organization_id) {
    setCookie("organization_id", organization_id);
  }

  // Store as JSON for easy retrieval
  setCookie("user_context", JSON.stringify(userContext));

  return userContext;
};

// Get user context from cookies
export const getUserContext = (): UserContext | null => {
  try {
    const contextStr = getCookie("user_context");
    if (contextStr) {
      return JSON.parse(contextStr);
    }

    // Fallback to individual cookies
    const user_id = getCookie("user_id");
    const email = getCookie("user_email");
    const organization_id = getCookie("organization_id");

    if (user_id && email) {
      return { user_id, email, organization_id };
    }
  } catch (error) {
    console.warn("Failed to parse user context from cookies:", error);
  }

  return null;
};

// Clear user context from cookies
export const clearUserContext = () => {
  console.log("🧹 Clearing user context...");
  
  if (typeof window === 'undefined') {
    console.warn("Cannot clear cookies on server side");
    return;
  }
  
  // Delete our custom cookies
  deleteCookie("user_id");
  deleteCookie("user_email");
  deleteCookie("organization_id");
  deleteCookie("user_context");
  
  // Get all existing cookies and delete them
  const allCookies = document.cookie.split(';');
  console.log("🍪 Found cookies to clear:", allCookies.length);
  
  allCookies.forEach(cookie => {
    const cookieName = cookie.split('=')[0].trim();
    if (cookieName) {
      // Delete all cookies, especially Supabase ones
      deleteCookie(cookieName);
      
      // Extra aggressive deletion for Supabase cookies
      if (cookieName.startsWith('sb-')) {
        // Try multiple deletion methods for stubborn Supabase cookies
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        if (config.auth.cookieDomain) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${config.auth.cookieDomain}`;
        }
      }
    }
  });
  
  // Clear all storage
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log("✅ Storage cleared");
  } catch (error) {
    console.warn("Storage clear error:", error);
  }
  
  // Verify cookies are cleared
  const remainingCookies = document.cookie.split(';').filter(c => c.trim()).length;
  console.log("🔍 Remaining cookies after clear:", remainingCookies);
  
  if (remainingCookies > 0) {
    console.warn("⚠️ Some cookies may not have been cleared:", document.cookie);
  } else {
    console.log("✅ All cookies successfully cleared");
  }
};

// Enhanced API fetch function that includes authentication headers
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {},
  reload: boolean = true
): Promise<Response> => {
  const userContext = getUserContext();

  // Only log for critical auth issues to reduce noise
  if (!userContext) {
    console.warn(
      "⚠️ No user context found for authenticated request to:",
      url.replace(process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "", "[BACKEND]")
    );
  }

  const headers = new Headers(options.headers || {});

  if (userContext) {
    headers.set("X-User-ID", userContext.user_id);
    headers.set("X-User-Email", userContext.email);
    if (userContext.organization_id) {
      headers.set("X-Organization-ID", userContext.organization_id);
    }
  }

  // Get session from Zustand store instead of calling getSession()
  try {
    // Dynamically import to avoid circular dependency
    const { useAuthStore } = await import("../../store/authStore");
    const session = useAuthStore.getState().session;

    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    } else if (!userContext) {
      console.warn("⚠️ No session token or user context available");
    }
  } catch (error) {
    console.warn("❌ Failed to get session from store:", error);
    // Continue without session token - user context headers should be sufficient
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies in requests
  });

  // Log errors or empty responses for debugging
  if (!response.ok) {
    console.error("📡 API Error:", {
      url: url.replace(
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "",
        "[BACKEND]"
      ),
      status: response.status,
      statusText: response.statusText,
    });
  }

  // Invalidate relevant caches after successful POST, PUT, or PATCH requests
  const method = (options.method || "GET").toUpperCase();
  if (
    response.ok &&
    (method === "POST" || method === "PUT" || method === "PATCH") &&
    reload
  ) {
    // Run cache invalidation asynchronously to avoid blocking the response
    invalidateRelevantCaches(url, method).catch((error) => {
      console.warn("Cache invalidation failed:", error);
    });
  }

  return response;
};

// Simple login function
export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (data?.user && data?.session && !error) {
    await setUserContext(data.user.id, data.user.email!);

    // Store session in Zustand store
    try {
      const { useAuthStore } = await import("../../store/authStore");
      useAuthStore.getState().setSession(data.session);
    } catch (storeError) {
      console.warn("Failed to store session in Zustand:", storeError);
    }
  }

  return { data, error };
};

// Helper function to get the correct site URL for production environments
const getSiteURL = () => {
  // In production, use the environment variable
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Fallback to window.location.origin for development
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Default fallback
  return "https://recruiter.sivera.io";
};

// Magic link login
export const sendMagicLink = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteURL()}/auth/callback`,
    },
  });

  return { data, error };
};

// Simple signup function
export const signup = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (data?.user && data?.session && !error) {
    await setUserContext(data.user.id, data.user.email!);

    // Store session in Zustand store
    try {
      const { useAuthStore } = await import("../../store/authStore");
      useAuthStore.getState().setSession(data.session);
    } catch (storeError) {
      console.warn("Failed to store session in Zustand:", storeError);
    }
  }

  return { data, error };
};

export const logout = async () => {
  console.log("🚪 Starting logout process...");
  
  try {
    // 1. Supabase logout (this should clear all sb-* localStorage)
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("Supabase logout error:", error);
    }

    // 2. Clear our custom cookies
    clearUserContext();

    // 3. Clear all localStorage data
    if (typeof window !== 'undefined') {
      // Clear all localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
    }

    // 4. Clear session from Zustand store and reset all stores
    try {
      const [
        { useAuthStore },
        { useCandidatesStore },
        { useInterviewsStore },
        { useJobsStore },
        { useAnalyticsStore },
        { resetInitialization }
      ] = await Promise.all([
        import("../../store/authStore"),
        import("../../store/candidatesStore"),
        import("../../store/interviewsStore"),
        import("../../store/jobsStore"),
        import("../../store/analyticsStore"),
        import("../../store").then(m => ({ resetInitialization: m.resetInitialization }))
      ]);

      // Clear all store states
      useAuthStore.getState().logout();
      useCandidatesStore.getState().invalidateCache();
      useInterviewsStore.getState().invalidateCache();
      useJobsStore.getState().invalidateCache();
      useAnalyticsStore.getState().invalidateCache();
      
      // Reset store initialization
      resetInitialization();
      
    } catch (storeError) {
      console.warn("Failed to clear stores:", storeError);
    }

    console.log("✅ Logout completed successfully");
    return { error: null };

  } catch (logoutError) {
    console.error("❌ Logout process failed:", logoutError);
    
    // Even if logout fails, clear what we can
    clearUserContext();
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    return { error: logoutError };
  }
};

// Get current user
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user;
};

// Get and refresh session
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
};

export const setSessionFromTokens = async (
  accessToken: string,
  refreshToken?: string
) => {
  const result = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || "",
  });

  if (result.data?.user && result.data?.session && !result.error) {
    await setUserContext(result.data.user.id, result.data.user.email!);

    // Store session in Zustand store
    try {
      const { useAuthStore } = await import("../../store/authStore");
      useAuthStore.getState().setSession(result.data.session);
    } catch (storeError) {
      console.warn("Failed to store session in Zustand:", storeError);
    }
  }

  return result;
};

export const initializeUserContext = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await setUserContext(session.user.id, session.user.email!);

      // Store session in Zustand store
      try {
        const { useAuthStore } = await import("../../store/authStore");
        useAuthStore.getState().setSession(session);
      } catch (storeError) {
        console.warn("Failed to store session in Zustand:", storeError);
      }

      return getUserContext();
    }
  } catch (error) {
    console.warn("Failed to initialize user context:", error);
  }
  return null;
};
