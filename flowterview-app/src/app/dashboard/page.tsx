"use client";

import Link from "next/link";
import { FileText, Users, Activity, ChevronRight, Plus } from "lucide-react";

export default function DashboardPage() {
  // Placeholder data - in a real application, this would come from an API
  const stats = [
    {
      id: 1,
      name: "Active Interviews",
      value: "12",
      icon: FileText,
      color: "bg-blue-400",
    },
    {
      id: 2,
      name: "Total Candidates",
      value: "48",
      icon: Users,
      color: "bg-green-400",
    },
    {
      id: 3,
      name: "Completion Rate",
      value: "92%",
      icon: Activity,
      color: "bg-purple-400",
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
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/dashboard/interviews/new"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Interview
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="truncate text-sm font-medium text-gray-500">
                    {stat.name}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {stat.value}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Interviews */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">
            Recent Interviews
          </h2>
          <Link
            href="/dashboard/interviews"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-200 px-6">
          {recentInterviews.map((interview) => (
            <div
              key={interview.id}
              className="flex items-center justify-between py-4"
            >
              <div className="flex-1 truncate">
                <div className="flex items-center space-x-3">
                  <h3 className="truncate text-sm font-medium text-gray-900">
                    {interview.title}
                  </h3>
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      interview.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {interview.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <span>{interview.candidates} candidates</span>
                  <span className="mx-1">&middot;</span>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <Link
                  href={`/dashboard/interviews/${interview.id}`}
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  View
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg bg-gradient-to-bl from-indigo-700 to-indigo-400 shadow">
          <div className="px-6 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-white">
              Create from Job Description
            </h3>
            <div className="mt-2 max-w-xl text-sm text-indigo-100">
              <p>
                Generate an AI-powered interview workflow using your job
                description.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/interviews/from-description"
                className="inline-flex items-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50"
              >
                Generate Workflow
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-gradient-to-bl from-green-900 to-green-300 shadow">
          <div className="px-6 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-white">
              Invite Candidates
            </h3>
            <div className="mt-2 max-w-xl text-sm text-green-100">
              <p>Send interview invitations to candidates via email.</p>
            </div>
            <div className="mt-4">
              <Link
                href="/dashboard/candidates/invite"
                className="inline-flex items-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-green-600 shadow-sm hover:bg-green-50"
              >
                Invite Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
