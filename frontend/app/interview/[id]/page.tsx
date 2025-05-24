"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InterviewStart() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  const handleStartInterview = () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    setError("");
    setStarted(true);
    // TODO: Call backend or proceed to actual interview UI
    // router.push(`/interview/${id}/live?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-indigo-700 dark:text-indigo-200">
            Welcome to Your Interview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!started ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              <Button
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                onClick={handleStartInterview}
                disabled={!name.trim() || !email.trim()}
              >
                Start Interview
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-lg font-semibold text-indigo-700 dark:text-indigo-200 mb-2">
                Interview Started!
              </div>
              <div className="text-gray-600 dark:text-gray-300 mb-4">
                Good luck, {name}!
              </div>
              {/* Replace with actual interview UI */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
