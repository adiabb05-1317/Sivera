"use client";

import { supabase } from "./supabase";

// Simple login function
export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

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

  return { data, error };
};

// Simple logout function
export const logout = async () => {
  const { error } = await supabase.auth.signOut();
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

// Set session from tokens (useful for auth callback)
export const setSessionFromTokens = async (
  accessToken: string,
  refreshToken?: string
) => {
  return await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || "",
  });
};
