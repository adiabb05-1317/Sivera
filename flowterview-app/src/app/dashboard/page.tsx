"use client";

import { FileText, Users, Activity, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/useStores";

export default function DashboardPage() {
  const router = useRouter();

  // Use combined dashboard hook for all data
  const { auth, candidates, interviews, analytics, isLoading, hasError, refreshAll } = useDashboard();

  // Status badge color mapping
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-app-blue-500/90 text-white border-app-blue-600/80";
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

  // Calculate stats from TanStack Query data
  const stats = [
    {
      id: 1,
      name: "Active Interviews",
      value: interviews.getActiveInterviews().length.toString(),
      icon: FileText,
    },
    {
      id: 2,
      name: "Total Candidates",
      value: candidates.allCandidates.length.toString(),
      icon: Users,
    },
    {
      id: 3,
      name: "Average Interview Score",
      value: "N/A", // TODO: Implement with analytics hook when available
      icon: Star,
    },
  ];

  // Get recent interviews (limited to 4)
  const recentInterviews = interviews.interviews.slice(0, 4);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading dashboard data</p>
          <Button
            onClick={refreshAll}
            className="cursor-pointer text-xs"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-row justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Overview of your interview activities and key metrics.
        </p>
        <Button className="invisible" variant="outline">
          This button is to make the text aligned for all the pages
        </Button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card
            key={stat.id}
            className="overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-gray-900 dark:to-gray-800 shadow-md border border-slate-200 dark:border-gray-800"
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-xl bg-app-blue-50 dark:bg-app-blue-9/00 p-4 shadow-sm">
                  <stat.icon className="h-6 w-6 text-app-blue-5/00 dark:text-app-blue-3/00" />
                </div>
                <div className="ml-6 w-0 flex-1">
                  <dt className="truncate text-sm font-semibold text-gray-500 dark:text-gray-300 tracking-widest uppercase">
                    {stat.name}
                  </dt>
                  <dd className="mt-2 text-2xl font-bold text-gray-700 dark:text-white">
                    {stat.value}
                  </dd>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Interviews */}
      <Card className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow pb-0 border dark:border-gray-800">
        <div className="flex items-center justify-between px-3 py-3">
          <h2 className="text-base font-medium text-gray-900 dark:text-white ml-5">
            Recent Interviews
          </h2>
        </div>
        <div>
          {recentInterviews.length > 0 ? (
            recentInterviews.map((interview: any) => (
              <div
                key={interview.id}
                className="flex items-center justify-between p-4 cursor-pointer border hover:bg-app-blue-50/20 dark:hover:bg-app-blue-900/30 transition-colors border-l-0 border-r-0 border-b border-gray-200 dark:border-gray-800"
                onClick={() =>
                  router.push(`/dashboard/interviews/${interview.id}`)
                }
              >
                <div className="flex-1 truncate">
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
                    <span>{interview.candidates || 0} candidates</span>
                    <span className="mx-2">&middot;</span>
                    <span className="text-xs opacity-90">{interview.date}</span>
                    <span className="mx-2">&middot;</span>
                    <span className="text-xs opacity-90">
                      {interview.created_by}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <ChevronRight className="mx-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500 dark:text-gray-300 text-sm">
              No interviews found.
            </div>
          )}
          {recentInterviews.length === 4 && !isLoading && (
            <Button
              onClick={() => router.push("/dashboard/interviews")}
              className="cursor-pointer text-xs w-full"
              variant="outline"
            >
              View all
            </Button>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white text-sm">
              Invite Candidates
            </CardTitle>
            <CardDescription className="dark:text-gray-300 text-xs">
              Send interview invitations to candidates via email.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <Button
              onClick={() => router.push("/dashboard/candidates/invite")}
              className="cursor-pointer text-xs"
              variant="outline"
            >
              Invite Now
            </Button>
          </CardFooter>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white text-sm">
              Create from Job Description
            </CardTitle>
            <CardDescription className="dark:text-gray-300 text-xs">
              Generate an AI-powered interview workflow using your job
              description.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <Button
              onClick={() =>
                router.push("/dashboard/interviews/from-description")
              }
              className="cursor-pointer text-xs"
              variant="outline"
            >
              Create Interview
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
