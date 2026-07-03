import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Layers } from "lucide-react";

export type TopologyGroupNodeData = {
  label: string;
  role: string;
  memberCount: number;
  collapsed: boolean;
  dimmed: boolean;
  highlighted: boolean;
  selected: boolean;
};

function TopologyGroupNodeComponent({ data }: NodeProps) {
  const group = data as TopologyGroupNodeData;

  return (
    <div
      className={[
        "relative min-w-[120px] rounded-xl border border-dashed px-3 py-2 shadow-lg transition-all duration-200",
        "border-violet-400/50 bg-violet-500/10",
        group.selected ? "ring-2 ring-white/80 scale-105" : "",
        group.highlighted && !group.selected ? "ring-2 ring-violet-300/60" : "",
        group.dimmed ? "opacity-20" : "opacity-100",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-violet-400 !w-2 !h-2 !border-0"
      />
      <div className="flex items-center gap-2">
        <Layers size={16} className="shrink-0 text-violet-300" />
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-white">
            {group.label}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-violet-200/80">
            collapsed · {group.memberCount}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-violet-400 !w-2 !h-2 !border-0"
      />
    </div>
  );
}

export default memo(TopologyGroupNodeComponent);
