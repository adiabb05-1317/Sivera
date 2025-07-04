"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Linkedin,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function LinkedInCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [profileData, setProfileData] = useState<any>(null);
  const [redirectTimer, setRedirectTimer] = useState(5);

  // Handle callback parameters and set initial status
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      // LinkedIn OAuth error
      setStatus("error");
      setMessage(errorDescription || `LinkedIn authorization failed: ${error}`);
      toast({
        title: "LinkedIn Connection Failed",
        description: errorDescription || `Authorization failed: ${error}`,
        variant: "destructive",
      });
    } else if (success === "true" && code && state) {
      // Success case - Backend processed successfully and redirected here
      setStatus("success");
      setMessage(
        "LinkedIn integration successful! You can now sync job postings and access candidate profiles."
      );

      toast({
        title: "LinkedIn Connected",
        description: "Your LinkedIn account has been successfully connected.",
      });
    } else if (code && state) {
      // Direct LinkedIn redirect - this shouldn't happen with our flow
      // but handle it just in case
      setStatus("success");
      setMessage(
        "LinkedIn authorization received. Please check your settings to confirm the integration."
      );

      toast({
        title: "LinkedIn Authorization Received",
        description:
          "Please check your settings to confirm the integration status.",
      });
    } else {
      // No parameters - user might have navigated here directly
      setStatus("error");
      setMessage(
        "No LinkedIn callback data found. Please try connecting again from the settings page."
      );
    }
  }, [searchParams, toast]);

  // Handle redirect timer - separate from status detection
  useEffect(() => {
    if (status === "loading") return;

    const timer = setInterval(() => {
      setRedirectTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Handle navigation when timer reaches 0
  useEffect(() => {
    if (redirectTimer <= 0 && status !== "loading") {
      const redirectUrl =
        status === "success"
          ? "/dashboard/settings?linkedin_connected=true"
          : "/dashboard/settings";
      router.push(redirectUrl);
    }
  }, [redirectTimer, status, router]);

  const handleGoToSettings = () => {
    // Add success parameter if this was a successful OAuth flow
    const redirectUrl =
      status === "success"
        ? "/dashboard/settings?linkedin_connected=true"
        : "/dashboard/settings";
    router.push(redirectUrl);
  };

  const handleTryAgain = () => {
    router.push("/dashboard/settings");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-app-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Processing LinkedIn Integration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                Please wait while we complete your LinkedIn connection...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-app-blue-100 dark:bg-app-blue-900/30 rounded-full">
              <Linkedin className="h-8 w-8 text-app-blue-600 dark:text-app-blue-400" />
            </div>
          </div>
          <CardTitle className="flex items-center justify-center space-x-2">
            {status === "success" ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span className="text-green-700 dark:text-green-300">
                  Connection Successful
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                <span className="text-red-700 dark:text-red-300">
                  Connection Failed
                </span>
              </>
            )}
          </CardTitle>
          <CardDescription className="text-center mt-2">
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "success" && (
            <div className="space-y-3">
              <Badge
                variant="secondary"
                className="w-full justify-center bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              >
                LinkedIn Integration Active
              </Badge>

              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <p>
                  <strong>What you can do now:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Sync job postings between LinkedIn and your platform</li>
                  <li>Import candidate profiles from LinkedIn</li>
                  <li>Access LinkedIn profile data via URL</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            {status === "success" ? (
              <Button onClick={handleGoToSettings} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
            ) : (
              <Button
                onClick={handleTryAgain}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            )}

            {redirectTimer > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Redirecting to settings in {redirectTimer} seconds...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
