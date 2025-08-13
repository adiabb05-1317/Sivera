"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

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
          const email = userData?.user?.email || "";
          if (!email) throw new Error("No email found for logged in user");

          // FIXED: Set user context and cookies first
          const { setUserContext } = await import("@/lib/auth-client");
          await setUserContext(userData?.user?.id!, email);

          // 3. Check if user exists in backend
          // Fix: Ensure HTTPS is used for API calls
          const backendUrl =
            process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL ||
            "https://api.sivera.io";

          console.log("🔍 Debug - Backend URL in callback:", backendUrl);

          const resp = await authenticatedFetch(
            backendUrl + "/api/v1/users?email=" + encodeURIComponent(email)
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
              backendUrl + "/api/v1/users",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: name,
                  user_id: userData?.user?.id,
                  email: email, // Use email directly
                  organization_name: orgName,
                }),
              }
            );
            setOrgLoading(false);
            if (!createResp.ok) {
              let data = {};
              try {
                data = await createResp.json();
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

        // APPROACH 2: Try to extract token from URL hash and set session manually
        const hash = window.location.hash;

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

          if (accessToken) {
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
              // Wait a moment to ensure session propagates
              setTimeout(() => {
                window.location.href = "/dashboard";
              }, 1000);
              return;
            }
          }
        }

        // APPROACH 3: Try to get auth data from URL directly
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          // We have a code, but need to handle it
          setDebugInfo((prev) => prev + "\nAuth code found: " + code);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Setting up your account
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Please don&apos;t close this page.
            </p>
          </div>
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-app-blue-300" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Authentication Error
            </h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>

            {debugInfo && (
              <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                {debugInfo}
              </div>
            )}

            <Button asChild variant="outline" className="w-full">
              <a href="/auth/login">Back to Login</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Signing you in
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please wait while we complete your authentication.
          </p>
        </div>
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-app-blue-300" />
        </div>
      </div>
    </div>
  );
}
