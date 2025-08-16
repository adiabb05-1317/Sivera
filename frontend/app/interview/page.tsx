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

interface TokenData {
  success: boolean;
  message: string;
  name?: string;
  interview_url?: string;
  interview_data?: {
    job_id: string;
    job_title: string;
    company: string;
    duration: number;
    skills: string[];
    interview_id: string;
    bot_token: string;
    room_url: string;
    candidate_id: string;
  };
}

interface InterviewData {
  title: string;
  company: string;
  duration: number;
  skills: string[];
  jobId: string;
  botToken: string;
  roomUrl: string;
  candidateId: string;
}

type Step =
  | "verifying"
  | "registration"
  | "interview-details"
  | "permissions"
  | "error";

function InterviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [currentStep, setCurrentStep] = useState<Step>("verifying");
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [interviewData, setInterviewData] = useState<InterviewData>({
    title: "",
    company: "",
    duration: 30,
    skills: [],
    jobId: "",
    botToken: "",
    roomUrl: "",
    candidateId: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    linkedin_profile: "",
  });
  const [additionalLinks, setAdditionalLinks] = useState<
    { name: string; url: string }[]
  >([]);
  const [newLink, setNewLink] = useState({ name: "", url: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  // Verify token on component mount
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError("No token provided");
      setCurrentStep("error");
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
          ? `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/verify-token`
          : "https://api.sivera.io/api/v1/interviews/verify-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        }
      );

      const data = await response.json();
      setTokenData(data);

      if (data.success) {
        // Update interview data from backend response
        setFormData({
          name: data.name || "",
          linkedin_profile: "",
        });
        if (data.interview_data) {
          usePathStore.setState({ jobId: data.interview_data.job_id });
          usePathStore.setState({
            candidateId: data.interview_data.candidate_id,
          });
          setInterviewData({
            title: data.interview_data.job_title,
            company: data.interview_data.company,
            duration: data.interview_data.duration,
            skills: data.interview_data.skills || [],
            jobId: data.interview_data.job_id,
            botToken: data.interview_data.bot_token,
            roomUrl: data.interview_data.room_url,
            candidateId: data.interview_data.candidate_id,
          });
        }

        if (data.interview_url) {
          // User already exists, redirect to interview
          window.location.href = data.interview_url;
        } else {
          // New user, proceed to registration
          setFormData((prev) => ({ ...prev, name: data.name || "" }));
          setCurrentStep("registration");
        }
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

  const completeRegistration = async () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const formDataToSend = new FormData();
      formDataToSend.append("token", token || "");
      formDataToSend.append("name", formData.name);
      formDataToSend.append("linkedin_profile", formData.linkedin_profile);
      formDataToSend.append("bot_token", interviewData.botToken);
      formDataToSend.append("room_url", interviewData.roomUrl);
      formDataToSend.append(
        "additional_links",
        JSON.stringify(additionalLinks)
      );
      // formDataToSend.append("candidate_id", usePathStore.getState().candidateId);
      // here add the linkedin profile link and the other links to zustand store
      usePathStore.setState({
        linkedin_profile: formData.linkedin_profile,
        additional_links: additionalLinks.map((link) => {
          return {
            name: link.name,
            url: link.url,
          };
        }),
      });

      const response = await fetch(
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL
          ? `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/complete-registration`
          : "https://api.sivera.io/api/v1/interviews/complete-registration",
        {
          method: "POST",
          body: formDataToSend,
        }
      );

      const data = await response.json();

      if (data.success) {
        setCurrentStep("interview-details");
      } else {
        setError(data.message);
        setCurrentStep("error");
      }
    } catch (err) {
      setError("Failed to complete registration");
    } finally {
      setIsLoading(false);
    }
  };

  const addLink = () => {
    if (newLink.name.trim() && newLink.url.trim()) {
      setAdditionalLinks([...additionalLinks, { ...newLink }]);
      setNewLink({ name: "", url: "" });
    }
  };

  const removeLink = (index: number) => {
    setAdditionalLinks(additionalLinks.filter((_, i) => i !== index));
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Check if we got both video and audio tracks
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      setCameraGranted(videoTracks.length > 0);
      setMicGranted(audioTracks.length > 0);

      // Stop the stream since we only needed permission
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.error("Failed to get media permissions:", err);
      // Try to get permissions separately
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setCameraGranted(true);
        videoStream.getTracks().forEach((track) => track.stop());
      } catch (videoErr) {
        setCameraGranted(false);
      }

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        setMicGranted(true);
        audioStream.getTracks().forEach((track) => track.stop());
      } catch (audioErr) {
        setMicGranted(false);
      }
    }
  };

  const proceedToInterview = () => {
    // Pass jobId and candidateId as URL parameters to ensure they're available
    const params = new URLSearchParams({
      job_id: interviewData.jobId,
      candidate_id: interviewData.candidateId,
      bot_token: interviewData.botToken,
      room_url: encodeURIComponent(interviewData.roomUrl)
    });
    router.push(`/?${params.toString()}`);
  };

  if (currentStep === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">
              Verifying Your Invitation
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-xs">
              Please wait while we verify your interview invitation...
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
              {error === "CANDIDATE_ALREADY_STARTED_OR_FINISHED"
                ? "Interview expired."
                : "Verification Failed"}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-xs">
              {error === "CANDIDATE_ALREADY_STARTED_OR_FINISHED"
                ? "Please contact the recruiter."
                : error}
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

  if (currentStep === "registration") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">
              Complete Your Registration
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-xs">
              Please provide your details to continue with the interview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn Profile</Label>
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/your-profile"
                value={formData.linkedin_profile}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    linkedin_profile: e.target.value,
                  }))
                }
                autoComplete="off"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold text-gray-900 dark:text-white">
                  Showcase Your Work
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Add any portfolios, projects, professional profiles, or other
                  relevant links you'd like to share with the recruiter to
                  showcase your skills and experience.
                </p>
              </div>

              {additionalLinks.length > 0 && (
                <div className="space-y-2">
                  {additionalLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {link.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 break-all">
                          {link.url}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeLink(index)}
                        className="cursor-pointer text-xs"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="linkName">Link Name</Label>
                    <Input
                      id="linkName"
                      type="text"
                      placeholder="e.g., Portfolio, Website, Project"
                      value={newLink.name}
                      onChange={(e) =>
                        setNewLink((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkUrl">URL</Label>
                    <Input
                      id="linkUrl"
                      type="url"
                      placeholder="https://..."
                      value={newLink.url}
                      onChange={(e) =>
                        setNewLink((prev) => ({ ...prev, url: e.target.value }))
                      }
                      autoComplete="off"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLink}
                  disabled={!newLink.name.trim() || !newLink.url.trim()}
                  className="w-full cursor-pointer text-xs"
                >
                  Add Link
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <Button
              onClick={completeRegistration}
              className="cursor-pointer text-xs w-full"
              variant="outline"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading
                ? "Completing Registration..."
                : "Continue to Interview"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "interview-details") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900 dark:text-white">
              Welcome, {formData.name}!
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              You're about to start your interview for {interviewData.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  Interview Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Duration:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {interviewData.duration} minutes
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  Skills Assessment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {interviewData.skills.length > 0 ? (
                    interviewData.skills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="flex items-center gap-1 px-3 py-2 bg-app-blue-100 text-app-blue-800 dark:bg-app-blue-900/30 dark:text-app-blue-300 border-app-blue-200 dark:border-app-blue-700"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      General skills assessment
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                Before You Start
              </h4>
              <ul className="text-sm text-amber-700 dark:text-amber-200 space-y-1">
                <li>• Ensure you're in a quiet, well-lit environment</li>
                <li>• Test your camera and microphone</li>
                <li>• Have a stable internet connection</li>
                <li>• Close unnecessary applications</li>
                <li>• Have a pen and paper ready for coding challenges</li>
              </ul>
            </div>

            <Button
              onClick={() => setCurrentStep("permissions")}
              className="cursor-pointer text-xs w-full"
              variant="outline"
            >
              Start Interview
            </Button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              By starting this interview, you agree to be recorded for
              evaluation purposes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "permissions") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">
              Camera & Microphone Access
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Required for the interview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Camera
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {cameraGranted ? (
                    <Badge variant="outline">Access Granted</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50">
                      Permission Required
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Microphone
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {micGranted ? (
                    <Badge variant="outline">Access Granted</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50">
                      Permission Required
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {(!cameraGranted || !micGranted) && (
              <Button
                onClick={requestPermissions}
                className="cursor-pointer text-xs w-full"
                variant="outline"
              >
                Grant Access
              </Button>
            )}

            {cameraGranted && micGranted && (
              <Button
                onClick={proceedToInterview}
                className="cursor-pointer text-xs w-full"
                variant="outline"
              >
                Continue to Interview
              </Button>
            )}

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              You can change these permissions anytime in your browser settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-app-blue-50 to-white dark:from-[#101624] dark:to-[#23304a] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 dark:bg-[#232d44] backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-gray-900 dark:text-white">
                Loading...
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Please wait while we load your interview.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-blue-600 dark:border-app-blue-400 mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}
