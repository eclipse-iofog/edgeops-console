import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { TopologyLayer, TopologyNodeBase } from "@/lib/networkTopology/types";
import { DEFAULT_ROUTER_ID } from "@/lib/networkTopology/constants";
import type { SemanticZoomLevel } from "@/lib/networkTopology/semanticZoom";

import {
  TopologyNodeIcon,
  getDefaultHubBadgeLabel,
  getDefaultHubPrimaryLabel,
  isDefaultHubNode,
} from "./topologyNodeIcon";

export type TopologyFlowNodeData = {
  node: TopologyNodeBase;
  layer: TopologyLayer;
  selected: boolean;
  dimmed: boolean;
  highlighted: boolean;
  hovered: boolean;
  searchMatch: boolean;
  zoomLevel: SemanticZoomLevel;
  agentStatus?: string | null;
};

function roleBadgeClass(role: string, layer: TopologyLayer): string {
  if (layer === "router") {
    if (role === "default") return "bg-cyan-500/30 text-cyan-100";
    if (role === "interior") return "bg-amber-500/30 text-amber-100";
    return "bg-blue-500/30 text-blue-100";
  }
  if (role === "hub") return "bg-purple-500/30 text-purple-100";
  if (role === "server") return "bg-violet-500/30 text-violet-100";
  return "bg-emerald-500/30 text-emerald-100";
}

function healthDotClass(status?: string | null): string {
  if (status === "RUNNING") {
    return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]";
  }
  if (status) {
    return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]";
  }
  return "bg-gray-500";
}

function TopologyMeshNodeComponent({ data }: NodeProps) {
  const {
    node,
    layer,
    selected,
    dimmed,
    highlighted,
    hovered,
    searchMatch,
    zoomLevel,
    agentStatus,
  } = data as TopologyFlowNodeData;
  const isHub = isDefaultHubNode(node);
  const title = isHub ? getDefaultHubPrimaryLabel(node) : node.displayName;
  const badgeLabel = isHub ? getDefaultHubBadgeLabel(node) : node.role;
  const uppercaseBadge = node.id !== DEFAULT_ROUTER_ID;
  const showHealth = Boolean(node.iofogUuid);
  const isOverview = zoomLevel === "overview";
  const isDetail = zoomLevel === "detail";

  return (
    <div
      className={[
        "relative rounded-xl border shadow-lg transition-all duration-200",
        isOverview
          ? "min-w-[72px] max-w-[100px] px-2 py-1"
          : "min-w-[140px] max-w-[180px] px-3 py-2",
        isHub
          ? "border-cyan-400/50 bg-gradient-to-br from-cyan-500/20 to-teal-600/20"
          : "border-gray-600/60 bg-gray-900/90",
        selected ? "ring-2 ring-white/80 scale-105" : "",
        searchMatch ? "ring-2 ring-amber-300/80" : "",
        (highlighted || hovered) && !searchMatch ? "ring-2 ring-cyan-300/60" : "",
        dimmed ? "opacity-15" : "opacity-100",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-2 !h-2 !border-0" />
      <div className="flex items-start gap-2">
        {!isOverview ? (
          <div className="mt-0.5 shrink-0 text-cyan-200">
            <TopologyNodeIcon node={node} layer={layer} size={isHub ? 22 : 16} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {showHealth ? (
              <span
                className={`inline-block shrink-0 rounded-full ${isOverview ? "h-1.5 w-1.5" : "h-2 w-2"} ${healthDotClass(agentStatus)}`}
                title={agentStatus ?? "Unknown"}
              />
            ) : null}
            <div
              className={`truncate font-semibold text-white ${isOverview ? "text-[9px]" : "text-xs"}`}
              title={title}
            >
              {title}
            </div>
          </div>
          {!isOverview ? (
            <div className="mt-1 flex flex-wrap gap-1">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] tracking-wide ${uppercaseBadge ? "uppercase" : ""} ${roleBadgeClass(node.role, layer)}`}
              >
                {badgeLabel}
              </span>
            </div>
          ) : null}
          {isDetail && node.host ? (
            <div className="mt-1 truncate text-[10px] text-gray-400" title={node.host}>
              {node.host}
            </div>
          ) : null}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-2 !h-2 !border-0" />
    </div>
  );
}

export default memo(TopologyMeshNodeComponent);
