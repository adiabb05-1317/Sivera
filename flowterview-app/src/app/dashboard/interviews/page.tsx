"use client";

import { Search, Filter, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth-client";

export default function InterviewsPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_FLOWTERVIEW_BACKEND_URL ||
          "http://localhost:8010";
        const resp = await authenticatedFetch(
          `${backendUrl}/api/v1/interviews`
        );
        console.log(resp);
        if (!resp.ok) throw new Error("Failed to fetch interviews");
        const data = await resp.json();
        setInterviews(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch interviews");
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, []);

  // Status badge color mapping
  const statusColors = {
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    draft: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6 overflow-auto">
      <div className="flex flex-col justify-end items-center space-y-4 md:flex-row md:items-center md:space-y-0 gap-3">
        <Button
          onClick={() => router.push("/dashboard/interviews/from-description")}
          className="cursor-pointer border border-indigo-500/80 dark:border-indigo-400/80 hover:bg-indigo-500/10 dark:hover:bg-indigo-900/20 text-indigo-500 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-200 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
          variant="outline"
        >
          New Interview
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <Input
            type="text"
            placeholder="Search interviews"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-10 pr-3 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          />
        </div>
        <div className="inline-flex">
          <Button className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 cursor-pointer">
            <Filter className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            Filter
          </Button>
        </div>
      </div>

      {/* Interviews List */}
      <Card className="overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow p-0 border dark:border-gray-800">
        {loading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-300">
            Loading interviews...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 dark:text-red-400">
            {error}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {interviews.length > 0 ? (
              interviews.map((interview) => (
                <li key={interview.id} className="group">
                  <CardContent
                    className="flex items-center px-6 py-4 flex-row rounded-none cursor-pointer transition-colors border-l-0 border-r-0 border-b border-gray-200 dark:border-gray-800 group-hover:bg-indigo-50/20 dark:group-hover:bg-indigo-900/30"
                    onClick={() =>
                      router.push(`/dashboard/interviews/${interview.id}`)
                    }
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center space-x-3">
                        <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {interview.title}
                        </h3>
                        <Badge
                          variant={
                            interview.status === "completed"
                              ? "secondary"
                              : "outline"
                          }
                          className={`${
                            interview.status === "completed"
                              ? "bg-indigo-100/90 dark:bg-indigo-900/40"
                              : ""
                          } font-normal text-xs`}
                        >
                          {interview.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-300">
                        <span>{interview.candidates} candidates</span>
                        <span className="mx-1">&middot;</span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <ArrowRight className="mx-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  </CardContent>
                </li>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-300 text-sm">
                No interviews found.
              </div>
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}
