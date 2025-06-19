"use client";

import { useEffect, useState } from "react";
import { FloatingPaths } from "@/components/ui/background-paths";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/auth-client";

function extractOrgFromEmail(email: string): string {
  // Extracts the part between @ and . in the domain
  // e.g., user@something.com => something
  if (!email || !email.includes("@")) return "";
  const domain = email.split("@")[1] || "";
  const org = domain.split(".")[0] || "";
  return org;
}

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [orgLoading, setOrgLoading] = useState(false);

  useEffect(() => {
    // Process the auth callback
    const handleAuthCallback = async () => {
      try {
        // 1. Wait for session
        const sessionResp = await supabase.auth.getSession();
        const sessionData = sessionResp.data;
        const sessionError = sessionResp.error;
        if (sessionError) {
          setDebugInfo("Session error: " + sessionError.message);
        } else if (sessionData.session) {
          // 2. Get user info
          const { data: userData } = await supabase.auth.getUser();
          console.log("User data:", userData);
          const email = userData?.user?.email || "";
          if (!email) throw new Error("No email found for logged in user");

          // FIXED: Set user context and cookies first
          const { setUserContext } = await import("@/lib/auth-client");
          await setUserContext(userData?.user?.id!, email);

          // 3. Check if user exists in backend
          const resp = await authenticatedFetch(
            process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL +
              "/api/v1/users?email=" +
              encodeURIComponent(email)
          );
          if (resp.ok) {
            // User exists, redirect directly
            window.location.href = "/dashboard";
            return;
          } else {
            // User does not exist, create user with org from domain
            setOrgLoading(true);
            const userId = userData?.user?.id;
            const name = email.split("@")[0];
            const orgName = extractOrgFromEmail(email);
            // Defensive: fallback if orgName is empty
            if (!orgName) {
              setOrgLoading(false);
              throw new Error(
                "Could not extract organization name from email domain."
              );
            }
            const createResp = await authenticatedFetch(
              process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL + "/api/v1/users",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: name,
                  user_id: userData?.user?.id,
                  email: email, // Use email directly
                  organization_name: orgName,
                  role: "admin", // default role for login
                }),
              }
            );
            setOrgLoading(false);
            if (!createResp.ok) {
              let data = {};
              try {
                data = await createResp.json();
                console.log("Create response:", data);
              } catch (e) {
                // ignore
              }
              throw new Error(
                (data as any).detail ||
                  (data as any).error ||
                  "Failed to create user"
              );
            }

            // User created successfully, redirect directly
            window.location.href = "/dashboard";
            return;
          }
        }

        // Detailed logging for debugging
        console.log("Auth callback triggered");
        console.log("Current URL:", window.location.href);

        // APPROACH 2: Try to extract token from URL hash and set session manually
        const hash = window.location.hash;
        console.log("URL hash:", hash);

        if (!hash || !hash.includes("access_token")) {
          console.error("No access_token found in URL hash");
          setDebugInfo(
            (prev) => prev + "\nNo access_token in URL hash: " + hash
          );
        } else {
          // Extract the access_token from the hash
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          console.log(
            "Access token found:",
            accessToken ? "YES (hidden)" : "NO"
          );
          console.log(
            "Refresh token found:",
            refreshToken ? "YES (hidden)" : "NO"
          );

          if (accessToken) {
            console.log("Setting session with tokens manually...");
            // Manually set the session with the extracted tokens
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

            if (setSessionError) {
              console.error("Error setting session:", setSessionError);
              setDebugInfo(
                (prev) =>
                  prev + "\nError setting session: " + setSessionError.message
              );
            } else {
              console.log("Session set successfully!");
              // Wait a moment to ensure session propagates
              setTimeout(() => {
                console.log("Redirecting to dashboard now...");
                window.location.href = "/dashboard";
              }, 1000);
              return;
            }
          }
        }

        // APPROACH 3: Try to get auth data from URL directly
        console.log("Approach 3: Checking URL parameters");
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          console.log("Auth code found in URL, trying to exchange for session");
          // We have a code, but need to handle it
          setDebugInfo((prev) => prev + "\nAuth code found: " + code);

          // Tell user to go to dashboard manually as fallback
          console.log(
            "Couldn't automatically redirect, providing manual option"
          );
          setError(
            "Authentication partially succeeded. Please click the button below to go to the dashboard."
          );
          return;
        }

        // If we've reached here, all approaches failed
        throw new Error(
          "All authentication approaches failed. Please try logging in again."
        );
      } catch (err) {
        console.error("Authentication error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMsg);
        setDebugInfo((prev) => prev + "\nError caught: " + errorMsg);

        // Don't automatically redirect on error, let user see debug info
      }
    };

    handleAuthCallback();
  }, []);

  if (orgLoading) {
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
              Setting up your account...
              <p className="text-xs text-gray-400 dark:text-gray-300">
                Please don&apos;t close this page.
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-6 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-blue-5/00 border-t-transparent"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
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
              Authentication Error
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300 mb-4">
              {error}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-300 whitespace-pre-wrap mt-2">
              {debugInfo}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center">
            <Button
              asChild
              variant="outline"
              className="dark:border-zinc-700 dark:text-gray-200"
            >
              <a href="/auth/login">Back to Login</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-app-blue-1/00 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white dark:bg-zinc-900 p-8 shadow-lg">
        <div className="text-center">
          <div
            className="text-2xl font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-8/00 text-transparent bg-clip-text dark:from-app-blue-2/00 dark:via-blue-400 dark:to-white"
            style={{
              fontFamily: "KyivType Sans",
            }}
          >
            SIVERA
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Signing you in...
          </p>
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-app-blue-5/00 border-t-transparent"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
