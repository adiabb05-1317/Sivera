"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  ReactFlowInstance,
  ConnectionLineType,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import InterviewNode from "@/components/flow/InterviewNode";
import { improveLayout as improveLayoutUtil } from "@/utils/flowUtils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Mail, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { authenticatedFetch } from "@/lib/auth-client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updateInterviewStatus } from "@/lib/supabase-candidates";
import { useToast } from "@/hooks/use-toast";
import { BulkInviteDialog } from "@/components/ui/bulk-invite-dialog";

const nodeTypes = {
  interview: InterviewNode,
};

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
  flow?: {
    react_flow_json?: {
      nodes: Node[];
      edges: Edge[];
    };
  };
}

export default function InterviewDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [invitedCandidates, setInvitedCandidates] = useState<Candidate[]>([]);
  const [availableCandidates, setAvailableCandidates] = useState<Candidate[]>(
    []
  );
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [interviewStatus, setInterviewStatus] = useState<
    "draft" | "active" | "completed"
  >("draft");
  const { toast } = useToast();

  // Fetch interview details and candidates
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_FLOWTERVIEW_BACKEND_URL ||
          "http://localhost:8010";

        // Fetch interview details
        const resp = await authenticatedFetch(
          `${backendUrl}/api/v1/interviews/${id}`
        );
        if (!resp.ok) throw new Error("Failed to fetch interview details");
        const data: InterviewData = await resp.json();
        console.log(data);

        setJob(data.job);
        setInterviewStatus(data.interview.status || "draft");

        // Set candidates from the new API response structure
        setInvitedCandidates(data.candidates.invited || []);
        setAvailableCandidates(data.candidates.available || []);

        // Set up React Flow
        if (data.flow && data.flow.react_flow_json) {
          setNodes(data.flow.react_flow_json.nodes || []);
          setEdges(data.flow.react_flow_json.edges || []);
          improveLayout();
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch interview details";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Layout utility
  const improveLayout = useCallback(() => {
    improveLayoutUtil(setNodes, reactFlowInstanceRef);
  }, [setNodes]);

  const handleInvitesSent = () => {
    // Refresh the data after invites are sent
    window.location.reload();
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
            <div className="w-full">
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <CardContent className="py-4">
                  <div className="m-5 mt-0 flex items-center justify-between">
                    <h3 className="font-semibold mb-2 dark:text-white">
                      Candidates ({invitedCandidates.length})
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
                      {getAvailableCandidates().length > 0 && (
                        <Button
                          onClick={() => setBulkInviteOpen(true)}
                          className="cursor-pointer border border-green-500/80 dark:border-green-400/80 hover:bg-green-500/10 dark:hover:bg-green-900/20 text-green-600 dark:text-green-300 hover:text-green-700 dark:hover:text-green-200 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
                          variant="outline"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Bulk Invite ({getAvailableCandidates().length})
                        </Button>
                      )}

                      <Button
                        onClick={() =>
                          router.push(
                            `/dashboard/candidates/invite?interview=${id}`
                          )
                        }
                        className="cursor-pointer border border-indigo-500/80 dark:border-indigo-400/80 hover:bg-indigo-500/10 dark:hover:bg-indigo-900/20 text-indigo-500 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-200 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
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
                              className="transition-colors cursor-pointer hover:bg-indigo-50/20 dark:hover:bg-indigo-900/30"
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
                            className="text-indigo-600 dark:text-indigo-300 border-indigo-400/80 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/40 cursor-pointer"
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
            <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mt-0 bg-white dark:bg-gray-900">
              <ReactFlowProvider>
                <div
                  style={{ height: "600px", width: "100%" }}
                  className="bg-white dark:bg-gray-900"
                >
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={{
                      type: "default",
                      animated: true,
                    }}
                    fitView
                    fitViewOptions={{
                      padding: 0.3,
                      includeHiddenNodes: true,
                    }}
                    minZoom={0.1}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                    onInit={(instance) => {
                      reactFlowInstanceRef.current = instance;
                    }}
                    connectionLineType={ConnectionLineType.Bezier}
                  >
                    <Background color="#aaa" gap={16} size={1} />
                    <Controls />
                  </ReactFlow>
                </div>
              </ReactFlowProvider>
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
          />
        </>
      )}
    </div>
  );
}
