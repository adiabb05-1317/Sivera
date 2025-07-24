"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Using the environment variable for production
          emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
            ? process.env.NEXT_PUBLIC_SITE_URL
            : window.location.origin,
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-app-blue-100 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 p-4">
        <Card className="w-[450px] dark:bg-zinc-900 dark:border-zinc-700">
          <CardHeader className="flex flex-col items-center justify-center">
            <CardTitle className="tracking-widest text-2xl">
              <div
                className="text-2xl font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-800 text-transparent bg-clip-text dark:from-app-blue-200 dark:via-blue-400 dark:to-white"
                style={{
                  fontFamily: "KyivType Sans",
                }}
              >
                SIVERA
              </div>
            </CardTitle>
            <CardDescription className="dark:text-gray-300">
              Check your email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              We&apos;ve sent a magic link to <strong>{email}</strong>. Click
              the link in the email to sign in.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col items-center">
            <Button
              className="cursor-pointer text-xs"
              variant="outline"
              onClick={() => setSuccess(false)}
            >
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-app-blue-100 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 p-4">
      <Card className="w-[450px] dark:bg-zinc-900 dark:border-zinc-700">
        <CardHeader className="flex flex-col items-center justify-center">
          <CardTitle className="tracking-widest text-2xl">
            <div
              className="text-2xl font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-800 text-transparent bg-clip-text dark:from-app-blue-200 dark:via-blue-400 dark:to-white"
              style={{
                fontFamily: "KyivType Sans",
              }}
            >
              SIVERA
            </div>
          </CardTitle>
          <CardDescription className="dark:text-gray-300">
            Simple Login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-300 text-center">
            This is a simplified login page that uses a more direct approach
          </p>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300 mb-4">
              {error}
            </div>
          )}
          <form className="space-y-6 mt-4" onSubmit={handleEmailLogin}>
            <div className="flex flex-col space-y-1.5 text-sm">
              <label htmlFor="email" className="dark:text-gray-200">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="dark:bg-zinc-800 dark:text-gray-100 dark:border-zinc-700"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="cursor-pointer text-xs"
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
          <div className="mt-4 border-t border-gray-200 dark:border-zinc-700 pt-4">
            <Button
              className="cursor-pointer text-xs"
              variant="outline"
              onClick={handleDashboardClick}
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <Link
            href="/auth/login"
            className="font-medium text-app-blue-600 hover:text-app-blue-500 dark:text-app-blue-400 dark:hover:text-app-blue-300"
          >
            Return to Regular Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
