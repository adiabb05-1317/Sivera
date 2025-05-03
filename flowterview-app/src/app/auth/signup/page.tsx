"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Sending magic link for signup...");
      // Sign up with Supabase using magic link (no password)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Using absolute URL to ensure proper redirect
          emailRedirectTo: window.location.origin + "/auth/callback",
        },
      });

      if (error) {
        console.error("Signup error:", error);
        throw error;
      }

      console.log("Magic link sent successfully for signup");
      // Show success message
      setSuccess(true);
    } catch (error: unknown) {
      console.error("Signup failed:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred during signup";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // If success, show confirmation message
  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Flowterview</h1>
            <h2 className="mt-2 text-xl font-semibold text-green-600">
              Check your email
            </h2>
            <p className="mt-4 text-gray-600">
              We&apos;ve sent a magic link to <strong>{email}</strong>. Click
              the link in the email to sign in.
            </p>
            <div className="mt-8">
              <Link
                href="/auth/login"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Flowterview</h1>
          <h2 className="mt-2 text-xl font-semibold text-gray-700">
            Create your account
          </h2>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4 rounded-md">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="name@company.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                We&apos;ll send you a magic link to sign in - no password
                needed!
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
            >
              {loading ? "Sending magic link..." : "Send magic link"}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-500">Already have an account?</span>{" "}
            <Link
              href="/auth/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
