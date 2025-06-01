"use client";

import { supabase } from "./supabase";

// Cookie utility functions
export const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure=${
    window.location.protocol === "https:"
  }`;
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
  // Multiple attempts to ensure cookie is deleted
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;domain=${window.location.hostname}`;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;domain=.${window.location.hostname}`;
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
  // Fetch organization_id from backend
  let organization_id: string | null = null;

  try {
    const response = await authenticatedFetch(
      `${
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
      }/api/v1/organizations/by-user-email/${encodeURIComponent(email)}`
    );
    if (response.ok) {
      const data = await response.json();
      organization_id = data.id;
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
  console.log("Clearing user context cookies...");
  deleteCookie("user_id");
  deleteCookie("user_email");
  deleteCookie("organization_id");
  deleteCookie("user_context");

  // Clear all Supabase localStorage items
  try {
    // Clear all localStorage items that start with 'sb-' (Supabase)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`Removed Supabase storage: ${key}`);
    });
  } catch (error) {
    console.warn("Failed to clear Supabase localStorage:", error);
  }

  console.log("User context cookies cleared");
};

// Enhanced API fetch function that includes authentication headers
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const userContext = getUserContext();

  const headers = new Headers(options.headers || {});

  if (userContext) {
    headers.set("X-User-ID", userContext.user_id);
    headers.set("X-User-Email", userContext.email);
    if (userContext.organization_id) {
      headers.set("X-Organization-ID", userContext.organization_id);
    }
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  } catch (error) {
    console.warn("Failed to get session token:", error);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies in requests
  });
};

// Simple login function
export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (data?.user && !error) {
    await setUserContext(data.user.id, data.user.email!);
  }

  return { data, error };
};

// Magic link login
export const sendMagicLink = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
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

  if (data?.user && !error) {
    await setUserContext(data.user.id, data.user.email!);
  }

  return { data, error };
};

export const logout = async () => {
  console.log("Starting Supabase logout...");

  // Clear user context and all localStorage first
  clearUserContext();

  // Force Supabase logout
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    console.warn("Supabase logout error:", error);
  } else {
    console.log("Supabase logout successful");
  }

  // Double-check: Clear any remaining Supabase storage after signOut
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`Force removed remaining Supabase storage: ${key}`);
    });
  } catch (cleanupError) {
    console.warn("Failed final cleanup:", cleanupError);
  }

  return { error };
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

  if (result.data?.user && !result.error) {
    await setUserContext(result.data.user.id, result.data.user.email!);
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
      return getUserContext();
    }
  } catch (error) {
    console.warn("Failed to initialize user context:", error);
  }
  return null;
};
