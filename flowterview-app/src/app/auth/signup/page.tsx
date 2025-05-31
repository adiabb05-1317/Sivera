"use client";

import { useState } from "react";
import Link from "next/link";
import { authenticatedFetch, signup } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { FloatingPaths } from "@/components/ui/background-paths";
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
import { useRouter } from "next/navigation";

function extractOrgFromEmail(email: string): string {
  // Extracts the part between @ and . in the domain
  // e.g., user@something.com => something
  const match = email.match(/@([^.]+)\./);
  return match ? match[1] : "";
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!password || password !== confirmPassword) {
        setError("Passwords do not match");
      }

      const signupResult = await signup(email, password);
      const { error: signupError } = signupResult;
      if (signupError) {
        toast({
          title: "Error signing up",
          description: "Please try again",
        });
        return;
      }

      // Call backend to create user (organization row will be created if needed)
      const userId = signupResult.data.user?.id;
      if (!userId) {
        toast({
          title: "Error creating user",
          description: "Please try again",
        });
        return;
      }
      const name = email.split("@")[0];
      const orgName = extractOrgFromEmail(email);
      const resp = await authenticatedFetch(
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL + "/api/v1/users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            organization_name: orgName,
            role: "admin", // or let user pick role
            user_id: userId,
          }),
        }
      );
      if (!resp.ok) {
        toast({
          title: "Error creating user",
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-app-blue-1/00 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 p-4">
        <FloatingPaths position={-1} className="inset-0 opacity-30" />
        <Card className="w-[450px] dark:bg-zinc-900 dark:border-zinc-700">
          <CardHeader className="flex flex-col items-center justify-center">
            <CardTitle className="tracking-widest text-2xl">
              <div
                className="text-2xl font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-8/00 text-transparent bg-clip-text dark:from-app-blue-2/00 dark:via-blue-400 dark:to-white"
                style={{
                  fontFamily: "KyivType Sans",
                }}
              >
                SIVERA
              </div>
            </CardTitle>
            <CardDescription className="dark:text-gray-300">
              {password ? "Account created!" : "Check your email"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
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
          </CardContent>
          <CardFooter className="flex flex-col items-center">
            <Button
              asChild
              variant="outline"
              className="dark:border-zinc-700 dark:text-gray-200"
            >
              <Link href="/auth/login">Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-app-blue-1/00 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 p-4">
      <FloatingPaths position={-1} className="inset-0 opacity-30" />
      <Card className="w-[450px] dark:bg-zinc-900 dark:border-zinc-700">
        <CardHeader className="flex flex-col items-center justify-center">
          <CardTitle className="tracking-widest text-2xl">
            <div
              className="text-2xl font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-8/00 text-transparent bg-clip-text dark:from-app-blue-2/00 dark:via-blue-400 dark:to-white"
              style={{
                fontFamily: "KyivType Sans",
              }}
            >
              SIVERA
            </div>
          </CardTitle>
          <CardDescription className="dark:text-gray-300">
            Create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300 mb-4">
              {error}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSignup}>
            <div className="space-y-4">
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
              <div className="flex flex-col space-y-1.5 text-sm">
                <label htmlFor="password" className="dark:text-gray-200">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="dark:bg-zinc-800 dark:text-gray-100 dark:border-zinc-700"
                />
              </div>
              {password && (
                <div className="flex flex-col space-y-1.5 text-sm">
                  <label
                    htmlFor="confirmPassword"
                    className="dark:text-gray-200"
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
                    className="dark:bg-zinc-800 dark:text-gray-100 dark:border-zinc-700"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col items-center space-y-3 w-full">
              <Button
                type="submit"
                variant="outline"
                disabled={loading}
                className="cursor-pointer border border-app-blue-500/80 hover:bg-app-blue-500/10 text-app-blue-5/00 hover:text-app-blue-6/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 w-[80%] dark:border-app-blue-400/80 dark:hover:bg-app-blue-400/10 dark:text-app-blue-3/00 dark:hover:text-app-blue-2/00 dark:focus:ring-app-blue-4/00 dark:focus:ring-offset-zinc-900"
              >
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
              <div className="text-sm text-gray-500 dark:text-gray-300 items-center justify-center">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-app-blue-5/00 hover:text-app-blue-6/00 dark:text-app-blue-4/00 dark:hover:text-app-blue-3/00"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-row items-center gap-2 text-sm"></CardFooter>
      </Card>
    </div>
  );
}
