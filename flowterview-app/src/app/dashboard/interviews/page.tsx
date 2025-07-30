"use client";

import {
  Search,
  Filter,
  ArrowRight,
  Check,
  ChevronDown,
  Ellipsis,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useInterviews } from "@/hooks/queries/useInterviews";
import { useCandidates } from "@/hooks/queries/useCandidates";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and sort states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Route-based data fetching - only load what this page needs
  const interviewsQuery = useInterviews({
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    createdBy: selectedUsers.length > 0 ? selectedUsers : undefined,
    search: searchQuery || undefined,
  });

  // Extract data from TanStack Query
  const interviews = interviewsQuery.interviews;
  const loading = interviewsQuery.isLoading;
  const error = interviewsQuery.error;

  // Get unique users from interviews
  const uniqueUsers = useMemo(() => {
    const users = (interviews || [])
      .map((interview: any) => interview.created_by)
      .filter(Boolean);
    return [...new Set(users)].sort() as string[];
  }, [interviews]);

  // Get unique statuses from interviews
  const uniqueStatuses = useMemo(() => {
    const statuses = (interviews || [])
      .map((interview: any) => interview.status)
      .filter(Boolean);
    return [...new Set(statuses)].sort() as string[];
  }, [interviews]);

  // Filter and sort logic
  const filteredAndSortedInterviews = useMemo(() => {
    const filtered = interviews.filter((interview: any) => {
      // Search filter
      const matchesSearch =
        interview.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.created_by.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(interview.status);

      // User filter
      const matchesUser =
        selectedUsers.length === 0 ||
        selectedUsers.includes(interview.created_by);

      return matchesSearch && matchesStatus && matchesUser;
    });

    // Sort
    filtered.sort((a: any, b: any) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === "date") {
        const dateA = new Date(a.created_at || a.date);
        const dateB = new Date(b.created_at || b.date);
        comparison = dateA.getTime() - dateB.getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    interviews,
    searchQuery,
    selectedStatuses,
    selectedUsers,
    sortBy,
    sortOrder,
  ]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedUsers([]);
    setSortBy("date");
    setSortOrder("desc");
    setSearchQuery("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    selectedUsers.length > 0 ||
    sortBy !== "date" ||
    sortOrder !== "desc";

  // Status badge color mapping
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-app-blue-500/80 text-white border-app-blue-600/80";
      case "completed":
        return "bg-app-blue-100/90 text-app-blue-800 border-app-blue-300/80";
      case "draft":
        return "bg-app-blue-200/90 text-app-blue-600 border-app-blue-200/80";
      case "expired":
        return "bg-app-blue-900/20 text-app-blue-400 border-app-blue-700/50";
      default:
        return "bg-app-blue-100/60 text-app-blue-700 border-app-blue-400/60";
    }
  };

  return (
    <div className="space-y-6 overflow-auto">
      <div className="flex flex-row justify-between items-center">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage and track all your interview processes.
          </p>
          {!loading && interviews.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Showing {filteredAndSortedInterviews.length} of{" "}
              {interviews.length} interviews
            </p>
          )}
        </div>
        <Button
          onClick={() => router.push("/dashboard/interviews/from-description")}
          className="cursor-pointer text-xs"
          variant="outline"
        >
          New Interview
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0 px-1">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <Input
            type="text"
            placeholder="Search interviews"
            value={searchQuery}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-10 pr-3 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:border-app-blue-5/00 dark:focus:border-app-blue-4/00 focus:outline-none focus:ring-1 focus:ring-app-blue-5/00 dark:focus:ring-app-blue-4/00"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-xs cursor-pointer">
                Sort: {sortBy === "name" ? "Name" : "Date"} (
                {sortBy === "name"
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
            <DropdownMenuContent align="end" className="w-46">
              <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
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
              <Button variant="outline" className="text-xs">
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
              {uniqueStatuses.map((status: string) => (
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
                  {status.charAt(0).toUpperCase() + status.slice(1)}
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

          {/* User Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-xs">
                User {selectedUsers.length > 0 && `(${selectedUsers.length})`}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">
                Filter by User
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueUsers.map((user: string) => (
                <DropdownMenuItem
                  key={user}
                  className="text-xs"
                  onClick={() => {
                    setSelectedUsers((prev) =>
                      prev.includes(user)
                        ? prev.filter((u) => u !== user)
                        : [...prev, user]
                    );
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedUsers.includes(user) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {user}
                </DropdownMenuItem>
              ))}
              {selectedUsers.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear User Filters
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
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Interviews Table */}
      <Card className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow p-0 border dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Candidates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Date Created
                </th>
                <th className="sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredAndSortedInterviews.length > 0 ? (
                filteredAndSortedInterviews.map((interview: any) => (
                  <tr
                    key={interview.id}
                    className="transition-colors cursor-pointer hover:bg-app-blue-50/20 dark:hover:bg-app-blue-900/30"
                    onClick={() =>
                      router.push(`/dashboard/interviews/${interview.id}`)
                    }
                  >
                    <td className="px-6 py-6 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {interview.title}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm">
                      <Badge
                        variant="outline"
                        className={`${getStatusBadgeClass(
                          interview.status
                        )} font-normal text-xs border-[0.5px] opacity-80`}
                      >
                        {interview.status.charAt(0).toUpperCase() +
                          interview.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {interview.candidates || 0}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {interview.created_by || "-"}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {interview.created_at
                        ? new Date(interview.created_at).toLocaleDateString()
                        : interview.date || "-"}
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-300"
                  >
                    {interviews.length === 0
                      ? "No interviews found."
                      : `No interviews match your current filters. ${
                          hasActiveFilters ? "Try clearing some filters." : ""
                        }`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
