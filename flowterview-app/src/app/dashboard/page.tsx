"use client";

import Link from "next/link";
import {
  FileText,
  Users,
  Activity,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
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

export default function DashboardPage() {
  const router = useRouter();

  // Placeholder data - in a real application, this would come from an API
  const stats = [
    {
      id: 1,
      name: "Active Interviews",
      value: "12",
      icon: FileText,
    },
    {
      id: 2,
      name: "Total Candidates",
      value: "48",
      icon: Users,
    },
    {
      id: 3,
      name: "Completion Rate",
      value: "92%",
      icon: Activity,
    },
  ];

  const recentInterviews = [
    {
      id: 1,
      title: "Frontend Developer",
      candidates: 5,
      status: "active",
      date: "2023-08-15",
    },
    {
      id: 2,
      title: "UX Designer",
      candidates: 3,
      status: "active",
      date: "2023-08-14",
    },
    {
      id: 3,
      title: "Product Manager",
      candidates: 7,
      status: "completed",
      date: "2023-08-10",
    },
    {
      id: 4,
      title: "DevOps Engineer",
      candidates: 2,
      status: "active",
      date: "2023-08-08",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card
            key={stat.id}
            className="overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 shadow-md border border-slate-200"
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-xl bg-indigo-50 p-4 shadow-sm">
                  <stat.icon className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="ml-6 w-0 flex-1">
                  <dt className="truncate text-sm font-semibold text-gray-500 tracking-wide uppercase">
                    {stat.name}
                  </dt>
                  <dd className="mt-2 text-4xl font-bold text-gray-900">
                    {stat.value}
                  </dd>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Interviews */}
      <Card className="overflow-hidden rounded-lg bg-white shadow pb-0">
        <div className="flex items-center justify-between px-3 py-3">
          <h2 className="text-lg font-medium text-gray-900 ml-5">
            Recent Interviews
          </h2>
        </div>
        <div>
          {recentInterviews.map((interview) => (
            <div
              key={interview.id}
              className="flex items-center justify-between p-4 cursor-pointer border hover:bg-indigo-50/20 border-l-0 border-r-0"
              onClick={() =>
                router.push(`/dashboard/interviews/${interview.id}`)
              }
            >
              <div className="flex-1 truncate">
                <div className="flex items-center space-x-3">
                  <h3 className="truncate text-sm font-medium text-gray-900">
                    {interview.title}
                  </h3>
                  <Badge
                    variant={
                      interview.status === "active" ? "secondary" : "outline"
                    }
                    className={`${
                      interview.status !== "active" ? "bg-indigo-100/90" : ""
                    } font-normal text-xs`}
                  >
                    {interview.status}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <span>{interview.candidates} candidates</span>
                  <span className="mx-1">&middot;</span>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <ChevronRight className="mx-3 h-4 w-4" />
              </div>
            </div>
          ))}
          <Button
            onClick={() => router.push("/dashboard/interviews")}
            className="cursor-pointer w-full h-full border-t border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-0"
          >
            View all
          </Button>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invite Candidates</CardTitle>
            <CardDescription>
              Send interview invitations to candidates via email.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <Button
              onClick={() => router.push("/dashboard/candidates/invite")}
              className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
              variant="outline"
            >
              Invite Now
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Create from Job Description</CardTitle>
            <CardDescription>
              Generate an AI-powered interview workflow using your job
              description.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <Button
              onClick={() =>
                router.push("/dashboard/interviews/from-description")
              }
              variant="outline"
              className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
            >
              Generate Workflow
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
