"use client";

import { Plus, Search, Filter, Eye, View, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { useState } from "react";

import { useCandidatesSortedByJob } from "./supabase-hooks";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

const CandidateViewDialog = ({
  candidate,
  onClose,
  handleSendInvite,
}: {
  candidate: any;
  onClose: () => void;
  handleSendInvite: (candidate: any) => void;
}) => {
  return (
    <Dialog open={!!candidate} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="tracking-tight">Candidate</DialogTitle>
          <DialogDescription>{candidate.name}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex flex-col gap-2 w-full">
            {candidate.resume_url && (
              <Button
                variant="outline"
                onClick={() => window.open(candidate.resume_url, "_blank")}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Resume
              </Button>
            )}
            {!candidate.resume_url && (
              <p className="text-sm text-gray-500">No resume available.</p>
            )}
            <Button
              onClick={() => handleSendInvite(candidate)}
              className="cursor-pointer"
            >
              <Send className="mr-2 h-4 w-4" />
              Invite for Interview
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function CandidatesPage() {
  const { toast } = useToast();
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  // Invite for Interview handler
  const handleSendInvite = async (candidate: any) => {
    toast({
      title: "Sending invitation...",
      description: `Sending invitation to ${candidate.email}`,
    });

    try {
      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: candidate.email,
          name: candidate.name,
          job: candidate.jobs ? candidate.jobs.title : "",
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Update the existing toast with success message
        toast({
          title: "Interview invitation sent",
          description: `Interview invitation sent to ${candidate.email}`,
          action: (
            <ToastAction
              altText="Undo"
              onClick={() =>
                console.log("Undo sending invite to", candidate.email)
              }
            >
              Undo
            </ToastAction>
          ),
        });
      } else {
        // Update the same toast with error message
        toast({
          title: "Failed to send invite",
          description: data.error || "Unknown error",
          action: (
            <ToastAction
              altText="Retry"
              onClick={() => handleSendInvite(candidate)}
            >
              Retry
            </ToastAction>
          ),
        });
      }
    } catch (err: any) {
      // Update the same toast with error message
      toast({
        title: "Failed to send invite",
        description: err.message,
        action: (
          <ToastAction
            altText="Retry"
            onClick={() => handleSendInvite(candidate)}
          >
            Retry
          </ToastAction>
        ),
      });
    }
  };

  const router = useRouter();
  const { candidates, loading, error, reload } = useCandidatesSortedByJob();

  // Status badge color mapping (for capitalized statuses)
  const statusColors: Record<string, string> = {
    Applied: "bg-black-100 text-black-800",
    Screening: "bg-yellow-100 text-yellow-800",
    Interview_Scheduled: "bg-blue-100 text-blue-800",
    Interviewed: "bg-indigo-100 text-indigo-800",
    Hired: "bg-green-100 text-green-800",
    On_Hold: "bg-orange-100 text-orange-800",
    Rejected: "bg-red-100 text-red-800",
  };

  // Status display label mapping
  const statusLabels: Record<string, string> = {
    Applied: "Applied",
    Screening: "Screening",
    Interview_scheduled: "Interview Scheduled",
    Interviewed: "Interviewed",
    Hired: "Hired",
    On_Hold: "On Hold",
    Rejected: "Rejected",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-end space-y-4 md:flex-row md:items-center md:space-y-0">
        <Button
          onClick={() => router.push("/dashboard/candidates/invite")}
          className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search candidates"
            className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled
          />
        </div>
        <div className="inline-flex">
          <Button
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
            disabled
          >
            <Filter className="mr-2 h-4 w-4 text-gray-400" />
            Filter
          </Button>
        </div>
      </div>

      {/* Candidates Table */}
      <Card className="overflow-hidden rounded-lg bg-white shadow p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Job Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date Added
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {/* Group by job */}
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="text-center text-red-600 py-8">
                    {error}
                  </td>
                </tr>
              ) : candidates && candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 14l9-5-9-5-9 5 9 5zm0 7v-6m0 6a9 9 0 100-18 9 9 0 000 18z"
                        />
                      </svg>
                      <div className="text-lg font-medium text-gray-500">
                        No candidates found
                      </div>
                      <div className="text-sm text-gray-400">
                        Add your first candidate to get started!
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                candidates.map((candidate: any) => (
                  <tr
                    key={candidate.id}
                    className="hover:bg-gray-50 cursor-pointer h-18 border-b border-gray-200"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="font-normal text-sm tracking-tight">
                        {candidate.name}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {candidate.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {candidate.jobs ? candidate.jobs.title : "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Badge variant="outline" className="opacity-80">
                        {statusLabels[candidate.status] ||
                          candidate.status ||
                          "-"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                      {candidate.created_at
                        ? new Date(candidate.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Conditionally render the dialog */}
      {selectedCandidate && (
        <CandidateViewDialog
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          handleSendInvite={handleSendInvite}
        />
      )}
    </div>
  );
}
