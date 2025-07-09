"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { setUserContext } from "@/lib/auth-client";
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
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.string().email();

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
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

      if (session && session.user.email_confirmed_at) {
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
      if (!email || !emailSchema.safeParse(email).success) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address",
        });
        return;
      }

      if (password && password.trim() !== "") {
        // If password provided, do password login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Error logging in",
            description: error.message,
          });
          return;
        }

        // FIXED: Set user context and cookies after successful login
        if (data?.user) {
          await setUserContext(data.user.id, data.user.email!);
          router.push("/dashboard");
        }
        return;
      }

      // If no password, send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Using the environment variable for production
          emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast({
          title: "Error sending magic link",
          description: "Please try again",
        });
        return;
      }

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-app-blue-1/00 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 p-4">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white dark:bg-zinc-900 p-8 shadow-lg flex flex-col items-center justify-center">
          <div
            className="text-lg font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-8/00 text-transparent bg-clip-text dark:from-app-blue-2/00 dark:via-blue-400 dark:to-white"
            style={{
              fontFamily: "KyivType Sans",
            }}
          >
            SIVERA
          </div>
          <div className="text-center">
            <p
              className="mt-4 text-gray-600 dark:text-gray-300 text-xs"
              style={{
                fontFamily: "KyivType Sans",
              }}
            >
              Loading...
            </p>
            <div className="mt-6 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-blue-5/00 border-t-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-app-blue-1/00 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 p-4">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white dark:bg-zinc-900 p-8 shadow-lg">
          <div className="text-center">
            <div
              className="text-lg font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-8/00 text-transparent bg-clip-text dark:from-app-blue-2/00 dark:via-blue-400 dark:to-white"
              style={{
                fontFamily: "KyivType Sans",
              }}
            >
              SIVERA
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              We&apos;ve sent a magic link to <strong>{email}</strong>. Click
              the link in the email to sign in.
            </p>
            <div className="mt-8">
              <Button
                className="cursor-pointer text-xs"
                variant="outline"
                onClick={() => setMagicLinkSent(false)}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-t from-app-blue-50/20 to-app-blue-300/30 dark:bg-gradient-to-t dark:from-zinc-900 dark:to-zinc-800 p-4">
      <Card className="w-[450px] dark:bg-zinc-900 dark:border-zinc-700">
        <CardHeader className="flex flex-col items-center justify-center">
          <CardTitle className="tracking-widest text-lg">
            <div
              className="text-lg font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-8/00 text-transparent bg-clip-text dark:from-app-blue-2/00 dark:via-blue-400 dark:to-white"
              style={{
                fontFamily: "KyivType Sans",
              }}
            >
              SIVERA
            </div>
          </CardTitle>
          <CardDescription className="dark:text-gray-300">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5 text-sm">
                <Label htmlFor="name" className="dark:text-gray-200">
                  Email address
                </Label>
                <Input
                  id="name"
                  placeholder="email@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="dark:bg-zinc-800 dark:text-gray-100 dark:border-zinc-700"
                />
              </div>
              <div className="flex flex-col space-y-1.5 text-sm">
                <Label htmlFor="name" className="dark:text-gray-200">
                  Password (optional)
                </Label>
                <Input
                  id="password"
                  placeholder="Leave empty to use magic link"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="dark:bg-zinc-800 dark:text-gray-100 dark:border-zinc-700"
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between flex-col gap-5 p-2">
          <div className="flex self-start text-sm">
            <Link
              href="/auth/forgot-password"
              className="font-medium text-app-blue-6/00 hover:text-app-blue-5/00 ml-5 dark:text-app-blue-4/00 dark:hover:text-app-blue-3/00"
            >
              Forgot your password?
            </Link>
          </div>
          <div className="flex flex-col items-center space-y-3 w-full">
            <Button
              className="cursor-pointer text-xs"
              variant="outline"
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
              className="cursor-pointer text-xs"
              variant="outline"
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
