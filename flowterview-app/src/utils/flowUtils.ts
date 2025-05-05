import { SetStateAction } from "react";
import { Node, ReactFlowInstance } from "reactflow";

/**
 * Rearranges nodes into a simple horizontal layout and fits the view.
 */
export const improveLayout = (
  setNodes: (update: SetStateAction<Node[]>) => void,
  reactFlowInstanceRef: React.RefObject<ReactFlowInstance | null>
) => {
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

  // Fit view after a short delay to allow nodes to potentially render/update
  setTimeout(() => {
    if (reactFlowInstanceRef.current) {
      reactFlowInstanceRef.current.fitView({ padding: 0.05 });
    }
  }, 50);
};
