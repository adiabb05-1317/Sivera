"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { setUserContext } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";

const emailSchema = z.string().email();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && session.user.email_confirmed_at) {
        router.push("/dashboard");
      }

      setSessionLoading(false);
    };

    checkSession();
  }, [router]);

  const handleEmailLogin = async () => {
    setLoading(true);

    try {
      if (!email || !emailSchema.safeParse(email).success) {
        toast.error("Invalid email", {
          description: "Please enter a valid email address",
        });
        return;
      }

      // Send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error("Error sending magic link", {
          description: "Please try again",
        });
        return;
      }

      setMagicLinkSent(true);
    } catch (error: unknown) {
      console.error("Login error:", error);
      toast.error("An error occurred", {
        description: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    setLoading(true);

    try {
      if (!email || !emailSchema.safeParse(email).success) {
        toast.error("Invalid email", {
          description: "Please enter a valid email address",
        });
        return;
      }

      if (!password) {
        toast.error("Password required", {
          description: "Please enter your password",
        });
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Error logging in", {
          description: error.message,
        });
        return;
      }

      if (data?.user) {
        await setUserContext(data.user.id, data.user.email!);
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      toast.error("An error occurred", {
        description: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error("Error with Google login", {
          description: error.message,
        });
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("An error occurred", {
        description: "Please try again",
      });
    }
  };

  const handleGitHubLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error("Error with GitHub login", {
          description: error.message,
        });
      }
    } catch (error) {
      console.error("GitHub login error:", error);
      toast.error("An error occurred", {
        description: "Please try again",
      });
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header with Banner */}
        <div className="relative h-16 w-full overflow-hidden">
          <Image
            src="/Banner.png"
            alt="Header Banner"
            fill
            className="object-cover object-top"
            priority
          />
          {/* Sivera Logo */}
          <div className="absolute top-2 left-4 z-10">
            <Image
              src="/Sivera.png"
              alt="Sivera Logo"
              width={120}
              height={48}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                We&apos;ve sent a magic link to <strong>{email}</strong>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setMagicLinkSent(false)}
              className="w-full"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Banner */}
      <div className="relative h-16 w-full overflow-hidden">
        <Image
          src="/Banner.png"
          alt="Header Banner"
          fill
          className="object-cover object-top"
          priority
        />
        {/* Sivera Logo */}
        <div className="absolute top-2 left-4 z-10">
          <Image
            src="/SiveraTransparent.png"
            alt="Sivera Logo"
            width={48}
            height={48}
            className="mix-blend-multiply opacity-70"
            priority
          />
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {showPassword ? "Log in or create an account to collaborate" : "Log in to Sivera"}
            </h2>
          </div>

          <div className="space-y-4">
            {!showPassword ? (
              <>
                {/* Google Login */}
                <Button
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  or
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-3"
                  />
                </div>

                {/* Continue with Email Button */}
                <Button
                  onClick={handleEmailLogin}
                  disabled={loading || !email}
                  className="w-full bg-black hover:bg-gray-800 text-white py-3"
                >
                  {loading ? "Sending link..." : "Continue with Email"}
                </Button>

                {/* GitHub Login */}
                <Button
                  onClick={handleGitHubLogin}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Continue with GitHub
                </Button>

                {/* SAML SSO */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Continue with SAML SSO
                </Button>

                {/* Passkey */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Continue with Passkey
                </Button>

                {/* Show other options */}
                <button
                  onClick={() => setShowPassword(true)}
                  className="w-full text-sm text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Show other options
                </button>
              </>
            ) : (
              <>
                {/* Google Login */}
                <Button
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  or
                </div>

                {/* Email and Password Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-3"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-3"
                    />
                  </div>

                  <Button
                    onClick={handlePasswordLogin}
                    disabled={loading || !email || !password}
                    className="w-full bg-black hover:bg-gray-800 text-white py-3"
                  >
                    {loading ? "Logging in..." : "Log in"}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Use single sign-on
                    </Link>
                  </div>

                  <div className="text-center">
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Reset password
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {showPassword ? "Create one" : "Sign Up"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
