"use client";

import { useEffect, useState } from "react";
import { FloatingPaths } from "@/components/ui/background-paths";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    // Process the auth callback
    const handleAuthCallback = async () => {
      try {
        // Detailed logging for debugging
        console.log("Auth callback triggered");
        console.log("Current URL:", window.location.href);

        // Try multiple approaches to handle the auth callback

        // APPROACH 1: Use the automatic Supabase handling
        console.log("Approach 1: Using Supabase getSession()");
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setDebugInfo("Session error: " + sessionError.message);
        } else if (sessionData.session) {
          console.log("Session found via getSession()");
          // We have a session, redirect to dashboard
          console.log("Authentication successful, redirecting to dashboard...");
          window.location.href = "/dashboard";
          return;
        } else {
          console.log(
            "No session found via getSession(), trying next approach"
          );
        }

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

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
          <FloatingPaths position={-1} className="inset-0 opacity-30" />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Flowterview</h1>
            <p className="mt-4 text-sm font-medium text-red-600">
              Authentication Issue
            </p>
            <p className="mt-2 text-gray-600">{error}</p>

            <div className="mt-6">
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Go to Dashboard
              </a>
            </div>

            <div className="mt-4">
              <a
                href="/auth/login"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Return to Login
              </a>
            </div>

            {debugInfo && (
              <div className="mt-4 rounded bg-gray-100 p-3 text-left text-xs text-gray-800 overflow-auto max-h-48">
                <p className="font-bold">Debug Info:</p>
                <pre className="whitespace-pre-wrap">{debugInfo}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="text-2xl font-medium tracking-widest bg-gradient-to-br from-indigo-400/50 via-indigo-600/70 to-indigo-800 text-transparent bg-clip-text">
            FLOWTERVIEW
          </div>
          <p className="mt-4 text-gray-600">Signing you in...</p>
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
