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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme ? useTheme() : { resolvedTheme: "light" };
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
    { name: "Jan", interviews: 12, completionRate: 75 },
    { name: "Feb", interviews: 19, completionRate: 78 },
    { name: "Mar", interviews: 18, completionRate: 81 },
    { name: "Apr", interviews: 24, completionRate: 84 },
    { name: "May", interviews: 29, completionRate: 85 },
    { name: "Jun", interviews: 31, completionRate: 88 },
    { name: "Jul", interviews: 32, completionRate: 87 },
    { name: "Aug", interviews: 36, completionRate: 89 },
    { name: "Sep", interviews: 34, completionRate: 90 },
    { name: "Oct", interviews: 40, completionRate: 88 },
    { name: "Nov", interviews: 35, completionRate: 89 },
    { name: "Dec", interviews: 42, completionRate: 91 },
  ];

  // Completion rates by role
  const completionRateByRole = [
    { name: "Frontend Dev", rate: 92 },
    { name: "UX Designer", rate: 88 },
    { name: "Product Mgr", rate: 85 },
    { name: "DevOps Eng", rate: 79 },
    { name: "Data Scientist", rate: 84 },
    { name: "Backend Dev", rate: 89 },
  ];

  // Performance distribution data
  const performanceDataLight = [
    { name: "Excellent", value: 24, color: "#A7F3D0" },
    { name: "Good", value: 42, color: "#BFDBFE" },
    { name: "Average", value: 22, color: "#FDE68A" },
    { name: "Below Average", value: 8, color: "#FDBA74" },
    { name: "Poor", value: 4, color: "#FCA5A5" },
  ];
  const performanceDataDark = [
    { name: "Excellent", value: 24, color: "#059669" }, // emerald-700
    { name: "Good", value: 42, color: "#2563EB" }, // blue-600
    { name: "Average", value: 22, color: "#F59E42" }, // amber-600
    { name: "Below Average", value: 8, color: "#EA580C" }, // orange-600
    { name: "Poor", value: 4, color: "#DC2626" }, // red-600
  ];
  const performanceData =
    resolvedTheme === "dark" ? performanceDataDark : performanceDataLight;

  // Weekly time-to-hire trend (in days)
  const timeToHireData = [
    { week: "Week 1", time: 21 },
    { week: "Week 2", time: 19 },
    { week: "Week 3", time: 20 },
    { week: "Week 4", time: 18 },
    { week: "Week 5", time: 17 },
    { week: "Week 6", time: 16 },
    { week: "Week 7", time: 18 },
    { week: "Week 8", time: 15 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-row justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-xs font-semibold opacity-50 dark:text-gray-300">
            Insights and performance metrics for your interview process.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="cursor-pointer">
            <Filter className="mr-2 h-4 w-4" />
            <span className="text-sm">Filter Data</span>
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-gray-900 dark:to-gray-800 shadow-md border border-slate-200 dark:border-gray-800"
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-xl bg-app-blue-50 dark:bg-app-blue-9/00 p-4 shadow-sm">
                  <stat.icon className="h-6 w-6 text-app-blue-5/00 dark:text-app-blue-3/00" />
                </div>
                <div className="ml-6 w-0 flex-1">
                  <dt className="truncate text-xs font-medium text-gray-500 tracking-wider uppercase dark:text-gray-300">
                    {stat.label}
                  </dt>
                  <dd className="mt-2 text-lg font-bold text-gray-900 tracking-tight dark:text-white">
                    {stat.value}
                  </dd>
                </div>
              </div>
              <div className="mt-4">
                <Badge
                  variant={
                    stat.changeType === "positive" ? "secondary" : "destructive"
                  }
                  className="font-normal text-xs tracking-wide"
                >
                  {stat.changeType === "positive" ? (
                    <TrendingUp className="-ml-1 mr-0.5 h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Activity className="-ml-1 mr-0.5 h-4 w-4 flex-shrink-0" />
                  )}
                  {stat.change}
                </Badge>
                <span className="ml-2 text-xs text-gray-500 tracking-wide dark:text-gray-300">
                  from last month
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Monthly Interview Trend Chart */}
        <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium tracking-tight dark:text-white">
              Monthly Interview Trends
            </CardTitle>
            <BarChartIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </CardHeader>
          <CardContent>
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
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="#cbd5e1"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="#cbd5e1" />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    itemStyle={{ fontSize: 12 }}
                    labelStyle={{ fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
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
          </CardContent>
        </Card>

        {/* Time to Hire Metrics */}
        <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium tracking-tight dark:text-white">
              Time to Hire Metrics
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-6">
              <div className="text-3xl font-bold text-app-blue-6/00 tracking-tight dark:text-app-blue-4/00">
                15
              </div>
              <div className="ml-4 text-gray-500 text-xs tracking-wide dark:text-gray-300">
                Average days
                <br />
                to hire
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
                <CardContent className="p-4 text-center">
                  <div className="text-green-800 dark:text-green-300 text-xs font-medium tracking-wider uppercase">
                    Fastest Hire
                  </div>
                  <div className="text-green-900 dark:text-green-100 text-lg font-semibold mt-1 tracking-tight">
                    9 days
                  </div>
                  <div className="text-green-700 dark:text-green-400 text-xs mt-1 tracking-wide">
                    Frontend Developer
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-app-blue-50 dark:bg-app-blue-900/20 border-app-blue-1/00 dark:border-app-blue-8/00">
                <CardContent className="p-4 text-center">
                  <div className="text-app-blue-8/00 dark:text-app-blue-3/00 text-xs font-medium tracking-wider uppercase">
                    Improvement
                  </div>
                  <div className="text-app-blue-9/00 dark:text-app-blue-1/00 text-lg font-semibold mt-1 tracking-tight">
                    -28%
                  </div>
                  <div className="text-app-blue-7/00 dark:text-app-blue-4/00 text-xs mt-1 tracking-wide">
                    vs. last quarter
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                <CardContent className="p-4 text-center">
                  <div className="text-blue-800 dark:text-blue-300 text-xs font-medium tracking-wider uppercase">
                    Top Performer
                  </div>
                  <div className="text-blue-900 dark:text-blue-100 text-lg font-semibold mt-1 tracking-tight">
                    UX Design
                  </div>
                  <div className="text-blue-700 dark:text-blue-400 text-xs mt-1 tracking-wide">
                    12 days avg. time
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
                <CardContent className="p-4 text-center">
                  <div className="text-purple-800 dark:text-purple-300 text-xs font-medium tracking-wider uppercase">
                    Goal
                  </div>
                  <div className="text-purple-900 dark:text-purple-100 text-lg font-semibold mt-1 tracking-tight">
                    14 days
                  </div>
                  <div className="text-purple-700 dark:text-purple-400 text-xs mt-1 tracking-wide">
                    by Q3 2025
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rates by Job Role */}
        <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium tracking-tight dark:text-white">
              Top Completion Rates by Role
            </CardTitle>
            <BarChartIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {completionRateByRole.map((role, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <div className="text-sm font-medium text-gray-700 tracking-wide dark:text-gray-300">
                    {role.name}
                  </div>
                  <div className="mt-1 flex items-center">
                    <div className="text-xs font-semibold text-gray-900 tracking-tight dark:text-white">
                      {role.rate}%
                    </div>
                    <div className="relative ml-3 flex h-3 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                      <div
                        className="bg-app-blue-400/80 dark:bg-app-blue-500/80"
                        style={{ width: `${role.rate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Candidate Performance Distribution */}
        <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-md font-medium tracking-tight dark:text-white">
              Candidate Performance Distribution
            </CardTitle>
            <PieChartIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </CardHeader>
          <CardContent className="h-80 flex flex-row items-center justify-center gap-8 p-0">
            <div className="flex items-center justify-center w-64 h-64 min-w-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceData}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ value, cx, cy, midAngle, outerRadius }) => {
                      // Improved label positioning: closer to the chart, smaller font
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 6;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      const isDark = resolvedTheme === "dark";
                      return (
                        <text
                          x={x}
                          y={y}
                          fill={isDark ? "#fff" : "#222"}
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          fontSize="12"
                          fontWeight="bold"
                        >
                          {`${value}%`}
                        </text>
                      );
                    }}
                    labelLine={false}
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, "Percentage"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3 min-w-[120px]">
              {performanceData.map((item, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="flex items-center justify-center gap-2 text-xs tracking-wide"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="font-semibold dark:text-white">
                    {item.name}
                  </div>
                  <div className="dark:text-gray-300">{item.value}%</div>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
