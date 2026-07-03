import React from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export type TopologyEdgeData = {
  bundleOffset?: number;
  useTrunk?: boolean;
  trunkX?: number | null;
  pathTraced?: boolean;
  flowActive?: boolean;
};

function buildBundledPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: EdgeProps["sourcePosition"],
  targetPosition: EdgeProps["targetPosition"],
  edgeData: TopologyEdgeData,
): string {
  if (edgeData.useTrunk && edgeData.trunkX != null) {
    const trunkY = sourceY + (targetY - sourceY) * 0.45;
    return [
      `M ${sourceX},${sourceY}`,
      `C ${sourceX},${trunkY} ${edgeData.trunkX},${trunkY} ${targetX},${targetY}`,
    ].join(" ");
  }

  const offset = edgeData.bundleOffset ?? 0;
  if (offset === 0) {
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.35,
    });
    return edgePath;
  }

  const midX = (sourceX + targetX) / 2 + offset;
  const midY = (sourceY + targetY) / 2 + offset * 0.35;
  return `M ${sourceX},${sourceY} Q ${midX},${midY} ${targetX},${targetY}`;
}

export default function TopologyBundledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
  markerStart,
}: EdgeProps) {
  const edgeData = (data ?? {}) as TopologyEdgeData;
  const bundledPath = buildBundledPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    edgeData,
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={bundledPath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
        interactionWidth={20}
      />
      {edgeData.flowActive ? (
        <circle r={3} fill={String(style?.stroke ?? "#94a3b8")}>
          <animateMotion dur="2.5s" repeatCount="indefinite" path={bundledPath} />
        </circle>
      ) : null}
    </>
  );
}
