"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SimpleLoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("Sending magic link...");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Simple redirect to home page
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (error: unknown) {
      console.error("Login error:", error);
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardClick = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        window.location.href = "/dashboard";
      } else {
        setError("Not authenticated. Please sign in first.");
      }
    } catch (error) {
      console.error("Dashboard redirect error:", error);
      setError("Failed to check authentication status");
    } finally {
      setLoading(false);
    }
  };

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
              <button
                onClick={() => setSuccess(false)}
                className="text-indigo-600 hover:text-indigo-500"
              >
                Back to login
              </button>
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
            Simple Login
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            This is a simplified login page that uses a more direct approach
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleEmailLogin}>
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
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
          </div>
        </form>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <button
            onClick={handleDashboardClick}
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go to Dashboard
          </button>
        </div>

        <div className="text-center text-sm">
          <Link
            href="/auth/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Return to Regular Login
          </Link>
        </div>
      </div>
    </div>
  );
}
