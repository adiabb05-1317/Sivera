"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePathStore } from "@/app/store/PathStore";

interface RoundTokenData {
  success: boolean;
  message: string;
  token?: string;
  participants?: {
    candidates: Array<{
      email: string;
      role: string;
      has_joined: boolean;
      joined_at?: string;
    }>;
    recruiters: Array<{
      email: string;
      role: string;
      has_joined: boolean;
      joined_at?: string;
    }>;
  };
  stats?: {
    total_participants: number;
    joined_participants: number;
    waiting_for: number;
  };
}

interface JoinResponse {
  success: boolean;
  message: string;
  already_joined?: boolean;
  all_joined?: boolean;
  waiting_for?: number;
  total_participants?: number;
}

type Step = "verifying" | "participant-info" | "waiting" | "ready" | "error";

function RoundContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [currentStep, setCurrentStep] = useState<Step>("verifying");
  const [roundData, setRoundData] = useState<RoundTokenData | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<"candidate" | "recruiter" | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Verify token on component mount
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError("No token provided");
      setCurrentStep("error");
    }
  }, [token]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const verifyToken = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
          ? `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/rounds/verify-token`
          : "https://api.sivera.io/api/v1/rounds/verify-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        }
      );

      const data = await response.json();

      setRoundData(data);

      if (data.success) {
        usePathStore.setState({
          candidateId: data.candidate_id,
          jobId: data.job_id,
          roundNumber: data.round,
        });
        setCurrentStep("participant-info");
      } else {
        setError(data.message);
        setCurrentStep("error");
      }
    } catch (err) {
      setError("Failed to verify token");
      setCurrentStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const joinRound = async () => {
    if (!userEmail.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
          ? `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/rounds/join`
          : "https://api.sivera.io/api/v1/rounds/join",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, email: userEmail }),
        }
      );

      const data: JoinResponse = await response.json();

      if (data.success) {
        if (data.already_joined) {
          // User already joined, check status
          checkRoundStatus();
        } else if (data.all_joined) {
          // All participants joined, round is ready
          setCurrentStep("ready");
        } else {
          // Waiting for other participants
          setCurrentStep("waiting");
          startPolling();
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to join round");
    } finally {
      setIsLoading(false);
    }
  };

  const checkRoundStatus = async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
          ? `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/rounds/status/${encodeURIComponent(token || "")}`
          : `https://api.sivera.io/api/v1/rounds/status/${encodeURIComponent(token || "")}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        if (data.round_started) {
          setCurrentStep("ready");
          if (pollInterval) {
            clearInterval(pollInterval);
            setPollInterval(null);
          }
        } else {
          setCurrentStep("waiting");
          setRoundData((prev) => ({
            ...prev!,
            stats: data.stats,
          }));
        }
      }
    } catch (err) {
      console.error("Error checking round status:", err);
    }
  };

  const startPolling = () => {
    const interval = setInterval(checkRoundStatus, 2000); // Poll every 2 seconds
    setPollInterval(interval);
  };

  const startInterview = () => {
    // router.push("/");
    console.log("Starting interview");
  };

  // Auto-detect user role based on participants
  useEffect(() => {
    if (roundData?.participants && userEmail) {
      const allParticipants = [
        ...roundData.participants.candidates,
        ...roundData.participants.recruiters,
      ];
      const participant = allParticipants.find((p) => p.email === userEmail);
      if (participant) {
        setUserRole(participant.role as "candidate" | "recruiter");
      }
    }
  }, [roundData, userEmail]);

  if (currentStep === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">
              Verifying Round Access
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-xs">
              Please wait while we verify your round invitation...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-blue-600 dark:border-app-blue-400 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600 dark:text-red-400">
              Verification Failed
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-xs">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Please check your email for a new invitation link or contact
              support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "participant-info") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">
              Join Round Interview
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-xs">
              Please enter your email to join the round interview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {roundData?.participants && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Candidates */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    Candidates
                  </h3>
                  <div className="space-y-2">
                    {roundData.participants.candidates.map(
                      (participant, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                        >
                          <span className="text-sm text-gray-900 dark:text-white">
                            {participant.email}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              participant.has_joined
                                ? "bg-app-blue-100 text-app-blue-800 dark:bg-app-blue-900/30 dark:text-app-blue-300 border-app-blue-200 dark:border-app-blue-700"
                                : ""
                            }
                          >
                            {participant.has_joined ? "Joined" : "Waiting"}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Recruiters */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    Recruiters
                  </h3>
                  <div className="space-y-2">
                    {roundData.participants.recruiters.map(
                      (participant, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                        >
                          <span className="text-sm text-gray-900 dark:text-white">
                            {participant.email}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              participant.has_joined
                                ? "bg-app-blue-100 text-app-blue-800 dark:bg-app-blue-900/30 dark:text-app-blue-300 border-app-blue-200 dark:border-app-blue-700"
                                : ""
                            }
                          >
                            {participant.has_joined ? "Joined" : "Waiting"}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {roundData?.stats && (
              <div className="bg-gradient-to-r from-app-blue-50 to-white dark:from-app-blue-900/20 dark:to-gray-700/20 border border-app-blue-200 dark:border-app-blue-700 rounded-lg p-4">
                <h4 className="font-semibold text-app-blue-800 dark:text-app-blue-300 mb-2">
                  Round Status
                </h4>
                <div className="text-sm text-app-blue-700 dark:text-app-blue-200">
                  <p>
                    Total Participants: {roundData.stats.total_participants}
                  </p>
                  <p>Joined: {roundData.stats.joined_participants}</p>
                  <p>Waiting for: {roundData.stats.waiting_for}</p>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button
              onClick={joinRound}
              className="cursor-pointer text-xs w-full"
              variant="outline"
              disabled={isLoading || !userEmail.trim()}
            >
              {isLoading ? "Joining Round..." : "Join Round"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">
              Waiting for Participants
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-xs">
              You've joined successfully! Waiting for other participants to
              join...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="animate-pulse">
              <div className="rounded-full h-16 w-16 border-4 border-app-blue-200 dark:border-app-blue-700 border-t-app-blue-600 dark:border-t-app-blue-400 animate-spin mx-auto"></div>
            </div>

            {roundData?.stats && (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p>
                  Waiting for {roundData.stats.waiting_for} more participant(s)
                </p>
                <p>
                  {roundData.stats.joined_participants} of{" "}
                  {roundData.stats.total_participants} joined
                </p>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              This page will automatically update when everyone joins
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "ready") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-app-blue-600 dark:text-app-blue-400">
              Round Ready to Start!
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-xs">
              All participants have joined. You can now start the interview.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button
              onClick={startInterview}
              className="cursor-pointer text-xs w-full"
              variant="outline"
            >
              Start Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export default function RoundPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-gray-900 dark:text-white">
                Loading...
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 text-xs">
                Please wait while we load your round interview.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-blue-600 dark:border-app-blue-400 mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <RoundContent />
    </Suspense>
  );
}
