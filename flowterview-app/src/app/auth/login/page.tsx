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
import { Separator } from "@radix-ui/react-separator";

const emailSchema = z.string().email();

// Common personal email domains to exclude
const personalEmailDomains = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "live.com",
  "msn.com",
  "ymail.com",
  "rocketmail.com",
  "protonmail.com",
  "tutanota.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "fastmail.com",
];

const isBusinessEmail = (email: string): boolean => {
  if (!emailSchema.safeParse(email).success) return false;

  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? !personalEmailDomains.includes(domain) : false;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"email" | "password">("email");
  const [emailError, setEmailError] = useState(false);

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
    setEmailError(false);

    try {
      if (!email || !emailSchema.safeParse(email).success) {
        setEmailError(true);
        toast.error("Invalid email", {
          description: "Please enter a valid email address",
        });
        return;
      }

      if (!isBusinessEmail(email)) {
        setEmailError(true);
        toast.error("Business email required", {
          description: "Please use your business email address to continue",
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

  const handleEmailStep = () => {
    setEmailError(false);

    if (!email || !emailSchema.safeParse(email).success) {
      setEmailError(true);
      toast.error("Invalid email", {
        description: "Please enter a valid email address",
      });
      return;
    }

    if (!isBusinessEmail(email)) {
      setEmailError(true);
      toast.error("Business email required", {
        description: "Please use your business email address to continue",
      });
      return;
    }

    setStep("password");
  };

  const handlePasswordLogin = async () => {
    setLoading(true);

    try {
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
              src="/SiveraTransparent.png"
              alt="Sivera Logo"
              width={48}
              height={48}
              className="mix-blend-multiply opacity-70"
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
          />
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {showPassword
                ? "Log in or create an account to collaborate"
                : "Log in to Sivera"}
            </h2>
          </div>

          <div className="space-y-4">
            {!showPassword ? (
              <>
                {/* SAML SSO */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-3 cursor-pointer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  Continue with SAML SSO
                </Button>

                {/* Passkey */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 py-3 cursor-pointer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                  Continue with Passkey
                </Button>

                <div className="flex items-center gap-4">
                  <Separator className="flex-1 h-px bg-gray-300 dark:bg-gray-600 opacity-40" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    or
                  </span>
                  <Separator className="flex-1 h-px bg-gray-300 dark:bg-gray-600 opacity-40" />
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(false);
                    }}
                    className={`w-full py-3 ${
                      emailError
                        ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500 dark:border-red-600 dark:bg-red-950/20 dark:focus:border-red-500"
                        : ""
                    }`}
                  />
                </div>

                {/* Continue with Email Button */}
                <Button
                  onClick={handleEmailLogin}
                  disabled={loading || !email}
                  className="w-full py-3 bg-app-blue-700 cursor-pointer dark:bg-app-blue-600"
                >
                  {loading ? "Sending link..." : "Send Magic Link"}
                </Button>

                {/* Show other options */}
                <button
                  onClick={() => setShowPassword(true)}
                  className="w-full text-sm text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                >
                  Login with password
                </button>
              </>
            ) : (
              <>
                {/* Two-step Email and Password Form */}
                <div className="space-y-4">
                  {step === "email" ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email
                        </label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setEmailError(false);
                          }}
                          className={`w-full py-3 ${
                            emailError
                              ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500 dark:border-red-600 dark:bg-red-950/20 dark:focus:border-red-500"
                              : ""
                          }`}
                          placeholder="Enter your email address"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleEmailStep()
                          }
                        />
                      </div>

                      <Button
                        onClick={handleEmailStep}
                        disabled={!email}
                        className="w-full py-3 bg-app-blue-700 cursor-pointer dark:bg-app-blue-600"
                      >
                        Next
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="email"
                            value={email}
                            disabled
                            className="w-full py-3 bg-gray-100 dark:bg-gray-800"
                          />
                          <button
                            onClick={() => setStep("email")}
                            className="text-sm text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer whitespace-nowrap"
                          >
                            Edit
                          </button>
                        </div>
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
                          placeholder="Enter your password"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handlePasswordLogin()
                          }
                          autoFocus
                        />
                      </div>

                      <Button
                        onClick={handlePasswordLogin}
                        disabled={loading || !password}
                        className="w-full py-3 bg-app-blue-700 cursor-pointer dark:bg-app-blue-600"
                      >
                        {loading ? "Logging in..." : "Log in"}
                      </Button>

                      <div className="text-center">
                        <Link
                          href="/auth/forgot-password"
                          className="text-sm text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </>
                  )}

                  <div className="text-center">
                    <button
                      onClick={() => {
                        setShowPassword(false);
                        setStep("email");
                      }}
                      className="text-sm text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                    >
                      Use single sign-on
                    </button>
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
