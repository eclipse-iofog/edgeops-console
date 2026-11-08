import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export type TopologyClusterNodeData = {
  jsDomain: string | null;
  dimmed: boolean;
};

function TopologyClusterNodeComponent({ data }: NodeProps) {
  const cluster = data as TopologyClusterNodeData;

  return (
    <div
      className={[
        "relative h-full w-full rounded-2xl border border-violet-400/45 bg-violet-500/10",
        cluster.dimmed ? "opacity-20" : "opacity-100",
      ].join(" ")}
      style={{ pointerEvents: "none" }}
    >
      <div className="absolute left-3 right-3 top-2 truncate text-[11px] font-semibold tracking-wide text-violet-100">
        <span className="mr-2 text-[10px] uppercase tracking-wider text-violet-200/70">
          Cluster
        </span>
        {cluster.jsDomain ? `JetStream Domain: ${cluster.jsDomain}` : null}
      </div>
      <Handle
        type="target"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-violet-300 !opacity-0"
      />
    </div>
  );
}

export default memo(TopologyClusterNodeComponent);
