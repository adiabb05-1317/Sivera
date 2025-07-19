"use client";

import {
  Search,
  Filter,
  ArrowRight,
  Users,
  ChevronRight,
  Check,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useInterviews, useCandidates } from "@/hooks/useStores";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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
  const [searchQuery, setSearchQuery] = useState("");
  // Use our store hooks instead of manual API calls
  const { interviews, isLoading: loading, error } = useInterviews();
  const { candidates } = useCandidates();
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter and sort states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Get unique users from interviews
  const uniqueUsers = useMemo(() => {
    const users = interviews
      .map((interview: any) => interview.created_by)
      .filter(Boolean);
    return [...new Set(users)].sort();
  }, [interviews]);

  // Get unique statuses from interviews
  const uniqueStatuses = useMemo(() => {
    const statuses = interviews
      .map((interview: any) => interview.status)
      .filter(Boolean);
    return [...new Set(statuses)].sort();
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
        return "bg-app-blue-50/90 text-app-blue-600 border-app-blue-200/80";
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
              {uniqueUsers.map((user) => (
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

      {/* Interviews List */}
      <Card className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow p-0 border dark:border-gray-800">
        {loading ? (
          <div
            className="p-6 text-center text-gray-500 dark:text-gray-300 text-xs"
            style={{
              fontFamily: "KyivType Sans",
            }}
          >
            Loading interviews...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 dark:text-red-400">
            {error}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredAndSortedInterviews.length > 0 ? (
              filteredAndSortedInterviews.map((interview: any) => (
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
                          )} font-normal text-xs border-[0.5px] opacity-80`}
                        >
                          {interview.status.charAt(0).toUpperCase() +
                            interview.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-300">
                        <Users className="mr-1 h-3 w-3" />
                        <span>{interview.candidates || 0} candidates</span>
                        <span className="mx-2">&middot;</span>
                        <span className="text-xs opacity-90">
                          {interview.date}
                        </span>
                        <span className="mx-2">&middot;</span>
                        <span className="text-xs opacity-90">
                          {interview.created_by}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </CardContent>
                </li>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-300 text-sm">
                {interviews.length === 0
                  ? "No interviews found."
                  : `No interviews match your current filters. ${
                      hasActiveFilters ? "Try clearing some filters." : ""
                    }`}
              </div>
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}
