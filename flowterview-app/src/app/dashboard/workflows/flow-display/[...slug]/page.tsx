"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation"; // Import useParams
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
  ReactFlowInstance,
  MarkerType,
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import InterviewNode from "@/components/flow/InterviewNode";
import { improveLayout as improveLayoutUtil } from "@/utils/flowUtils"; // Import the utility function
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const nodeTypes = {
  interview: InterviewNode,
};

const initialNodes: Node[] = JSON.parse(
  `[{"id":"introduction","type":"interview","position":{"x":100,"y":50},"data":{"label":"Introduction","type":"function","handler":"__function__:collect_candidate_info","taskMessage":"Begin the interview with a professional introduction. Ask for the candidate's name and a brief overview of their background.","style":{"backgroundColor":"#E0F7FA","borderColor":"#4DD0E1","color":"#006064","width":320}},"style":{"border":"2px solid #4DD0E1","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"background_discussion","type":"interview","position":{"x":100,"y":250},"data":{"label":"Background Discussion","type":"function","handler":"__function__:process_background_info","taskMessage":"Discuss the candidate's experience in software development, focusing on their experience with Python, C, C++, Java, or JavaScript, and their experience with data structures and algorithms.","style":{"backgroundColor":"#FCE4EC","borderColor":"#F06292","color":"#880E4F","width":320}},"style":{"border":"2px solid #F06292","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"coding_problem_introduction","type":"interview","position":{"x":100,"y":450},"data":{"label":"Coding Problem Introduction","type":"function","handler":"__function__:present_coding_problem","taskMessage":"Introduce a coding problem relevant to the Software Engineer II role, focusing on data structures and algorithms.","style":{"backgroundColor":"#E8EAF6","borderColor":"#7986CB","color":"#303F9F","width":320}},"style":{"border":"2px solid #7986CB","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"coding_problem_discussion","type":"interview","position":{"x":100,"y":650},"data":{"label":"Coding Problem Discussion","type":"function","handler":"__function__:evaluate_problem_solving","taskMessage":"Observe the candidate's problem-solving approach, coding style, and ability to explain their solution. Assess the efficiency and correctness of their code.","style":{"backgroundColor":"#DCEDC8","borderColor":"#81C784","color":"#33691E","width":320}},"style":{"border":"2px solid #81C784","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"system_design_question","type":"interview","position":{"x":100,"y":850},"data":{"label":"System Design Question","type":"function","handler":"__function__:present_system_design","taskMessage":"Present a system design question related to building scalable and reliable systems, relevant to the Core team's responsibilities.","style":{"backgroundColor":"#FFF9C4","borderColor":"#FFEB3B","color":"#F57F17","width":320}},"style":{"border":"2px solid #FFEB3B","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"behavioral_questions","type":"interview","position":{"x":100,"y":1050},"data":{"label":"Behavioral Questions","type":"function","handler":"__function__:evaluate_behavioral_response","taskMessage":"Ask behavioral questions to assess the candidate's teamwork, communication, leadership, and problem-solving skills.","style":{"backgroundColor":"#FFCCBC","borderColor":"#FF8A65","color":"#BF360C","width":320}},"style":{"border":"2px solid #FF8A65","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"candidate_questions","type":"interview","position":{"x":100,"y":1250},"data":{"label":"Candidate Questions","type":"function","handler":"__function__:handle_candidate_questions","taskMessage":"Allow the candidate to ask questions about the role, the team, and the company. Answer their questions honestly and thoroughly.","style":{"backgroundColor":"#D1C4E9","borderColor":"#9575CD","color":"#4527A0","width":320}},"style":{"border":"2px solid #9575CD","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"interview_conclusion","type":"interview","position":{"x":100,"y":1450},"data":{"label":"Interview Conclusion","type":"function","handler":"__function__:conclude_interview","taskMessage":"Thank the candidate for their time and provide information about the next steps in the hiring process.","style":{"backgroundColor":"#B2DFDB","borderColor":"#4DB6AC","color":"#004D40","width":320}},"style":{"border":"2px solid #4DB6AC","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}},{"id":"end","type":"interview","position":{"x":100,"y":1650},"data":{"label":"End","type":"end_conversation","handler":null,"taskMessage":"The interview is complete.","style":{"backgroundColor":"#CFD8DC","borderColor":"#607D8B","color":"#263238","width":320}},"style":{"border":"2px solid #607D8B","borderRadius":10,"boxShadow":"2px 3px 5px rgba(0, 0, 0, 0.2)"}}]`
);
const initialEdges: Edge[] = JSON.parse(
  `[{"id":"e1-2","source":"introduction","target":"background_discussion","type":"smoothstep","animated":true,"style":{"stroke":"#777"},"markerEnd":{"type":"arrowclosed","color":"#777"},"label":"To Background","labelStyle":{"fill":"#222","fontWeight":500}},{"id":"e2-3","source":"background_discussion","target":"coding_problem_introduction","type":"smoothstep","animated":true,"style":{"stroke":"#777"},"markerEnd":{"type":"arrowclosed","color":"#777"},"label":"To Coding","labelStyle":{"fill":"#222","fontWeight":500}},{"id":"e3-4","source":"coding_problem_introduction","target":"coding_problem_discussion","type":"smoothstep","animated":true,"style":{"stroke":"#777"},"markerEnd":{"type":"arrowclosed","color":"#777"},"label":"Discuss Solution","labelStyle":{"fill":"#222","fontWeight":500}},{"id":"e4-5","source":"coding_problem_discussion","target":"system_design_question","type":"smoothstep","animated":true,"style":{"stroke":"#777"},"markerEnd":{"type":"arrowclosed","color":"#777"},"label":"System Design","labelStyle":{"fill":"#222","fontWeight":500}},{"id":"e5-6","source":"system_design_question","target":"behavioral_questions","type":"smoothstep","animated":true,"style":{"stroke":"#777"},"markerEnd":{"type":"arrowclosed","color":"#777"},"label":"Behavioral","labelStyle":{"fill":"#222","fontWeight":500}},{"id":"e6-7","source":"behavioral_questions","target":"candidate_questions","type":"smoothstep","animated":true,"style":{"stroke":"#777"},"markerEnd":{"type":"arrowclosed","color":"#777"},"label":"Candidate Q&A","labelStyle":{"fill":"#222","fontWeight":500}},{"id":"e7-8","source":"candidate_questions","target":"interview_conclusion","type":"smoothstep","animated":true,"style":{"stroke":"#777"},"markerEnd":{"type":"arrowclosed","color":"#777"},"label":"Conclusion","labelStyle":{"fill":"#222","fontWeight":500}},{"id":"e8-9","source":"interview_conclusion","target":"end","type":"smoothstep","animated":true,"style":{"stroke":"#777"},"markerEnd":{"type":"arrowclosed","color":"#777"},"label":"End","labelStyle":{"fill":"#222","fontWeight":500}}]`
);

