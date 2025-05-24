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
} from "reactflow";
import "reactflow/dist/style.css";
import InterviewNode from "@/components/flow/InterviewNode";
import { improveLayout as improveLayoutUtil } from "@/utils/flowUtils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { authenticatedFetch } from "@/lib/auth-client";

const nodeTypes = {
  interview: InterviewNode,
};

export default function InterviewDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Fetch interview details
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_FLOWTERVIEW_BACKEND_URL ||
          "http://localhost:8010";
        const resp = await authenticatedFetch(
          `${backendUrl}/api/v1/interviews/${id}`
        );
        if (!resp.ok) throw new Error("Failed to fetch interview details");
        const data = await resp.json();
        setJob(data.job);
        // Fetch candidate details for each candidate ID
        const candidateIds = data.interview.candidates_invited || [];
        const candidateDetails = await Promise.all(
          candidateIds.map(async (cid: string) => {
            const resp = await fetch(`${backendUrl}/api/v1/candidates/${cid}`);
            if (!resp.ok) return null;
            return await resp.json();
          })
        );
        setCandidates(candidateDetails.filter(Boolean));
        // Set up React Flow
        if (data.flow && data.flow.react_flow_json) {
          setNodes(data.flow.react_flow_json.nodes || []);
          setEdges(data.flow.react_flow_json.edges || []);
          improveLayout();
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch interview details");
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
            Interview Details
          </h2>
          <h4 className="text-xs font-semibold opacity-50 dark:text-gray-300">
            {job?.title || "Interview"}
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
                  <div className="m-5 flex items-center justify-between">
                    <h3 className="font-semibold mb-2 dark:text-white">
                      Candidates
                    </h3>
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
                  {candidates.length === 0 ? (
                    <div className="text-gray-500 text-sm dark:text-gray-300">
                      No candidates assigned.
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
                            ? candidates
                            : candidates.slice(0, 3)
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
                                  {candidate.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {candidates.length > 3 && !showAllCandidates && (
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
                      {candidates.length > 3 && showAllCandidates && (
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
        </>
      )}
    </div>
  );
}
