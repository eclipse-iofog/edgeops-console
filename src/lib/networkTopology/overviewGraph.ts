import { getHubId, getMidRole, getSpokeRole } from "./layout";
import type {
  TopologyConnection,
  TopologyLayer,
  TopologyNodeBase,
  TopologyOverview,
  TopologySpokeGroup,
} from "./types";

export function spokeGroupNodeId(upstreamOf: string): string {
  return `spoke-group-${upstreamOf}`;
}

export function isSpokeGroupNodeId(nodeId: string): boolean {
  return nodeId.startsWith("spoke-group-");
}

export function spokeGroupUpstreamOf(nodeId: string): string | null {
  if (!isSpokeGroupNodeId(nodeId)) {
    return null;
  }
  return nodeId.slice("spoke-group-".length);
}

function syntheticSpokeGroupNode(
  group: TopologySpokeGroup,
  layer: TopologyLayer,
): TopologyNodeBase {
  const spokeRole = getSpokeRole(layer);
  return {
    id: spokeGroupNodeId(group.upstreamOf),
    iofogUuid: null,
    fogName: null,
    host: null,
    deploymentTarget: "edgelet",
    displayName: `${group.count} ${group.role}`,
    role: group.role || spokeRole,
    mode: layer === "router" ? "edge" : "leaf",
  };
}

/** Build a scalable overview graph from Controller overview API. */
export function buildOverviewGraph(
  overview: TopologyOverview,
  layer: TopologyLayer,
): { nodes: TopologyNodeBase[]; connections: TopologyConnection[] } {
  const nodes: TopologyNodeBase[] = [];
  const connections: TopologyConnection[] = [];
  let syntheticId = -1;

  const hub = overview.defaultNode;
  if (hub) {
    nodes.push(hub);
  }

  for (const midNode of overview.midNodes) {
    nodes.push(midNode);
    if (hub) {
      connections.push({
        id: syntheticId,
        source: midNode.id,
        dest: hub.id,
      });
      syntheticId -= 1;
    }
  }

  for (const group of overview.spokeGroups) {
    nodes.push(syntheticSpokeGroupNode(group, layer));
    connections.push({
      id: syntheticId,
      source: spokeGroupNodeId(group.upstreamOf),
      dest: group.upstreamOf,
    });
    syntheticId -= 1;
  }

  return { nodes, connections };
}

export function mergeSubgraphExpansion(
  baseNodes: TopologyNodeBase[],
  baseConnections: TopologyConnection[],
  upstreamOf: string,
  subgraphNodes: TopologyNodeBase[],
  subgraphConnections: TopologyConnection[],
): { nodes: TopologyNodeBase[]; connections: TopologyConnection[] } {
  const groupId = spokeGroupNodeId(upstreamOf);
  const expandedIds = new Set(subgraphNodes.map((node) => node.id));
  expandedIds.add(upstreamOf);

  const nodes = [
    ...baseNodes.filter((node) => node.id !== groupId),
    ...subgraphNodes.filter(
      (node) => !baseNodes.some((existing) => existing.id === node.id),
    ),
  ];

  const connectionKeys = new Set<string>();
  const connections: TopologyConnection[] = [];

  const addConnection = (connection: TopologyConnection) => {
    const key = `${connection.source}|${connection.dest}|${connection.id}`;
    if (connectionKeys.has(key)) {
      return;
    }
    connectionKeys.add(key);
    connections.push(connection);
  };

  for (const connection of baseConnections) {
    if (connection.source === groupId || connection.dest === groupId) {
      continue;
    }
    addConnection(connection);
  }

  for (const connection of subgraphConnections) {
    if (
      expandedIds.has(connection.source) &&
      expandedIds.has(connection.dest)
    ) {
      addConnection(connection);
    }
  }

  return { nodes, connections };
}

export function countDegradedNodes(
  nodes: TopologyNodeBase[],
  agentStatusByUuid: Record<string, string | undefined>,
): number {
  let count = 0;
  for (const node of nodes) {
    if (!node.iofogUuid) {
      continue;
    }
    const status = agentStatusByUuid[node.iofogUuid];
    if (status && status !== "RUNNING") {
      count += 1;
    }
  }
  return count;
}

export function roleColumnIndex(
  node: TopologyNodeBase,
  layer: TopologyLayer,
): number {
  const hubId = getHubId(layer);
  if (node.id === hubId || node.role === "default" || node.role === "hub") {
    return 2;
  }
  if (isSpokeGroupNodeId(node.id)) {
    return 0;
  }
  const midRole = getMidRole(layer);
  const spokeRole = getSpokeRole(layer);
  if (node.role === midRole) {
    return 1;
  }
  if (node.role === spokeRole) {
    return 0;
  }
  return 1;
}