export default function FlowDisplayPage() {
  const router = useRouter();
  const params = useParams();
  const { slug } = params;

  const workflowTitle =
    slug && slug.length > 1
      ? decodeURIComponent(slug[1] as string)
      : "Workflow";

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Memoize the layout function call
  const improveLayout = useCallback(() => {
    improveLayoutUtil(setNodes, reactFlowInstanceRef);
  }, [setNodes]); // Dependency on setNodes

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Call improveLayout, e.g., on mount or when nodes change
  // For now, let's call it once on mount similar to InterviewFlow
  useEffect(() => {
    // We might need a slight delay or check if nodes are loaded if they come from API
    // Since nodes are currently empty, this won't do much, but sets up the pattern.
    improveLayout();
  }, [improveLayout]); // Dependency on the memoized function

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center m-3 ml-0">
        <Button
          onClick={() => router.push("/dashboard/workflows")}
          variant="link"
          className="mr-2 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col justify-center gap-1">
          <h2 className="text-xl font-bold">Workflow</h2>
          <h4 className="text-xs font-semibold opacity-50">{workflowTitle}</h4>
        </div>
      </div>
      <div className="flex-grow w-full rounded-lg border border-gray-200 overflow-hidden">
        <ReactFlowProvider>
          <div style={{ height: "100%", width: "100%" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
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
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
