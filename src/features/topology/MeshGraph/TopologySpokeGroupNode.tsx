import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronRight, Users } from "lucide-react";

export type TopologySpokeGroupNodeData = {
  label: string;
  upstreamOf: string;
  memberCount: number;
  role: string;
  expanded: boolean;
  expanding: boolean;
  dimmed: boolean;
  highlighted: boolean;
  selected: boolean;
};

function TopologySpokeGroupNodeComponent({ data }: NodeProps) {
  const group = data as TopologySpokeGroupNodeData;

  return (
    <div
      className={[
        "relative min-w-[160px] max-w-[200px] rounded-xl border px-3 py-2.5 shadow-lg transition-all duration-200",
        "border-emerald-400/40 bg-emerald-500/10",
        group.selected ? "ring-2 ring-white/80 scale-105" : "",
        group.highlighted && !group.selected ? "ring-2 ring-emerald-300/60" : "",
        group.dimmed ? "opacity-15" : "opacity-100",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-emerald-400 !w-2 !h-2 !border-0"
      />
      <div className="flex items-start gap-2">
        <Users size={18} className="mt-0.5 shrink-0 text-emerald-300" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-white">
            {group.label}
          </div>
          <div className="mt-1 text-[10px] text-emerald-200/80">
            upstream → {group.upstreamOf}
          </div>
          <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-100">
            {group.expanding ? (
              "Expanding…"
            ) : group.expanded ? (
              "Expanded"
            ) : (
              <>
                <ChevronRight size={10} />
                Click to expand
              </>
            )}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-emerald-400 !w-2 !h-2 !border-0"
      />
    </div>
  );
}

export default memo(TopologySpokeGroupNodeComponent);
