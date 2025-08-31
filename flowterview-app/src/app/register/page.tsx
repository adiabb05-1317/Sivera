"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth-client";
import { toast } from "sonner";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [verifying, setVerifying] = useState(true);
  const [tokenData, setTokenData] = useState<any>(null);
  const [registering, setRegistering] = useState(false);
  const [completed, setCompleted] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid token", {
        description:
          "No verification token provided. Please check your email link.",
      });
      return;
    }

    // Verify the token
    const verifyToken = async () => {
      try {
        const response = await authenticatedFetch(
          `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/verify-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json();

        if (data.valid) {
          setTokenData(data);
          toast.success("Email verified", {
            description: "Your email has been verified successfully.",
          });
        } else {
          toast.error("Invalid token", {
            description:
              data.message || "Invalid or expired verification token.",
          });
        }
      } catch (error: any) {
        toast.error("Verification failed", {
          description:
            "An error occurred during verification. Please try again.",
        });
        console.error("Verification error:", error);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, toast]);

  const completeRegistration = async () => {
    if (!token) return;

    setRegistering(true);
    try {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/complete-registration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setCompleted(true);
        toast.success("Registration complete", {
          description:
            "Your registration is complete. Redirecting to your interview.",
        });

        // Allow time for the user to see the success message before redirecting
        setTimeout(() => {
          router.push(data.interview_url);
        }, 3000);
      } else {
        toast.error("Registration failed", {
          description: data.message || "An error occurred during registration.",
        });
      }
    } catch (error: any) {
      toast.error("Registration failed", {
        description: "An error occurred during registration. Please try again.",
      });
      console.error("Registration error:", error);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-xl font-extrabold text-gray-900">
            Candidate Verification
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please verify your email to proceed to your interview
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {verifying ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-app-blue-6/00" />
              <p className="mt-4 text-gray-600">Verifying your email...</p>
            </div>
          ) : completed ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p className="mt-4 text-base font-medium text-gray-900">
                Registration Complete!
              </p>
              <p className="mt-2 text-gray-600">
                Redirecting to your interview...
              </p>
            </div>
          ) : tokenData ? (
            <div className="space-y-6">
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <div>
                      <p className="text-sm text-blue-700">
                        Hello{" "}
                        <span className="font-medium">{tokenData.name}</span>,
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        You&apos;ve been invited to interview for the{" "}
                        <span className="font-medium">
                          {tokenData.job_title}
                        </span>{" "}
                        position.
                      </p>
                      <p className="mt-3 text-sm text-blue-700">
                        Click &quot;Continue to Interview&quot; to complete your
                        registration and start the interview process.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Button
                  onClick={completeRegistration}
                  disabled={registering}
                  className="cursor-pointer text-xs"
                  variant="outline"
                >
                  {registering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue to Interview"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-red-600 py-4">
              Invalid or expired verification token. Please check your email for
              a valid link.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-10 rounded-xl shadow-lg">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-app-blue-600" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RegisterContent />
    </Suspense>
  );
}
