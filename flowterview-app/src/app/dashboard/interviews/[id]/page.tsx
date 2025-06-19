"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  Mail,
  Users,
  Brain,
  Clock,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { updateInterviewStatus } from "@/lib/supabase-candidates";
import { useToast } from "@/hooks/use-toast";
import { BulkInviteDialog } from "@/components/ui/bulk-invite-dialog";
import { useInterviewDetails } from "@/hooks/useStores";
import {
  authenticatedFetch,
  getCookie,
  getUserContext,
} from "@/lib/auth-client";

// Move nodeTypes outside the component to prevent recreation on every render
interface Candidate {
  id: string;
  name: string;
  email: string;
  status?: string;
  job_id?: string;
  is_invited?: boolean;
  interview_status?: string;
  room_url?: string;
  bot_token?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  organization_id?: string;
}

interface Interview {
  id: string;
  status: "draft" | "active" | "completed";
  candidates_invited: string[];
  job_id: string;
}

interface CandidatesData {
  invited: Candidate[];
  available: Candidate[];
  total_job_candidates: number;
  invited_count: number;
  available_count: number;
}

interface InterviewData {
  job: Job;
  interview: Interview;
  candidates: CandidatesData;
  skills: string[];
  duration: number;
}

export default function InterviewDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  // Use our store hooks instead of manual API calls
  const {
    details,
    isLoading: loading,
    error,
  } = useInterviewDetails(id as string);
  const [job, setJob] = useState<Job | null>(null);
  const [invitedCandidates, setInvitedCandidates] = useState<Candidate[]>([]);
  const [availableCandidates, setAvailableCandidates] = useState<Candidate[]>(
    []
  );
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [interviewStatus, setInterviewStatus] = useState<
    "draft" | "active" | "completed"
  >("draft");

  // Skills and timer state
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [selectedTimer, setSelectedTimer] = useState(10);
  const [saving, setSaving] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [firstChange, setFirstChange] = useState(false);

  const { toast } = useToast();

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "http://localhost:8010";
  const CORE_BACKEND_URL =
    process.env.NEXT_PUBLIC_CORE_BACKEND_URL || "http://localhost:8000";

  // Timer options and logic
  const timerOptions = [10, 20, 30];

  const getTimerStatus = (time: number) => {
    const skillCount = selectedSkills.length;
    if (time === 10 && skillCount >= 6)
      return { disabled: true, reason: "10 mins is too short for 6+ skills" };
    if (time === 20 && skillCount >= 11)
      return { disabled: true, reason: "20 mins is too short for 11+ skills" };
    return { disabled: false, reason: "" };
  };

  // Auto-adjust timer based on skill count
  useEffect(() => {
    if (firstChange === false) return;
    const skillCount = selectedSkills.length;
    if (skillCount >= 11) {
      setSelectedTimer(30);
    } else if (skillCount >= 6) {
      setSelectedTimer(20);
    } else {
      setSelectedTimer(10);
    }
  }, [selectedSkills.length]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((s) => s !== skill);
      } else {
        // Limit to 15 skills maximum
        if (prev.length >= 15) {
          toast({
            title: "Maximum skills reached",
            description: "You can select up to 15 skills maximum.",
            variant: "destructive",
          });
          return prev;
        }
        return [...prev, skill];
      }
    });
  };

  const addCustomSkill = () => {
    setFirstChange(true);
    if (newSkill.trim() && !selectedSkills.includes(newSkill.trim())) {
      // Limit to 15 skills maximum
      if (selectedSkills.length >= 15) {
        toast({
          title: "Maximum skills reached",
          description: "You can select up to 15 skills maximum.",
          variant: "destructive",
        });
        return;
      }
      setSelectedSkills((prev) => [...prev, newSkill.trim()]);
      setExtractedSkills((prev) => [...prev, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
  };

  // Update local state when store data changes
  useEffect(() => {
    if (details) {
      setJob(details.job);
      setInterviewStatus(details.interview.status || "draft");
      setInvitedCandidates(details.candidates.invited || []);
      // Don't set availableCandidates from backend - we fetch them manually

      // Set skills and duration from the flow data
      if (details.skills && details.skills.length > 0) {
        setSelectedSkills(details.skills);
        setExtractedSkills(details.skills);
      }

      // Set timer duration from flow data
      if (details.duration) {
        setSelectedTimer(details.duration);
      }
    }
  }, [details]);

  const handleSaveChanges = async () => {
    const user_id = getCookie("user_id");
    const organization_id = getCookie("organization_id");

    if (!user_id || !organization_id) {
      toast({
        title: "Authentication Error",
        description: "Missing user or organization information",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Generate new flow data with updated skills and duration
      const flowData = await fetch(
        `${CORE_BACKEND_URL}/api/v1/generate_interview_flow_from_description`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_role: job?.title || "",
            job_description: job?.description || "",
            skills: selectedSkills,
            duration: selectedTimer,
          }),
        }
      );

      if (!flowData.ok) {
        throw new Error(`Flow generation failed: ${flowData.status}`);
      }

      const flowDataJson = await flowData.json();

      // Update the interview flow with new skills, duration, and flow_json
      const updateData = {
        skills: selectedSkills,
        duration: selectedTimer,
        flow_json: flowDataJson,
      };

      // Find the flow_id from the job details
      const flowId = (details?.job as any)?.flow_id;
      if (!flowId) {
        throw new Error("Could not find interview flow ID");
      }

      const response = await authenticatedFetch(
        `${BACKEND_URL}/api/v1/interviews/interview-flows/${flowId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Update failed: ${response.status} - ${errorText}`);
      }

      toast({
        title: "Success!",
        description: "Interview settings updated successfully",
      });

      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error("Error updating interview:", error);
      toast({
        title: "Error updating interview",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInvitesSent = () => {
    // Refresh the data after invites are sent
    window.location.reload();
  };

  // Fetch available candidates for bulk invite
  const fetchAvailableCandidates = async () => {
    if (!job?.id) {
      toast({
        title: "Error",
        description: "No job_id found for this interview",
        variant: "destructive",
      });
      return;
    }

    setLoadingCandidates(true);
    try {
      // Directly fetch candidates by job_id - much simpler approach
      const candidatesResp = await authenticatedFetch(
        `${BACKEND_URL}/api/v1/candidates/by-job/${job.id}`
      );

      if (!candidatesResp.ok) {
        if (candidatesResp.status === 404) {
          // No candidates found for this job
          setAvailableCandidates([]);
          setBulkInviteOpen(true);
          return;
        }
        throw new Error(`Failed to fetch candidates: ${candidatesResp.status}`);
      }

      const allCandidates = await candidatesResp.json();

      // Show all candidates - the dialog can handle filtering if needed
      setAvailableCandidates(allCandidates || []);
      setBulkInviteOpen(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch candidates";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Get candidates available for bulk invite (not already invited)
  const getAvailableCandidates = () => {
    return availableCandidates;
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex items-center m-3 ml-0">
        <Button
          onClick={() => router.push("/dashboard/interviews")}
          variant="link"
          className="mr-2 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col justify-center gap-1">
          <h2 className="text-xl font-bold dark:text-white">
            {job?.title || "Loading..."}
          </h2>
          <h4 className="text-xs font-semibold opacity-50 dark:text-gray-300">
            Interview Details
          </h4>
        </div>
      </div>
      {loading ? (
        <div className="p-6 text-center text-gray-500 dark:text-gray-300">
          Loading interview...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          <div
            className="flex flex-col gap-6 px-4"
            style={{ minHeight: "calc(100vh - 100px)" }}
          >
            {/* Skills and Timer Configuration */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <CardContent className="py-4 px-3">
                <div className="m-5 mt-0 flex items-center justify-between">
                  <h3 className="font-semibold mb-2 dark:text-white">
                    Interview Configuration
                  </h3>
                  {firstChange && (
                    <Button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      variant="outline"
                      className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
                    >
                      {saving && (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      )}
                      {!saving && <Save className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Skills Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        <label className="text-sm font-medium dark:text-gray-200">
                          Skills
                        </label>
                      </div>
                      {selectedSkills.length >= 15 && (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          Maximum skills reached
                        </div>
                      )}
                    </div>

                    {/* Selected Skills Display */}
                    <div className="flex flex-wrap gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 min-h-[60px]">
                      {selectedSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="flex items-center gap-1 px-3 py-2 bg-app-blue-100 text-app-blue-800 dark:bg-app-blue-900/30 dark:text-app-blue-300"
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(skill)}
                            className="ml-1 hover:bg-app-blue-200 dark:hover:bg-app-blue-800 rounded-full p-0.5 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {selectedSkills.length === 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          No skills selected
                        </div>
                      )}
                    </div>

                    {/* Available Skills */}
                    {extractedSkills.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Available Skills (click to add)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {extractedSkills
                            .filter((skill) => !selectedSkills.includes(skill))
                            .map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 ${
                                  selectedSkills.length >= 15
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                onClick={() => toggleSkill(skill)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {skill}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Add Custom Skill */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom skill..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && addCustomSkill()
                        }
                        className="flex-1"
                        disabled={selectedSkills.length >= 15}
                      />
                      <Button
                        onClick={addCustomSkill}
                        variant="outline"
                        size="sm"
                        disabled={
                          !newSkill.trim() || selectedSkills.length >= 15
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Timer Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium dark:text-gray-200 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Interview duration
                      </label>
                    </div>

                    <div className="flex justify-center">
                      <Carousel className="w-full max-w-xs">
                        <CarouselContent>
                          {timerOptions.map((time) => {
                            const status = getTimerStatus(time);
                            return (
                              <CarouselItem key={time} className="basis-1/3">
                                <div className="p-1">
                                  <Card
                                    className={`cursor-pointer transition-all duration-200 border border-gray-300 dark:border-gray-700 ${
                                      selectedTimer === time
                                        ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/20"
                                        : status.disabled
                                        ? "opacity-30 cursor-not-allowed border-red-300 bg-red-50 dark:bg-red-900/10"
                                        : "hover:border-gray-400"
                                    }`}
                                    onClick={() => {
                                      if (!status.disabled) {
                                        setSelectedTimer(time);
                                        setFirstChange(true);
                                      }
                                    }}
                                    title={
                                      status.disabled
                                        ? status.reason
                                        : `Select ${time} minutes`
                                    }
                                  >
                                    <CardContent className="flex aspect-square items-center justify-center p-6">
                                      <span
                                        className={`text-2xl font-semibold flex flex-col items-center justify-center ${
                                          selectedTimer === time
                                            ? "text-app-blue-600 dark:text-app-blue-400"
                                            : status.disabled
                                            ? "text-red-500 dark:text-red-400"
                                            : "text-gray-700 dark:text-gray-300"
                                        }`}
                                      >
                                        <div className="text-2xl font-semibold">
                                          {time}
                                        </div>
                                        <div className="text-xs">minutes</div>
                                      </span>
                                    </CardContent>
                                  </Card>
                                </div>
                              </CarouselItem>
                            );
                          })}
                        </CarouselContent>
                      </Carousel>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Candidates Section */}
            <div className="w-full">
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <CardContent className="py-4 px-3">
                  <div className="m-5 mt-0 flex items-center justify-between">
                    <h3 className="font-semibold mb-2 dark:text-white">
                      Candidates
                    </h3>
                    <div className="flex items-center gap-2">
                      <Select
                        value={interviewStatus}
                        onValueChange={async (
                          value: "draft" | "active" | "completed"
                        ) => {
                          try {
                            await updateInterviewStatus(id as string, value);
                            setInterviewStatus(value);
                            toast({
                              title: "Interview status updated",
                              description: `Status set to ${value}`,
                            });
                          } catch (err) {
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Failed to update status";
                            toast({
                              title: "Failed to update status",
                              description: errorMessage,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px] ml-2">
                          <SelectValue placeholder="Interview Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Bulk Invite Button */}
                      <Button
                        onClick={fetchAvailableCandidates}
                        disabled={loadingCandidates}
                        className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        variant="outline"
                      >
                        {loadingCandidates ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Invite Candidates
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() =>
                          router.push(
                            `/dashboard/candidates/invite?interview=${id}`
                          )
                        }
                        className="cursor-pointer border border-app-blue-500/80 dark:border-app-blue-400/80 hover:bg-app-blue-500/10 dark:hover:bg-app-blue-900/20 text-app-blue-5/00 dark:text-app-blue-3/00 hover:text-app-blue-6/00 dark:hover:text-app-blue-2/00 focus:ring-app-blue-5/00 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
                        variant="outline"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Candidate
                      </Button>
                    </div>
                  </div>
                  {invitedCandidates.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No candidates assigned
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Get started by adding candidates to this interview.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table
                        className="min-w-full rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-800 table-fixed"
                        style={{ borderRadius: 12, overflow: "hidden" }}
                      >
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 w-1/4 max-w-[180px] truncate">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 w-1/3 max-w-[220px] truncate">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 w-1/5 max-w-[120px] truncate">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                          {(showAllCandidates
                            ? invitedCandidates
                            : invitedCandidates.slice(0, 3)
                          ).map((candidate) => (
                            <tr
                              key={candidate.id}
                              className="transition-colors cursor-pointer hover:bg-app-blue-50/20 dark:hover:bg-app-blue-900/30"
                            >
                              <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white max-w-[180px] truncate overflow-hidden">
                                {candidate.name}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 max-w-[220px] truncate overflow-hidden">
                                {candidate.email}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-sm max-w-[120px] truncate overflow-hidden">
                                <span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-full px-2 py-1 text-xs font-semibold truncate inline-block max-w-[100px] overflow-hidden">
                                  {candidate.interview_status ||
                                    candidate.status ||
                                    "scheduled"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {invitedCandidates.length > 3 && !showAllCandidates && (
                        <div className="flex justify-center mt-2">
                          <Button
                            variant="outline"
                            className="text-app-blue-6/00 dark:text-app-blue-3/00 border-app-blue-400/80 hover:bg-app-blue-50/40 dark:hover:bg-app-blue-900/40 cursor-pointer"
                            onClick={() => setShowAllCandidates(true)}
                          >
                            View all
                          </Button>
                        </div>
                      )}
                      {invitedCandidates.length > 3 && showAllCandidates && (
                        <div className="flex justify-center mt-2">
                          <Button
                            variant="ghost"
                            className="text-gray-500 dark:text-gray-300 cursor-pointer"
                            onClick={() => setShowAllCandidates(false)}
                          >
                            Show less
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bulk Invite Dialog */}
          <BulkInviteDialog
            open={bulkInviteOpen}
            onOpenChange={setBulkInviteOpen}
            interviewId={id as string}
            jobTitle={job?.title || "Interview"}
            availableCandidates={getAvailableCandidates()}
            onInvitesSent={handleInvitesSent}
            organizationId={getUserContext()?.organization_id || ""}
          />
        </>
      )}
    </div>
  );
}
