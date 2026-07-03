import type { TopologyConnection, TopologyLayer, TopologyNodeBase } from "./types";

export type EdgeKind =
  | "router-interior-interior"
  | "router-edge-interior"
  | "router-interior-hub"
  | "router-edge-hub"
  | "nats-server-server"
  | "nats-leaf-server"
  | "nats-leaf-hub"
  | "nats-server-hub"
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
  "nats-server-server": {
    ...PEER_MESH,
    label: "Server ↔ Server",
  },
  "nats-leaf-server": {
    ...SPOKE_TO_MID,
    label: "Leaf ↔ Server",
  },
  "nats-leaf-hub": {
    ...SPOKE_TO_HUB,
    label: "Leaf → Hub",
  },
  "nats-server-hub": {
    ...MID_TO_HUB,
    label: "Server ↔ Hub",
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

export const NATS_EDGE_LEGEND: EdgeKind[] = [
  "nats-leaf-server",
  "nats-server-server",
  "nats-server-hub",
  "nats-leaf-hub",
];

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
  const source = nodeById.get(connection.source);
  const dest = nodeById.get(connection.dest);
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

  if (source.role === "server" && dest.role === "server") {
    return "nats-server-server";
  }
  if (hasRolePair(source.role, dest.role, "leaf", "server")) {
    return "nats-leaf-server";
  }
  if (hasRolePair(source.role, dest.role, "leaf", "hub")) {
    return "nats-leaf-hub";
  }
  if (hasRolePair(source.role, dest.role, "server", "hub")) {
    return "nats-server-hub";
  }
  return "other";
}

export function isBidirectionalEdge(kind: EdgeKind): boolean {
  return kind === "nats-server-server" || kind === "nats-server-hub";
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
