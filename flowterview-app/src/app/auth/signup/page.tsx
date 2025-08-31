"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { authenticatedFetch, signup } from "@/lib/auth-client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { z } from "zod";

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

function extractOrgFromEmail(email: string): string {
  // Extracts the part between @ and . in the domain
  // e.g., user@something.com => something
  const match = email.match(/@([^.]+)\./);
  return match ? match[1] : "";
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<"email" | "password">("email");
  const [emailError, setEmailError] = useState(false);

  const handleEmailStep = () => {
    setEmailError(false);

    if (!email || !emailSchema.safeParse(email).success) {
      setEmailError(true);
      setError("Please enter a valid email address");
      toast.error("Invalid email", {
        description: "Please enter a valid email address",
      });
      return;
    }

    if (!isBusinessEmail(email)) {
      setEmailError(true);
      setError("Please use your business email address");
      toast.error("Business email required", {
        description: "Please use your business email address to continue",
      });
      return;
    }

    setError(null);
    setStep("password");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!password || password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      const signupResult = await signup(email, password);
      const { error: signupError } = signupResult;
      if (signupError) {
        toast.error("Error signing up", {
          description: "Please try again",
        });
        return;
      }

      // Call backend to create user (organization row will be created if needed)
      const userId = signupResult.data.user?.id;
      if (!userId) {
        toast.error("Error creating user", {
          description: "Please try again",
        });
        return;
      }
      const name = "";
      const orgName = extractOrgFromEmail(email);
      const resp = await authenticatedFetch(
        (process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL ||
          "https://api.sivera.io") + "/api/v1/users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            organization_name: orgName,
            user_id: userId,
          }),
        }
      );
      if (!resp.ok) {
        toast.error("Error creating user", {
          description: "Please try again",
        });
        return;
      }

      setSuccess(true);
    } catch (error: unknown) {
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
                {password ? "Account created!" : "Check your email"}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {password ? (
                  <>
                    Your account has been created. You can now{" "}
                    <strong>sign in</strong> with your email and password.
                  </>
                ) : (
                  <>
                    We&apos;ve sent a magic link to <strong>{email}</strong>.
                    Click the link in the email to sign in.
                  </>
                )}
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">Back to sign in</Link>
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
              Create your account
            </h2>
          </div>

          <div className="space-y-4">
            {step === "email" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(false);
                      setError(null);
                    }}
                    placeholder="name@company.com"
                    className={`w-full py-3 ${
                      emailError
                        ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500 dark:border-red-600 dark:bg-red-950/20 dark:focus:border-red-500"
                        : ""
                    }`}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailStep()}
                  />
                </div>

                <Button
                  onClick={handleEmailStep}
                  disabled={!email}
                  className="w-full py-3 bg-app-blue-700 cursor-pointer dark:bg-app-blue-600"
                >
                  Next
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSignup}>
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email address
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      disabled
                      className="w-full py-3 bg-gray-100 dark:bg-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => setStep("email")}
                      className="text-sm text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full py-3"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Confirm password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full py-3"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full py-3 bg-app-blue-700 cursor-pointer dark:bg-app-blue-600"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-app-blue-600 hover:text-app-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
