"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, X, Plus, UploadCloud, Check } from "lucide-react";

export default function InviteCandidatesPage() {
  const [selectedInterview, setSelectedInterview] = useState("");
  const [candidates, setCandidates] = useState([
    { name: "", email: "", id: Date.now() },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Placeholder data - in a real application, this would come from an API
  const interviews = [
    { id: "1", title: "Frontend Developer" },
    { id: "2", title: "UX Designer" },
    { id: "3", title: "Product Manager" },
    { id: "4", title: "DevOps Engineer" },
  ];

  const addCandidateRow = () => {
    setCandidates([...candidates, { name: "", email: "", id: Date.now() }]);
  };

  const removeCandidateRow = (id: number) => {
    if (candidates.length > 1) {
      setCandidates(candidates.filter((candidate) => candidate.id !== id));
    }
  };

  const updateCandidate = (
    id: number,
    field: "name" | "email",
    value: string
  ) => {
    setCandidates(
      candidates.map((candidate) =>
        candidate.id === id ? { ...candidate, [field]: value } : candidate
      )
    );
  };

  const handleFileUpload = () => {
    setIsUploading(true);
    // In a real application, this would handle file upload and CSV parsing
    setTimeout(() => {
      // Simulate adding candidates from CSV
      setCandidates([
        { name: "John Doe", email: "john@example.com", id: Date.now() },
        { name: "Jane Smith", email: "jane@example.com", id: Date.now() + 1 },
        { name: "Bob Johnson", email: "bob@example.com", id: Date.now() + 2 },
      ]);
      setIsUploading(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // In a real application, this would send invitations via API
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 1500);
  };

  if (isSent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Link
            href="/dashboard/candidates"
            className="mr-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Candidates
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Invite Candidates
          </h1>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6 text-center">
            <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              Invitations Sent Successfully
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              All candidates have been invited to complete their interviews.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/candidates"
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Return to Candidates
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link
          href="/dashboard/candidates"
          className="mr-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Candidates
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Invite Candidates</h1>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="interview"
                className="block text-sm font-medium text-gray-700"
              >
                Select Interview
              </label>
              <select
                id="interview"
                value={selectedInterview}
                onChange={(e) => setSelectedInterview(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select an interview...</option>
                {interviews.map((interview) => (
                  <option key={interview.id} value={interview.id}>
                    {interview.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Candidates
                </h2>
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={isUploading}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {isUploading ? (
                    <span>Uploading...</span>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Import CSV
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 rounded-md border border-gray-300 p-4">
                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-start space-x-3"
                    >
                      <div className="flex-1">
                        <input
                          type="text"
                          value={candidate.name}
                          onChange={(e) =>
                            updateCandidate(
                              candidate.id,
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="Candidate Name"
                          required
                          className="mb-2 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        />
                        <input
                          type="email"
                          value={candidate.email}
                          onChange={(e) =>
                            updateCandidate(
                              candidate.id,
                              "email",
                              e.target.value
                            )
                          }
                          placeholder="Email Address"
                          required
                          className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCandidateRow(candidate.id)}
                        className="mt-1 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCandidateRow}
                    className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Another Candidate
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href="/dashboard/candidates"
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !selectedInterview}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invitations
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
