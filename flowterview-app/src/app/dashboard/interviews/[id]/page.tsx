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
        const resp = await fetch(`${backendUrl}/api/v1/interviews/${id}`);
        if (!resp.ok) throw new Error("Failed to fetch interview details");
        const data = await resp.json();
        setJob(data.job);
        setCandidates(data.candidates || []);
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
    <div className="flex flex-col h-full">
      <div className="flex items-center m-3 ml-0">
        <Button
          onClick={() => router.push("/dashboard/interviews")}
          variant="link"
          className="mr-2 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col justify-center gap-1">
          <h2 className="text-xl font-bold">Interview Details</h2>
          <h4 className="text-xs font-semibold opacity-50">
            {job?.title || "Interview"}
          </h4>
        </div>
      </div>
      {loading ? (
        <div className="p-6 text-center text-gray-500">
          Loading interview...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500">{error}</div>
      ) : (
        <>
          <div
            className="flex flex-col gap-6 px-4"
            style={{ minHeight: "calc(100vh - 100px)" }}
          >
            <div className="w-full">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold mb-2">Candidates</h3>
                    <Button
                      onClick={() =>
                        router.push(
                          `/dashboard/candidates/invite?interview=${id}`
                        )
                      }
                      className="cursor-pointer border border-indigo-500/80 hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
                      variant="outline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Candidate
                    </Button>
                  </div>
                  {candidates.length === 0 ? (
                    <div className="text-gray-500 text-sm">
                      No candidates assigned.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {candidates.length} candidate(s) assigned
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="w-full rounded-lg border border-gray-200 overflow-hidden mt-0">
              <ReactFlowProvider>
                <div style={{ height: "600px", width: "100%" }}>
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
