"use client";

import {
  Search,
  Filter,
  ArrowRight,
  Mail,
  Users,
  SplinePointer,
  Loader,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { BulkInviteDialog } from "@/components/ui/bulk-invite-dialog";
import { useToast } from "@/hooks/use-toast";
import { useInterviews, useCandidates } from "@/hooks/useStores";
import { authenticatedFetch } from "@/lib/auth-client";

interface Interview {
  id: string;
  title: string;
  status: "draft" | "active" | "completed";
  candidates: number;
  job_id: string;
  date: string;
  created_at: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  status?: string;
  job_id?: string;
}

export default function InterviewsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Use our store hooks instead of manual API calls
  const { interviews, isLoading: loading, error } = useInterviews();
  console.log(interviews);
  const { candidates } = useCandidates();

  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(
    null
  );
  const [availableCandidates, setAvailableCandidates] = useState<Candidate[]>(
    []
  );
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Fetch available candidates for bulk invite
  const fetchAvailableCandidates = async (interview: Interview) => {
    setLoadingCandidates(true);
    setSelectedInterview(interview);
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "http://localhost:8010";

      if (!interview.job_id) {
        throw new Error("No job_id found for this interview");
      }

      // Directly fetch candidates by job_id - much simpler approach
      const candidatesResp = await authenticatedFetch(
        `${backendUrl}/api/v1/candidates/by-job/${interview.job_id}`
      );

      if (!candidatesResp.ok) {
        if (candidatesResp.status === 404) {
          // No candidates found for this job
          setAvailableCandidates([]);
          setBulkInviteOpen(true);
          return;
        }
        throw new Error(`Failed to fetch candidates: ${candidatesResp.status}`);
      }

      const allCandidates = await candidatesResp.json();

      // Show all candidates - the dialog can handle filtering if needed
      setAvailableCandidates(allCandidates || []);
      setBulkInviteOpen(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch candidates";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleBulkInviteClick = (e: React.MouseEvent, interview: Interview) => {
    e.stopPropagation();
    fetchAvailableCandidates(interview);
  };

  const handleInvitesSent = () => {
    // Refresh the interviews list
    setBulkInviteOpen(false);
    setSelectedInterview(null);
    setAvailableCandidates([]);

    // Refresh interviews from store - this will trigger re-fetch
    // The store will automatically refresh when this component re-renders
  };

  // Status badge color mapping
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6 overflow-auto">
      <div className="flex flex-col justify-end items-center space-y-4 md:flex-row md:items-center md:space-y-0 gap-3">
        <Button
          onClick={() => router.push("/dashboard/interviews/from-description")}
          className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
          variant="outline"
        >
          New Interview
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <Input
            type="text"
            placeholder="Search interviews"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-10 pr-3 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:border-app-blue-5/00 dark:focus:border-app-blue-4/00 focus:outline-none focus:ring-1 focus:ring-app-blue-5/00 dark:focus:ring-app-blue-4/00"
          />
        </div>
        <div className="inline-flex">
          <Button className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-app-blue-5/00 dark:focus:ring-app-blue-4/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 cursor-pointer">
            <Filter className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            Filter
          </Button>
        </div>
      </div>

      {/* Interviews List */}
      <Card className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow p-0 border dark:border-gray-800">
        {loading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-300">
            Loading interviews...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 dark:text-red-400">
            {error}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {interviews.length > 0 ? (
              interviews.map((interview: any) => (
                <li key={interview.id} className="group">
                  <CardContent
                    className="flex items-center px-6 py-4 flex-row rounded-none cursor-pointer transition-colors border-l-0 border-r-0 border-b border-gray-200 dark:border-gray-800 group-hover:bg-app-blue-50/20 dark:group-hover:bg-app-blue-900/30"
                    onClick={() =>
                      router.push(`/dashboard/interviews/${interview.id}`)
                    }
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center space-x-3">
                        <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {interview.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`${getStatusBadgeClass(
                            interview.status
                          )} font-normal text-xs border-0 opacity-80`}
                        >
                          {interview.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-300">
                        <Users className="mr-1 h-3 w-3" />
                        <span>{interview.candidates || 0} candidates</span>
                        <span className="mx-2">&middot;</span>
                        <span className="text-xs opacity-90">
                          {interview.date}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                      {interview.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
                          onClick={(e) => handleBulkInviteClick(e, interview)}
                          disabled={loadingCandidates}
                        >
                          {loadingCandidates &&
                          selectedInterview?.id === interview.id ? (
                            <>
                              Bulk Invite
                              <Loader2 className="h-3 w-3 animate-spin" />
                            </>
                          ) : (
                            <>
                              Bulk Invite
                              <Mail className="mr-1 h-3 -3" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </li>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-300 text-sm">
                No interviews found.
              </div>
            )}
          </ul>
        )}
      </Card>

      {/* Bulk Invite Dialog */}
      {selectedInterview && (
        <BulkInviteDialog
          open={bulkInviteOpen}
          onOpenChange={setBulkInviteOpen}
          interviewId={selectedInterview.id}
          jobTitle={selectedInterview.title}
          availableCandidates={availableCandidates}
          onInvitesSent={handleInvitesSent}
        />
      )}
    </div>
  );
}
