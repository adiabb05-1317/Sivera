"use client";

import {
  Plus,
  Search,
  Filter,
  Eye,
  View,
  Send,
  Brain,
  Loader2,
  ArrowRight,
  Check,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { authenticatedFetch, getUserContext } from "@/lib/auth-client";
import { useCandidates, useJobs } from "@/hooks/useStores";
import { InterviewAnalytics } from "@/components/ui/interview-analytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const CandidateViewDialog = ({
  candidate,
  onClose,
  handleSendInvite,
}: {
  candidate: any;
  onClose: () => void;
  handleSendInvite: (candidate: any) => void;
}) => {
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const siveraBackendUrl =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";

  const handleShowAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      // We need to find the interview ID for this candidate's job
      if (!candidate.job_id) {
        toast({
          title: "Error",
          description: "No job information found for this candidate",
          variant: "destructive",
        });
        return;
      }

      // Fetch interview for this job to get the interview ID
      const interviewResponse = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/interviews/by-job/${candidate.job_id}`
      );

      if (!interviewResponse.ok) {
        throw new Error(
          `Failed to fetch interview: ${interviewResponse.status}`
        );
      }

      const interviewData = await interviewResponse.json();
      const interviewId = interviewData.interview?.id;

      if (!interviewId) {
        toast({
          title: "Error",
          description: "No interview found for this job",
          variant: "destructive",
        });
        return;
      }

      // Now fetch analytics for this candidate and interview
      const analytics = await authenticatedFetch(
        `${siveraBackendUrl}/api/v1/analytics/interview/${interviewId}/candidate/${candidate.id}`
      );

      if (!analytics.ok) {
        throw new Error(`Failed to fetch analytics: ${analytics.status}`);
      }

      const data = await analytics.json();
      setAnalyticsData(data.analytics);

      toast({
        title: "Analytics",
        description: "Analytics loaded successfully",
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleViewMoreDetails = () => {
    toast({
      title: "More Details",
      description: "Detailed analytics view coming soon!",
    });
  };

  return (
    <Dialog open={!!candidate} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="tracking-tight">Candidate</DialogTitle>
          <DialogDescription>{candidate.name}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex flex-col gap-2 w-full">
            {candidate.status === "Interviewed" && (
              <>
                {/* Analytics Section */}
                {!analyticsData ? (
                  <Button
                    variant="outline"
                    onClick={handleShowAnalytics}
                    disabled={loadingAnalytics}
                    className="cursor-pointer text-xs"
                  >
                    {loadingAnalytics ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading Analytics...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Show Analytics
                      </>
                    )}
                  </Button>
                ) : (
                  <InterviewAnalytics analyticsData={analyticsData} />
                )}

                {/* View Detailed Analysis Button - Only show when analytics are displayed */}
                {analyticsData && (
                  <Button
                    variant="outline"
                    onClick={handleViewMoreDetails}
                    className="cursor-pointer text-xs"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    View Detailed Analysis
                  </Button>
                )}
              </>
            )}
            {candidate.resume_url && (
              <Button
                onClick={() => window.open(candidate.resume_url, "_blank")}
                variant="outline"
                className="cursor-pointer text-xs"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Resume
              </Button>
            )}
            {!candidate.resume_url && (
              <p className="text-sm text-gray-500">No resume available.</p>
            )}
            {candidate.status !== "Interviewed" && (
              <Button
                onClick={() => handleSendInvite(candidate)}
                variant="outline"
                className="cursor-pointer text-xs"
              >
                <Send className="mr-2 h-4 w-4" />
                Invite for Interview
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function CandidatesPage() {
  const { toast } = useToast();
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const router = useRouter();

  // Filter and sort states
  const [sortBy, setSortBy] = useState<"name" | "job" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Use our new store hooks instead of the old supabase hooks
  const {
    candidates,
    isLoading: loading,
    error,
    refresh: reload,
  } = useCandidates();
  const { jobs, fetchJobs } = useJobs();

  // Get unique statuses from candidates
  const uniqueStatuses = useMemo(() => {
    const statuses = candidates
      .map((candidate: any) => candidate.status)
      .filter(Boolean);
    return [...new Set(statuses)].sort();
  }, [candidates]);

  // Get unique job roles from candidates
  const uniqueJobRoles = useMemo(() => {
    const jobRoles = candidates
      .filter((candidate: any) => candidate.jobs?.id && candidate.jobs?.title)
      .map((candidate: any) => ({
        id: candidate.jobs.id,
        title: candidate.jobs.title,
      }));

    // Remove duplicates based on job ID and ensure IDs are valid
    const uniqueRoles = jobRoles.filter(
      (role, index, self) =>
        role.id && index === self.findIndex((r) => r.id === role.id)
    );

    return uniqueRoles.sort((a, b) => a.title.localeCompare(b.title));
  }, [candidates]);

  // Filter and sort logic
  const filteredAndSortedCandidates = useMemo(() => {
    const filtered = candidates.filter((candidate: any) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.jobs?.title?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(candidate.status);

      // Job role filter
      const matchesJob =
        selectedJobIds.length === 0 ||
        (candidate.jobs && selectedJobIds.includes(candidate.jobs.id));

      return matchesSearch && matchesStatus && matchesJob;
    });

    // Sort
    filtered.sort((a: any, b: any) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else if (sortBy === "job") {
        const jobA = a.jobs?.title || "";
        const jobB = b.jobs?.title || "";
        comparison = jobA.localeCompare(jobB);
      } else if (sortBy === "date") {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        comparison = dateA.getTime() - dateB.getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    candidates,
    searchTerm,
    selectedStatuses,
    selectedJobIds,
    sortBy,
    sortOrder,
  ]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedJobIds([]);
    setSortBy("date");
    setSortOrder("desc");
    setSearchTerm("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    selectedJobIds.length > 0 ||
    sortBy !== "date" ||
    sortOrder !== "desc" ||
    searchTerm !== "";

  // Status badge color mapping using only app colors
  const getCandidateStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Applied":
        return "bg-app-blue-50/90 text-app-blue-600 border-app-blue-200/80";
      case "Screening":
        return "bg-app-blue-100/90 text-app-blue-700 border-app-blue-300/80";
      case "Interview_Scheduled":
        return "bg-app-blue-200/90 text-app-blue-800 border-app-blue-400/80";
      case "Interviewed":
        return "bg-app-blue-200/80 text-app-blue-900 border-app-blue-500/80";
      case "Hired":
        return "bg-app-blue-500/80 text-white border-app-blue-600/80";
      case "On_Hold":
        return "bg-app-blue-800/20 text-app-blue-600 border-app-blue-700/50";
      case "Rejected":
        return "bg-app-blue-900/30 text-app-blue-400 border-app-blue-800/50";
      default:
        return "bg-app-blue-100/60 text-app-blue-700 border-app-blue-400/60";
    }
  };

  // Utility function to format status text consistently
  const formatStatusText = (status: string) => {
    return status
      .replace(/_/g, " ") // Replace underscores with spaces
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
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

  // Derive job roles from candidates
  const jobRoles = Array.from(
    new Set(
      (candidates || [])
        .filter((c: any) => c.jobs && c.jobs.id && c.jobs.title)
        .map((c: any) => JSON.stringify({ id: c.jobs.id, title: c.jobs.title }))
    )
  ).map((str) => JSON.parse(str));

  useEffect(() => {
    fetchJobs();
  }, []);

  // Invite for Interview handler
  const handleSendInvite = async (candidate: any) => {
    toast({
      title: "Sending invitation...",
      description: `Sending invitation to ${candidate.email}`,
    });

    try {
      // Get current user context from cookies
      const userContext = getUserContext();
      const organizationId =
        candidate.organization_id || userContext?.organization_id;
      const senderId = userContext?.user_id;

      if (!organizationId) {
        toast({
          title: "Organization not found",
          description:
            "Your organization information is missing. Please log in again.",
        });
        return;
      }

      const res = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL}/api/v1/interviews/send-invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: candidate.email,
            name: candidate.name,
            job: candidate.jobs ? candidate.jobs.title : "",
            organization_id: organizationId,
            sender_id: senderId || "system",
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        // Update the existing toast with success message
        toast({
          title: "Interview invitation sent",
          description: `Interview invitation sent to ${candidate.email}`,
          action: (
            <ToastAction altText="Undo" onClick={() => {}}>
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

  return (
    <div className="space-y-6 overflow-auto">
      <div className="flex flex-row justify-between items-center">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage and track candidates in your recruitment pipeline.
          </p>
          {!loading && candidates.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Showing {filteredAndSortedCandidates.length} of{" "}
              {candidates.length} candidates
            </p>
          )}
        </div>
        <Button
          onClick={() => router.push("/dashboard/candidates/invite")}
          className="cursor-pointer text-xs"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0 px-1">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <Input
            type="text"
            placeholder="Search candidates"
            value={searchTerm}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-10 pr-3 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:border-app-blue-5/00 dark:focus:border-app-blue-4/00 focus:outline-none focus:ring-1 focus:ring-app-blue-5/00 dark:focus:ring-app-blue-4/00"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-xs cursor-pointer">
                Sort:{" "}
                {sortBy === "name"
                  ? "Name"
                  : sortBy === "job"
                  ? "Job Role"
                  : "Date"}{" "}
                (
                {sortBy === "name" || sortBy === "job"
                  ? sortOrder === "asc"
                    ? "A-Z"
                    : "Z-A"
                  : sortOrder === "desc"
                  ? "Newest"
                  : "Oldest"}
                )
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs"
                onClick={() => {
                  setSortBy("name");
                  setSortOrder("asc");
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    sortBy === "name" && sortOrder === "asc"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                />
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={() => {
                  setSortBy("name");
                  setSortOrder("desc");
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    sortBy === "name" && sortOrder === "desc"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                />
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={() => {
                  setSortBy("job");
                  setSortOrder("asc");
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    sortBy === "job" && sortOrder === "asc"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                />
                Job Role (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={() => {
                  setSortBy("job");
                  setSortOrder("desc");
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    sortBy === "job" && sortOrder === "desc"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                />
                Job Role (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={() => {
                  setSortBy("date");
                  setSortOrder("desc");
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    sortBy === "date" && sortOrder === "desc"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                />
                Date (Newest)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={() => {
                  setSortBy("date");
                  setSortOrder("asc");
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    sortBy === "date" && sortOrder === "asc"
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                />
                Date (Oldest)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-xs cursor-pointer">
                Status{" "}
                {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">
                Filter by Status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueStatuses.map((status) => (
                <DropdownMenuItem
                  key={status}
                  className="text-xs"
                  onClick={() => {
                    setSelectedStatuses((prev) =>
                      prev.includes(status)
                        ? prev.filter((s) => s !== status)
                        : [...prev, status]
                    );
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedStatuses.includes(status)
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  />
                  {formatStatusText(status)}
                </DropdownMenuItem>
              ))}
              {selectedStatuses.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => setSelectedStatuses([])}
                  >
                    Clear Status Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Job Role Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-xs cursor-pointer">
                Job Role{" "}
                {selectedJobIds.length > 0 && `(${selectedJobIds.length})`}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">
                Filter by Job Role
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueJobRoles.map((job) => (
                <DropdownMenuItem
                  key={job.id}
                  className="text-xs"
                  onClick={() => {
                    setSelectedJobIds((prev) =>
                      prev.includes(job.id)
                        ? prev.filter((id) => id !== job.id)
                        : [...prev, job.id]
                    );
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedJobIds.includes(job.id)
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  />
                  {job.title}
                </DropdownMenuItem>
              ))}
              {selectedJobIds.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => setSelectedJobIds([])}
                  >
                    Clear Job Role Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear All Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Candidates Table */}
      <Card className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow pb-0 border dark:border-gray-800">
        <div className="flex items-center justify-between px-3 py-3">
          <h2 className="text-base font-medium text-gray-900 dark:text-white ml-5">
            Candidates
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Job Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Date Added
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredAndSortedCandidates.length > 0 ? (
                filteredAndSortedCandidates.map((candidate: any) => (
                  <tr
                    key={candidate.id}
                    className="transition-colors cursor-pointer hover:bg-app-blue-50/20 dark:hover:bg-app-blue-900/30"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <td className="px-6 py-6 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {candidate.name}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {candidate.email}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {candidate.jobs?.title || "-"}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm">
                      <Badge
                        variant="outline"
                        className={`${getCandidateStatusBadgeClass(
                          candidate.status
                        )} font-normal text-xs border-[0.5px] opacity-80`}
                      >
                        {formatStatusText(candidate.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {candidate.created_at
                        ? new Date(candidate.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-300"
                  >
                    {candidates.length === 0
                      ? "No candidates found."
                      : `No candidates match your current filters. ${
                          hasActiveFilters ? "Try clearing some filters." : ""
                        }`}
                  </td>
                </tr>
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
