"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function FromDescriptionPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobTitle.trim()) {
      setError("Job title is required");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Job description is required");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // In a real application, this would call your AI service to generate the interview workflow
      // For this MVP, we'll simulate a delay and then redirect to the edit page
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Normally, we would create the interview in the database here
      // Then redirect to the edit page for the created interview
      router.push("/dashboard/interviews/new?prefilled=true");
    } catch (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _error: unknown
    ) {
      setError("Failed to generate interview workflow. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link
          href="/dashboard/interviews"
          className="mr-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Interviews
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Create from Job Description
        </h1>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <div className="mb-8 flex items-start rounded-lg bg-blue-50 p-4 text-blue-800">
            <div className="mr-3 flex-shrink-0">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">AI-Powered Interview Generator</h3>
              <p className="mt-1 text-sm">
                Paste your job description below and we&apos;ll automatically
                create a tailored interview workflow with relevant questions and
                evaluation criteria based on the required skills and experience.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label
                htmlFor="jobTitle"
                className="block text-sm font-medium text-gray-700"
              >
                Job Title
              </label>
              <input
                id="jobTitle"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g. Senior Frontend Developer"
              />
            </div>

            <div>
              <label
                htmlFor="jobDescription"
                className="block text-sm font-medium text-gray-700"
              >
                Job Description
              </label>
              <textarea
                id="jobDescription"
                rows={12}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Paste the full job description here..."
              />
            </div>

            <div className="flex justify-end">
              <Link
                href="/dashboard/interviews"
                className="mr-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Interview
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
