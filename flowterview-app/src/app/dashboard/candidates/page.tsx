"use client";

import Link from "next/link";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

export default function CandidatesPage() {
  const router = useRouter();
  const candidates = [
    {
      id: 1,
      name: "Alex Johnson",
      email: "alex@example.com",
      position: "Frontend Developer",
      status: "Pending",
      date: "2023-08-15",
    },
    {
      id: 2,
      name: "Samantha Smith",
      email: "samantha@example.com",
      position: "UX Designer",
      status: "Completed",
      date: "2023-08-14",
    },
    {
      id: 3,
      name: "Michael Brown",
      email: "michael@example.com",
      position: "Product Manager",
      status: "In Progress",
      date: "2023-08-12",
    },
    {
      id: 4,
      name: "Jessica Lee",
      email: "jessica@example.com",
      position: "DevOps Engineer",
      status: "Pending",
      date: "2023-08-10",
    },
    {
      id: 5,
      name: "David Wilson",
      email: "david@example.com",
      position: "Backend Developer",
      status: "Completed",
      date: "2023-08-08",
    },
    {
      id: 6,
      name: "Rachel Green",
      email: "rachel@example.com",
      position: "Marketing Specialist",
      status: "Pending",
      date: "2023-08-05",
    },
    {
      id: 7,
      name: "Daniel Taylor",
      email: "daniel@example.com",
      position: "Data Scientist",
      status: "In Progress",
      date: "2023-08-03",
    },
    {
      id: 8,
      name: "Emma Davis",
      email: "emma@example.com",
      position: "QA Engineer",
      status: "Completed",
      date: "2023-07-28",
    },
  ];

  // Status badge color mapping
  const statusColors = {
    Pending: "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-100 text-blue-800",
    Completed: "bg-green-100 text-green-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-end space-y-4 md:flex-row md:items-center md:space-y-0">
        <Button
          onClick={() => router.push("/dashboard/candidates/invite")}
          className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Invite Candidates
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search interviews"
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

      {/* Candidates Table */}
      <Card className="overflow-hidden rounded-lg bg-white shadow p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Position
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Date Added
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {candidate.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {candidate.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {candidate.position}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        statusColors[
                          candidate.status as keyof typeof statusColors
                        ]
                      }`}
                    >
                      {candidate.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(candidate.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
