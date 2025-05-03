"use client";

import {
  BarChart,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  UserCheck,
  TrendingUp,
  Filter,
} from "lucide-react";

export default function AnalyticsPage() {
  // Placeholder data - in a real application, this would come from an API
  const stats = [
    {
      label: "Total Interviews",
      value: "42",
      icon: BarChart,
      change: "+24%",
      changeType: "positive",
    },
    {
      label: "Completion Rate",
      value: "88%",
      icon: CheckCircle,
      change: "+12%",
      changeType: "positive",
    },
    {
      label: "Avg. Time to Complete",
      value: "18 min",
      icon: Clock,
      change: "-5%",
      changeType: "positive",
    },
    {
      label: "Candidate Satisfaction",
      value: "4.7/5",
      icon: UserCheck,
      change: "+0.3",
      changeType: "positive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex space-x-3">
          <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <Filter className="mr-2 h-4 w-4" />
            Filter Data
          </button>
          <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      {stat.label}
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div
                  className={`inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium ${
                    stat.changeType === "positive"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {stat.changeType === "positive" ? (
                    <TrendingUp className="-ml-1 mr-0.5 h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Activity className="-ml-1 mr-0.5 h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="sr-only">
                    {stat.changeType === "positive"
                      ? "Increased by"
                      : "Decreased by"}
                  </span>
                  {stat.change}
                </div>
                <span className="ml-2 text-sm text-gray-500">
                  from last month
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Interview Completion Chart */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <BarChart className="h-5 w-5 text-gray-400" />
              <h3 className="ml-2 text-lg font-medium leading-6 text-gray-900">
                Interview Completion Rates
              </h3>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            {/* In a real application, this would be a proper chart component */}
            <div className="h-64 w-full rounded-md bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500">
                Interactive chart would be displayed here
              </p>
            </div>
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-5 text-center text-sm text-gray-600">
                <div>
                  <span className="font-semibold">Front-end Developer:</span>{" "}
                  92%
                </div>
                <div>
                  <span className="font-semibold">UX Designer:</span> 88%
                </div>
                <div>
                  <span className="font-semibold">Product Manager:</span> 85%
                </div>
                <div>
                  <span className="font-semibold">DevOps Engineer:</span> 79%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <PieChart className="h-5 w-5 text-gray-400" />
              <h3 className="ml-2 text-lg font-medium leading-6 text-gray-900">
                Candidate Performance Distribution
              </h3>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            {/* In a real application, this would be a proper chart component */}
            <div className="h-64 w-full rounded-md bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500">
                Interactive chart would be displayed here
              </p>
            </div>
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-md bg-green-100 p-2 text-green-800">
                  <div className="font-semibold">Excellent</div>
                  <div>24%</div>
                </div>
                <div className="rounded-md bg-blue-100 p-2 text-blue-800">
                  <div className="font-semibold">Good</div>
                  <div>42%</div>
                </div>
                <div className="rounded-md bg-yellow-100 p-2 text-yellow-800">
                  <div className="font-semibold">Average</div>
                  <div>22%</div>
                </div>
                <div className="rounded-md bg-orange-100 p-2 text-orange-800">
                  <div className="font-semibold">Below Average</div>
                  <div>8%</div>
                </div>
                <div className="rounded-md bg-red-100 p-2 text-red-800">
                  <div className="font-semibold">Poor</div>
                  <div>4%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
