import { type CSSProperties } from "react";
import {
  getStraightPath,
  useStore,
  type EdgeProps,
  type InternalNode,
  type XYPosition,
} from "@xyflow/react";

function nodeCenter(node: InternalNode): XYPosition {
  const width = (node.measured?.width ?? 0) / 2;
  const height = (node.measured?.height ?? 0) / 2;
  return {
    x: node.internals.positionAbsolute.x + width,
    y: node.internals.positionAbsolute.y + height,
  };
}

/** Straight segment that meets each node on its border, used for cluster routes. */
function borderPoint(node: InternalNode, toward: InternalNode): XYPosition {
  const center = nodeCenter(node);
  const other = nodeCenter(toward);
  const width = (node.measured?.width ?? 0) / 2;
  const height = (node.measured?.height ?? 0) / 2;
  if (width === 0 || height === 0) {
    return center;
  }

  const dx = (other.x - center.x) / (2 * width);
  const dy = (other.y - center.y) / (2 * height);
  const xx = dx - dy;
  const yy = dx + dy;
  const scale = 1 / (Math.abs(xx) + Math.abs(yy));
  if (!Number.isFinite(scale)) {
    return center;
  }
  const sx = scale * xx;
  const sy = scale * yy;
  return {
    x: width * (sx + sy) + center.x,
    y: height * (-sx + sy) + center.y,
  };
}

export default function TopologyClusterEdge({
  id,
  source,
  target,
  style,
}: EdgeProps) {
  const sourceNode = useStore((state) => state.nodeLookup.get(source));
  const targetNode = useStore((state) => state.nodeLookup.get(target));
  if (!sourceNode || !targetNode) {
    return null;
  }

  const start = borderPoint(sourceNode, targetNode);
  const end = borderPoint(targetNode, sourceNode);
  const [path] = getStraightPath({
    sourceX: start.x,
    sourceY: start.y,
    targetX: end.x,
    targetY: end.y,
  });

  return (
    <path
      id={id}
      d={path}
      fill="none"
      style={style as CSSProperties}
    />
  );
}
