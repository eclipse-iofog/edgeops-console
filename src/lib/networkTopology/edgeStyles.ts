import { NATS_CLUSTER_NODE_ID } from "./constants";
import type { TopologyConnection, TopologyLayer, TopologyNodeBase } from "./types";

export type EdgeKind =
  | "router-interior-interior"
  | "router-edge-interior"
  | "router-interior-hub"
  | "router-edge-hub"
  | "nats-cluster"
  | "nats-leaf"
  | "other";

type EdgePalette = {
  normal: string;
  highlight: string;
  label: string;
};

const PEER_MESH = {
  normal: "#f97316",
  highlight: "#fb923c",
} as const;

const SPOKE_TO_MID = {
  normal: "#10b981",
  highlight: "#34d399",
} as const;

const MID_TO_HUB = {
  normal: "#a855f7",
  highlight: "#c084fc",
} as const;

const SPOKE_TO_HUB = {
  normal: "#14b8a6",
  highlight: "#2dd4bf",
} as const;

export const EDGE_PALETTE: Record<EdgeKind, EdgePalette> = {
  "router-interior-interior": {
    ...PEER_MESH,
    label: "Interior ↔ Interior",
  },
  "router-edge-interior": {
    ...SPOKE_TO_MID,
    label: "Edge → Interior",
  },
  "router-interior-hub": {
    ...MID_TO_HUB,
    label: "Interior → Hub",
  },
  "router-edge-hub": {
    ...SPOKE_TO_HUB,
    label: "Edge → Hub",
  },
  "nats-cluster": {
    ...MID_TO_HUB,
    label: "Cluster",
  },
  "nats-leaf": {
    ...SPOKE_TO_HUB,
    label: "Leaf",
  },
  other: {
    normal: "#64748b",
    highlight: "#94a3b8",
    label: "Other",
  },
};

export const ROUTER_EDGE_LEGEND: EdgeKind[] = [
  "router-interior-interior",
  "router-edge-interior",
  "router-interior-hub",
  "router-edge-hub",
];

export const NATS_EDGE_LEGEND: EdgeKind[] = ["nats-cluster", "nats-leaf"];

function isClusterRole(role: string | undefined): boolean {
  return role === "hub" || role === "server";
}

function hasRolePair(
  sourceRole: string,
  destRole: string,
  a: string,
  b: string,
): boolean {
  return (
    (sourceRole === a && destRole === b) || (sourceRole === b && destRole === a)
  );
}

export function classifyEdge(
  connection: TopologyConnection,
  nodeById: Map<string, TopologyNodeBase>,
  layer: TopologyLayer,
): EdgeKind {
  const touchesCluster =
    connection.source === NATS_CLUSTER_NODE_ID ||
    connection.dest === NATS_CLUSTER_NODE_ID;
  const source = nodeById.get(connection.source);
  const dest = nodeById.get(connection.dest);
  if (touchesCluster && layer === "nats") {
    const other = source ?? dest;
    if (other && isClusterRole(other.role)) {
      return "nats-cluster";
    }
    return "nats-leaf";
  }
  if (!source || !dest) {
    return "other";
  }

  if (layer === "router") {
    if (source.role === "interior" && dest.role === "interior") {
      return "router-interior-interior";
    }
    if (hasRolePair(source.role, dest.role, "interior", "edge")) {
      return "router-edge-interior";
    }
    if (hasRolePair(source.role, dest.role, "interior", "default")) {
      return "router-interior-hub";
    }
    if (hasRolePair(source.role, dest.role, "edge", "default")) {
      return "router-edge-hub";
    }
    return "other";
  }

  const sourceIsCluster =
    connection.source === NATS_CLUSTER_NODE_ID || isClusterRole(source.role);
  const destIsCluster =
    connection.dest === NATS_CLUSTER_NODE_ID || isClusterRole(dest.role);
  if (sourceIsCluster && destIsCluster) {
    return "nats-cluster";
  }
  if (source.role === "leaf" || dest.role === "leaf") {
    return "nats-leaf";
  }
  return "other";
}

export function isBidirectionalEdge(_kind: EdgeKind): boolean {
  return false;
}

export function getEdgeVisualStyle(
  kind: EdgeKind,
  highlighted: boolean,
  dimmed: boolean,
): { stroke: string; strokeWidth: number; opacity: number; markerColor: string } {
  const palette = EDGE_PALETTE[kind];
  const stroke = highlighted ? palette.highlight : palette.normal;

  return {
    stroke,
    strokeWidth: highlighted ? 2.5 : 1.2,
    opacity: dimmed ? 0.15 : highlighted ? 1 : 0.6,
    markerColor: stroke,
  };
}

export function buildNodeLookup(
  nodes: TopologyNodeBase[],
): Map<string, TopologyNodeBase> {
  return new Map(nodes.map((node) => [node.id, node]));
}
