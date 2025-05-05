"use client";

import { Search, Filter, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function WorkflowsPage() {
  const router = useRouter();
  // Updated placeholder data
  const workflows = [
    {
      id: 1,
      title: "Amazon ML Engineer",
      date: "2023-08-15",
    },
    {
      id: 2,
      title: "Google SWE",
      date: "2023-08-14",
    },
    {
      id: 3,
      title: "ServiceNow Engineer",
      date: "2023-08-10",
    },
    {
      id: 4,
      title: "Microsoft Cloud Architect",
      date: "2023-08-08",
    },
    {
      id: 5,
      title: "Netflix Backend Developer",
      date: "2023-08-05",
    },
    {
      id: 6,
      title: "Meta Marketing Specialist",
      date: "2023-08-03",
    },
    {
      id: 7,
      title: "OpenAI Data Scientist",
      date: "2023-07-28",
    },
    {
      id: 8,
      title: "Apple QA Engineer",
      date: "2023-07-20",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-end items-center space-y-4 md:flex-row md:items-center md:space-y-0 gap-3">
        <Button
          onClick={() => router.push("/dashboard/interviews/from-description")}
          className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
          variant="outline"
        >
          <Sparkles className="mr-2" />
          Create New Workflow
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search workflows"
            className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="inline-flex">
          <Button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer">
            <Filter className="mr-2 h-4 w-4 text-gray-400" />
            Filter
          </Button>
        </div>
      </div>

      {/* Interviews List */}
      <Card className="overflow-hidden rounded-lg bg-white shadow p-0">
        <ul className="divide-y divide-gray-200">
          {workflows.map((workflow) => (
            <li key={workflow.id} className="hover:bg-gray-50">
              <CardContent
                className="flex items-center px-6 py-4 flex-row rounded-none cursor-pointer"
                onClick={() =>
                  router.push(
                    `/dashboard/workflows/flow-display/${workflow.id}/${workflow.title}`
                  )
                }
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center space-x-3">
                    <h3 className="truncate text-sm font-medium text-gray-900">
                      {workflow.title}
                    </h3>
                  </div>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <span>
                      Created on: {new Date(workflow.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <ArrowRight className="mx-3 h-4 w-4" />
                </div>
              </CardContent>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
