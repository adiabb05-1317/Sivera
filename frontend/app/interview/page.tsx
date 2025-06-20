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
  });
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
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
        "http://localhost:8010/api/v1/interviews/verify-token",
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
        if (data.interview_data) {
          usePathStore.setState({ jobId: data.interview_data.job_id });
          setInterviewData({
            title: data.interview_data.job_title,
            company: data.interview_data.company,
            duration: data.interview_data.duration,
            skills: data.interview_data.skills || [],
            jobId: data.interview_data.job_id,
            botToken: data.interview_data.bot_token,
            roomUrl: data.interview_data.room_url,
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
      formDataToSend.append("bot_token", interviewData.botToken);
      formDataToSend.append("room_url", interviewData.roomUrl);

      const response = await fetch(
        "http://localhost:8010/api/v1/interviews/complete-registration",
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
      }
    } catch (err) {
      setError("Failed to complete registration");
    } finally {
      setIsLoading(false);
    }
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
    router.push(`/`);
  };

  if (currentStep === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Verifying Your Invitation</CardTitle>
            <CardDescription>
              Please wait while we verify your interview invitation...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Verification Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Complete Your Registration</CardTitle>
            <CardDescription>
              Please provide your details to continue with the interview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              onClick={completeRegistration}
              className="w-full"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? "Completing Registration..." : "Next"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === "interview-details") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Welcome, {formData.name}!
            </CardTitle>
            <CardDescription>
              You're about to start your interview for {interviewData.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Interview Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Duration:</span>
                    <span className="text-sm">
                      {interviewData.duration} minutes
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Skills Assessment</h3>
                <div className="flex flex-wrap gap-2">
                  {interviewData.skills.length > 0 ? (
                    interviewData.skills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="flex items-center gap-1 px-3 py-2 bg-app-blue-100 text-app-blue-800 dark:bg-app-blue-900/30 dark:text-app-blue-300"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">
                      General skills assessment
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">
                Before You Start
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Ensure you're in a quiet, well-lit environment</li>
                <li>• Test your camera and microphone</li>
                <li>• Have a stable internet connection</li>
                <li>• Close unnecessary applications</li>
                <li>• Have a pen and paper ready for coding challenges</li>
              </ul>
            </div>

            <Button
              onClick={() => setCurrentStep("permissions")}
              className="w-full"
            >
              Start Interview
            </Button>

            <p className="text-xs text-center text-gray-500">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Camera & Microphone Access</CardTitle>
            <CardDescription>Required for the interview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="font-medium">Camera</span>
                </div>
                <div className="flex items-center space-x-2">
                  {cameraGranted ? (
                    <Badge className="bg-green-100 text-green-800">
                      Access Granted
                    </Badge>
                  ) : (
                    <Badge variant="outline">Permission Required</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="font-medium">Microphone</span>
                </div>
                <div className="flex items-center space-x-2">
                  {micGranted ? (
                    <Badge className="bg-green-100 text-green-800">
                      Access Granted
                    </Badge>
                  ) : (
                    <Badge variant="outline">Permission Required</Badge>
                  )}
                </div>
              </div>
            </div>

            {(!cameraGranted || !micGranted) && (
              <Button onClick={requestPermissions} className="w-full">
                Grant Access
              </Button>
            )}

            {cameraGranted && micGranted && (
              <Button onClick={proceedToInterview} className="w-full">
                Continue to Interview
              </Button>
            )}

            <p className="text-xs text-center text-gray-500">
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Loading...</CardTitle>
              <CardDescription>
                Please wait while we load your interview.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}
