"use client";

import { Plus, Search, Filter, Eye, View, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { authenticatedFetch, getUserContext } from "@/lib/auth-client";
import { useCandidates, useJobs } from "@/hooks/useStores";

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
              variant="outline"
              className="cursor-pointer border border-app-blue-500/80 hover:bg-app-blue-500/10 text-app-blue-5/00 hover:text-app-blue-6/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50"
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [filteredCandidates, setFilteredCandidates] = useState<any[]>([]);
  const router = useRouter();

  // Use our new store hooks instead of the old supabase hooks
  const {
    candidates,
    isLoading: loading,
    error,
    refresh: reload,
  } = useCandidates();
  const { jobs, fetchJobs } = useJobs();

  // Status badge color mapping (for capitalized statuses)
  const statusColors: Record<string, string> = {
    Applied: "bg-black-100 text-black-800",
    Screening: "bg-yellow-100 text-yellow-800",
    Interview_Scheduled: "bg-blue-100 text-blue-800",
    Interviewed: "bg-app-blue-1/00 text-app-blue-8/00",
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

  useEffect(() => {
    if (!candidates) return;
    let filtered = candidates;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(lower) ||
          c.email?.toLowerCase().includes(lower) ||
          c.jobs?.title?.toLowerCase().includes(lower)
      );
    }
    if (selectedJobIds.length > 0) {
      filtered = filtered.filter(
        (c: any) => c.jobs && selectedJobIds.includes(c.jobs.id)
      );
    }
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((c: any) =>
        selectedStatuses.includes(c.status)
      );
    }
    setFilteredCandidates(filtered);
  }, [candidates, searchTerm, selectedJobIds, selectedStatuses]);

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
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage and track candidates in your recruitment pipeline.
        </p>
        <Button
          onClick={() => router.push("/dashboard/candidates/invite")}
          className="cursor-pointer border border-app-blue-500/80 hover:bg-app-blue-500/10 text-app-blue-5/00 hover:text-app-blue-6/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50"
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
            className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-app-blue-5/00 focus:outline-none focus:ring-1 focus:ring-app-blue-5/00"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Multi-select filter for job roles and statuses */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={popoverOpen}
              className="w-[280px] justify-between"
            >
              {selectedJobIds.length === 0 && selectedStatuses.length === 0
                ? "Filter by Job Role or Status"
                : [
                    ...jobs
                      .filter((job: any) => selectedJobIds.includes(job.id))
                      .map((job: any) => job.title),
                    ...selectedStatuses.map(
                      (status) => statusLabels[status] || status
                    ),
                  ].join(", ")}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0">
            <Command>
              <CommandInput placeholder="Search job or status..." />
              <CommandEmpty>No job or status found.</CommandEmpty>
              <CommandGroup heading="Job Roles">
                {jobs && jobs.length > 0 ? (
                  jobs.map((job: any) => (
                    <CommandItem
                      key={job.id}
                      value={job.title}
                      onSelect={() => {
                        setSelectedJobIds((prev) =>
                          prev.includes(job.id)
                            ? prev.filter((id) => id !== job.id)
                            : [...prev, job.id]
                        );
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedJobIds.includes(job.id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {job.title}
                    </CommandItem>
                  ))
                ) : (
                  <CommandItem disabled>No roles</CommandItem>
                )}
              </CommandGroup>
              <CommandGroup heading="Status">
                {Object.keys(statusLabels).map((status) => (
                  <CommandItem
                    key={status}
                    value={statusLabels[status]}
                    onSelect={() => {
                      setSelectedStatuses((prev) =>
                        prev.includes(status)
                          ? prev.filter((s) => s !== status)
                          : [...prev, status]
                      );
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedStatuses.includes(status)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {statusLabels[status]}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setSelectedJobIds([]);
                    setSelectedStatuses([]);
                  }}
                >
                  Clear Filter
                </CommandItem>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
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
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map((candidate) => (
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
                        className={cn(
                          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
                          statusColors[candidate.status]
                        )}
                      >
                        {statusLabels[candidate.status] || candidate.status}
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
                    No candidates found
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
