"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { FloatingPaths } from "@/components/ui/background-paths";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@radix-ui/react-label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        console.log("User is already logged in, redirecting to dashboard...");
        router.push("/dashboard");
      }
      setSessionLoading(false);
    };

    checkSession();
  }, [router]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // If password provided, do password login
      if (password && password.trim() !== "") {
        console.log("Attempting password login...");
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        console.log("Login successful, redirecting...");
        // Hard redirect to dashboard
        window.location.href = "/dashboard";
        return;
      }

      // If no password, send magic link
      console.log("Sending magic link...");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Using absolute URL to ensure proper redirect
          emailRedirectTo: window.location.origin + "/auth/callback",
        },
      });

      if (error) {
        throw error;
      }

      console.log("Magic link sent successfully");
      setMagicLinkSent(true);
    } catch (error: unknown) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred during login";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <FloatingPaths position={-1} className="inset-0 opacity-30" />
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg flex flex-col items-center justify-center">
          <div className="text-2xl font-medium tracking-widest bg-gradient-to-br from-indigo-400/50 via-indigo-600/70 to-indigo-800 text-transparent bg-clip-text">
            FLOWTERVIEW
          </div>
          <div className="text-center">
            <p className="mt-4 text-gray-600">Loading...</p>
            <div className="mt-6 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <FloatingPaths position={-1} className="inset-0 opacity-30" />
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="text-2xl font-medium tracking-widest bg-gradient-to-br from-indigo-400/50 via-indigo-600/70 to-indigo-800 text-transparent bg-clip-text">
              FLOWTERVIEW
            </div>
            <p className="mt-4 text-gray-600">
              We&apos;ve sent a magic link to <strong>{email}</strong>. Click
              the link in the email to sign in.
            </p>
            <div className="mt-8">
              <Button variant="outline" onClick={() => setMagicLinkSent(false)}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-t from-indigo-50/20 to-indigo-300/30 p-4">
      <FloatingPaths position={-1} className="inset-0 opacity-30" />
      <Card className="w-[450px]">
        <CardHeader className="flex flex-col items-center justify-center">
          <CardTitle className="tracking-widest text-2xl">
            <div className="text-2xl font-medium tracking-widest bg-gradient-to-br from-indigo-400/50 via-indigo-600/70 to-indigo-800 text-transparent bg-clip-text">
              FLOWTERVIEW
            </div>
          </CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5 text-sm">
                <Label htmlFor="name">Email address</Label>
                <Input
                  id="name"
                  placeholder="email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1.5 text-sm">
                <Label htmlFor="name">Password (optional)</Label>
                <Input
                  id="password"
                  placeholder="Leave empty to use magic link"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between flex-col gap-5 p-2">
          <div className="flex self-start text-sm">
            <Link
              href="/auth/forgot-password"
              className="font-medium text-indigo-600 hover:text-indigo-500 ml-5"
            >
              Forgot your password?
            </Link>
          </div>
          <div className="flex flex-col items-center space-y-3 w-full">
            <Button
              className="w-[80%]"
              disabled={loading}
              onClick={handleLogin}
            >
              {loading
                ? password
                  ? "Signing in..."
                  : "Sending link..."
                : password
                ? "Sign in"
                : "Send magic link"}
            </Button>
            <Button
              variant="outline"
              className="w-[80%]"
              onClick={() => {
                router.push("/auth/signup");
              }}
            >
              Sign up
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
