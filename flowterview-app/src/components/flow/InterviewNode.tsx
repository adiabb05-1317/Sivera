import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

interface InterviewNodeData {
  type: string;
  handler: string;
  taskMessage: string;
  style?: {
    backgroundColor: string;
    borderColor: string;
    color: string;
    width: number;
  };
  label?: string;
}

const InterviewNode = ({ data }: NodeProps<InterviewNodeData>) => {
  const nodeStyle = {
    backgroundColor: data.style?.backgroundColor || "#e0f2fe",
    borderColor: data.style?.borderColor || "#0ea5e9",
    color: data.style?.color || "#0c4a6e",
    width: data.style?.width || 280,
    aspectRatio: "1.1/1",
  };

  const displayLabel = data.label || data.type;

  return (
    <div
      className="shadow-md rounded-md border-2 relative"
      style={{
        backgroundColor: nodeStyle.backgroundColor,
        borderColor: nodeStyle.borderColor,
        color: nodeStyle.color,
        width: nodeStyle.width,
        aspectRatio: nodeStyle.aspectRatio,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: nodeStyle.borderColor,
          width: 8,
          height: 8,
          border: `2px solid ${nodeStyle.borderColor}`,
        }}
      />

      <div className="flex flex-col h-full">
        <div
          className="p-2 border-b font-medium"
          style={{ borderColor: nodeStyle.borderColor }}
        >
          <div className="text-sm truncate font-bold">{displayLabel}</div>
        </div>

        <div className="p-2 overflow-hidden flex-1 flex flex-col">
          <div className="text-xs font-medium opacity-75 truncate mb-1">
            {data.handler}
          </div>
          <div className="text-xs overflow-y-auto flex-1">
            {data.taskMessage.length > 200
              ? `${data.taskMessage.substring(0, 200)}...`
              : data.taskMessage}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: nodeStyle.borderColor,
          width: 8,
          height: 8,
          border: `2px solid ${nodeStyle.borderColor}`,
        }}
      />
    </div>
  );
};

export default memo(InterviewNode);
