"use client";

import { FileText, Users, Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/useStores";

export default function DashboardPage() {
  const router = useRouter();

  // Use our dashboard hook for comprehensive data
  const { candidates, jobs, interviews, isLoading, hasError, refreshAll } =
    useDashboard();

  // Calculate stats from store data
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
      value: candidates.getCandidatesCount().toString(),
      icon: Users,
    },
    {
      id: 3,
      name: "Completion Rate",
      value: "92%", // You can calculate this from actual data
      icon: Activity,
    },
  ];

  // Get recent interviews (limited to 4)
  const recentInterviews = interviews.allInterviews.slice(0, 4);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading dashboard data</p>
          <Button onClick={refreshAll} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-xs font-semibold opacity-50 dark:text-gray-300">
          Overview of your interview activities and key metrics.
        </p>
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
                  <dt className="truncate text-sm font-semibold text-gray-500 dark:text-gray-300 tracking-wide uppercase">
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
            recentInterviews.map((interview) => (
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
                      variant={
                        interview.status === "active" ? "secondary" : "outline"
                      }
                      className={`${
                        interview.status !== "active"
                          ? "bg-app-blue-100/90 dark:bg-app-blue-900/40"
                          : ""
                      } font-normal text-xs`}
                    >
                      {interview.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-300">
                    <span>{interview.candidates || 0} candidates</span>
                    <span className="mx-1">&middot;</span>
                    <span>{interview.date}</span>
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
              className="cursor-pointer w-full h-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 border-0"
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
            <CardTitle className="dark:text-white">Invite Candidates</CardTitle>
            <CardDescription className="dark:text-gray-300">
              Send interview invitations to candidates via email.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <Button
              onClick={() => router.push("/dashboard/candidates/invite")}
              className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
              variant="outline"
            >
              Invite Now
            </Button>
          </CardFooter>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white">
              Create from Job Description
            </CardTitle>
            <CardDescription className="dark:text-gray-300">
              Generate an AI-powered interview workflow using your job
              description.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <Button
              onClick={() =>
                router.push("/dashboard/interviews/from-description")
              }
              className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
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
