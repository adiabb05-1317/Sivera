import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  ReactFlowInstance,
  MarkerType,
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import InterviewNode from "./InterviewNode";

interface FlowNode {
  task_messages: Array<{ role: string; content: string }>;
  functions: Array<{
    type: string;
    function: {
      name: string;
      handler: string;
      transition_to: string;
    };
  }>;
}

interface ReactFlowData {
  nodes: Array<Node>;
  edges: Array<Edge>;
}

interface InterviewFlowProps {
  flowData: {
    initial_node: string;
    nodes: Record<string, FlowNode>;
  };
  reactFlowData?: ReactFlowData;
}

const nodeTypes = {
  interview: InterviewNode,
};

const COLOR_PALETTES = [
  [
    { bg: "#e0f2fe", border: "#0ea5e9", text: "#0c4a6e" },
    { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" },
    { bg: "#ede9fe", border: "#8b5cf6", text: "#4c1d95" },
    { bg: "#f5f3ff", border: "#a78bfa", text: "#5b21b6" },
    { bg: "#fae8ff", border: "#d946ef", text: "#86198f" },
  ],
  [
    { bg: "#dcfce7", border: "#22c55e", text: "#14532d" },
    { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
    { bg: "#ccfbf1", border: "#14b8a6", text: "#134e4a" },
    { bg: "#e0f2fe", border: "#0ea5e9", text: "#0c4a6e" },
    { bg: "#f0f9ff", border: "#0284c7", text: "#075985" },
  ],
];

function FlowCanvas({ flowData, reactFlowData }: InterviewFlowProps) {
  const [fitOnce, setFitOnce] = useState(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    // Select a color palette
    const palette = COLOR_PALETTES[0];

    if (reactFlowData) {
      // Add styles to existing react flow data
      const enhancedNodes = reactFlowData.nodes.map((node, index) => {
        const colorIndex = index % palette.length;
        const nodeColor = palette[colorIndex];

        // Remove or override the top-level style.border
        const { style, ...rest } = node;
        const sanitizedStyle = { ...style };
        delete sanitizedStyle.border; // Remove border property if present

        return {
          ...rest,
          style: sanitizedStyle, // Use sanitized style (no border)
          data: {
            ...node.data,
            style: {
              ...node.data.style,
              // Optionally, also remove borderColor if you want
              borderColor: undefined,
            },
          },
        };
      });

      return {
        initialNodes: enhancedNodes,
        initialEdges: reactFlowData.edges,
      };
    }

    // Generate from flowData
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Horizontal layout parameters
    const xStartPosition = 100;
    const nodeSpacing = 450;
    const yBasePosition = 100;
    const yOffset = 80;

    Object.entries(flowData.nodes).forEach(([nodeId, nodeData], index) => {
      const xPos = xStartPosition + index * nodeSpacing;
      const yPos = yBasePosition + (index % 2) * yOffset;

      const colorIndex = index % palette.length;
      const nodeColor = palette[colorIndex];

      // Format label
      const label = nodeId
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      // Create node
      nodes.push({
        id: nodeId,
        type: "interview",
        position: { x: xPos, y: yPos },
        data: {
          type: nodeId,
          label: label,
          handler: nodeData.functions[0].function.handler,
          taskMessage: nodeData.task_messages[0].content,
          style: {
            backgroundColor: nodeColor.bg,
            color: nodeColor.text,
            width: 280,
          },
        },
      });

      const transitionTo = nodeData.functions[0].function.transition_to;
      if (transitionTo && transitionTo !== "end") {
        edges.push({
          id: `${nodeId}-${transitionTo}`,
          source: nodeId,
          target: transitionTo,
          type: "default",
          animated: true,
          style: { stroke: nodeColor.border, strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: nodeColor.border,
          },
        });
      }
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [flowData, reactFlowData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  // Auto-fit view whenever nodes change
  useEffect(() => {
    if (!fitOnce && nodes.length > 0 && reactFlowInstanceRef.current) {
      setTimeout(() => {
        if (reactFlowInstanceRef.current) {
          reactFlowInstanceRef.current.fitView({
            padding: 0.2,
            includeHiddenNodes: true,
            duration: 500,
          });
          setFitOnce(true);
        }
      }, 500);
    }
  }, [nodes, fitOnce]);

  const improveLayout = useCallback(() => {
    setNodes((nodes) => {
      const xPos = 100;
      const spacing = 450;

      return nodes.map((node, index) => {
        const yPos = 100 + (index % 2) * 80;
        return {
          ...node,
          position: { x: xPos + index * spacing, y: yPos },
        };
      });
    });

    setTimeout(() => {
      if (reactFlowInstanceRef.current) {
        reactFlowInstanceRef.current.fitView({ padding: 0.05 });
      }
    }, 50);
  }, [setNodes]);

  useEffect(() => {
    improveLayout();
  }, [improveLayout]);

  return (
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
      <Controls className="bg-white shadow-md rounded-md border border-gray-200" />
    </ReactFlow>
  );
}

// Wrapper component that provides the ReactFlow context
export default function InterviewFlow(props: InterviewFlowProps) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 h-full w-full">
      <ReactFlowProvider>
        <FlowCanvas {...props} />
      </ReactFlowProvider>
    </div>
  );
}
