"use client";

import Link from "next/link";
import { Plus, Search, Filter, ChevronRight } from "lucide-react";

export default function InterviewsPage() {
  // Placeholder data - in a real application, this would come from an API
  const interviews = [
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
    {
      id: 5,
      title: "Backend Developer",
      candidates: 4,
      status: "draft",
      date: "2023-08-05",
    },
    {
      id: 6,
      title: "Marketing Specialist",
      candidates: 0,
      status: "draft",
      date: "2023-08-03",
    },
    {
      id: 7,
      title: "Data Scientist",
      candidates: 6,
      status: "completed",
      date: "2023-07-28",
    },
    {
      id: 8,
      title: "QA Engineer",
      candidates: 3,
      status: "completed",
      date: "2023-07-20",
    },
  ];

  // Status badge color mapping
  const statusColors = {
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    draft: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
        <div className="flex space-x-3">
          <Link
            href="/dashboard/interviews/from-description"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            From Job Description
          </Link>
          <Link
            href="/dashboard/interviews/new"
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Interview
          </Link>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search interviews"
            className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="inline-flex">
          <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <Filter className="mr-2 h-4 w-4 text-gray-400" />
            Filter
          </button>
        </div>
      </div>

      {/* Interviews List */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <ul className="divide-y divide-gray-200">
          {interviews.map((interview) => (
            <li key={interview.id} className="hover:bg-gray-50">
              <div className="flex items-center px-6 py-4">
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center space-x-3">
                    <h3 className="truncate text-sm font-medium text-gray-900">
                      {interview.title}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        statusColors[
                          interview.status as keyof typeof statusColors
                        ]
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
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    <span className="hidden sm:inline">View details</span>
                    <span className="inline sm:hidden">View</span>
                    <ChevronRight className="ml-1 inline-block h-4 w-4" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
