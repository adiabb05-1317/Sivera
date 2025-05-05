"use client";

import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Activity,
  Clock,
  CheckCircle,
  UserCheck,
  TrendingUp,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30");
  
  // Placeholder data - in a real application, this would come from an API
  const stats = [
    {
      label: "Total Interviews",
      value: "42",
      icon: BarChartIcon,
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

  // Monthly trend data for interviews
  const monthlyTrendData = [
    { name: 'Jan', interviews: 12, completionRate: 75 },
    { name: 'Feb', interviews: 19, completionRate: 78 },
    { name: 'Mar', interviews: 18, completionRate: 81 },
    { name: 'Apr', interviews: 24, completionRate: 84 },
    { name: 'May', interviews: 29, completionRate: 85 },
    { name: 'Jun', interviews: 31, completionRate: 88 },
    { name: 'Jul', interviews: 32, completionRate: 87 },
    { name: 'Aug', interviews: 36, completionRate: 89 },
    { name: 'Sep', interviews: 34, completionRate: 90 },
    { name: 'Oct', interviews: 40, completionRate: 88 },
    { name: 'Nov', interviews: 35, completionRate: 89 },
    { name: 'Dec', interviews: 42, completionRate: 91 },
  ];

  // Completion rates by role
  const completionRateByRole = [
    { name: 'Frontend Dev', rate: 92 },
    { name: 'UX Designer', rate: 88 },
    { name: 'Product Mgr', rate: 85 },
    { name: 'DevOps Eng', rate: 79 },
    { name: 'Data Scientist', rate: 84 },
    { name: 'Backend Dev', rate: 89 },
  ];

  // Performance distribution data
  const performanceData = [
    { name: 'Excellent', value: 24, color: '#34D399' },
    { name: 'Good', value: 42, color: '#60A5FA' },
    { name: 'Average', value: 22, color: '#FBBF24' },
    { name: 'Below Average', value: 8, color: '#F97316' },
    { name: 'Poor', value: 4, color: '#EF4444' },
  ];

  // Weekly time-to-hire trend (in days)
  const timeToHireData = [
    { week: 'Week 1', time: 21 },
    { week: 'Week 2', time: 19 },
    { week: 'Week 3', time: 20 },
    { week: 'Week 4', time: 18 },
    { week: 'Week 5', time: 17 },
    { week: 'Week 6', time: 16 },
    { week: 'Week 7', time: 18 },
    { week: 'Week 8', time: 15 },
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
          <div className="relative inline-block text-left">
            <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Last {timeRange} Days
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
          </div>
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
        {/* Monthly Interview Trend Chart */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <BarChartIcon className="h-5 w-5 text-gray-400" />
              <h3 className="ml-2 text-lg font-medium leading-6 text-gray-900">
                Monthly Interview Trends
              </h3>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyTrendData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="interviews" 
                    name="Total Interviews"
                    stroke="#6366F1" 
                    fill="#6366F1" 
                    fillOpacity={0.2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completionRate" 
                    name="Completion Rate (%)"
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Completion Rates by Job Role - Simplified */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <BarChartIcon className="h-5 w-5 text-gray-400" />
              <h3 className="ml-2 text-lg font-medium leading-6 text-gray-900">
                Top Completion Rates by Role
              </h3>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-2 gap-4">
              {completionRateByRole.map((role, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <div className="text-sm font-medium text-gray-700">{role.name}</div>
                  <div className="mt-1 flex items-end">
                    <div className="text-2xl font-semibold text-gray-900">{role.rate}%</div>
                    <div className="relative ml-3 flex h-3 w-full overflow-hidden rounded bg-gray-200">
                      <div
                        className="bg-indigo-600"
                        style={{ width: `${role.rate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Candidate Performance Distribution */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <PieChartIcon className="h-5 w-5 text-gray-400" />
              <h3 className="ml-2 text-lg font-medium leading-6 text-gray-900">
                Candidate Performance Distribution
              </h3>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1">
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

        {/* Time to Hire - Simplified */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400" />
              <h3 className="ml-2 text-lg font-medium leading-6 text-gray-900">
                Time to Hire Metrics
              </h3>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="text-6xl font-bold text-indigo-600">15</div>
              <div className="ml-4 text-gray-500 text-lg">Average days<br />to hire</div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                <div className="text-green-800 text-sm font-medium">Fastest Hire</div>
                <div className="text-green-900 text-2xl font-semibold mt-1">9 days</div>
                <div className="text-green-700 text-xs mt-1">Frontend Developer</div>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-center">
                <div className="text-indigo-800 text-sm font-medium">Improvement</div>
                <div className="text-indigo-900 text-2xl font-semibold mt-1">-28%</div>
                <div className="text-indigo-700 text-xs mt-1">vs. last quarter</div>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                <div className="text-blue-800 text-sm font-medium">Top Performer</div>
                <div className="text-blue-900 text-2xl font-semibold mt-1">UX Design</div>
                <div className="text-blue-700 text-xs mt-1">12 days avg. time</div>
              </div>
              
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-center">
                <div className="text-purple-800 text-sm font-medium">Goal</div>
                <div className="text-purple-900 text-2xl font-semibold mt-1">14 days</div>
                <div className="text-purple-700 text-xs mt-1">by Q3 2025</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
