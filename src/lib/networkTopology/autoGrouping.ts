import {
  getHubId,
  getMidRole,
  getSpokeRole,
  SWIMLANE_COLUMN_X,
} from "./layout";
import { tracePathToHub } from "./pathTrace";
import type { CollapsedRoleGroup, GroupedTopologyView } from "./grouping";
import type { TopologyConnection, TopologyLayer, TopologyNodeBase } from "./types";

export const AUTO_AGGREGATE_SPOKE_THRESHOLD = 6;
export { SWIMLANE_COLUMN_X } from "./layout";

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

function buildSpokeGroupsByUpstream(
  nodes: TopologyNodeBase[],
  connections: TopologyConnection[],
  layer: TopologyLayer,
): Map<string, string[]> {
  const spokeRole = getSpokeRole(layer);
  const midRole = getMidRole(layer);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const groups = new Map<string, string[]>();

  for (const connection of connections) {
    const source = nodeById.get(connection.source);
    const dest = nodeById.get(connection.dest);
    if (!source || !dest) {
      continue;
    }

    if (source.role === spokeRole && dest.role === midRole) {
      const list = groups.get(dest.id) ?? [];
      if (!list.includes(source.id)) {
        list.push(source.id);
      }
      groups.set(dest.id, list);
    }
    if (dest.role === spokeRole && source.role === midRole) {
      const list = groups.get(source.id) ?? [];
      if (!list.includes(dest.id)) {
        list.push(dest.id);
      }
      groups.set(source.id, list);
    }
  }

  return groups;
}

function computeNeighborhood(
  focusNodeId: string,
  connections: TopologyConnection[],
  hubId: string,
): Set<string> {
  const neighborhood = new Set<string>([focusNodeId, hubId]);
  const pathEdges = tracePathToHub(focusNodeId, hubId, connections);

  for (const connection of connections) {
    if (pathEdges.has(connection.id)) {
      neighborhood.add(connection.source);
      neighborhood.add(connection.dest);
    }
    if (connection.source === focusNodeId) {
      neighborhood.add(connection.dest);
    }
    if (connection.dest === focusNodeId) {
      neighborhood.add(connection.source);
    }
  }

  return neighborhood;
}

function resolveFocusIds(
  focusNodeId: string,
  groupNodes: CollapsedRoleGroup[],
): string[] {
  const group = groupNodes.find((item) => item.id === focusNodeId);
  return group?.memberIds ?? [focusNodeId];
}

export function buildAutoGroupedView(
  nodes: TopologyNodeBase[],
  connections: TopologyConnection[],
  layer: TopologyLayer,
  options: {
    expandedSpokeGroups: Set<string>;
    focusNodeId: string | null;
    searchMatchIds: Set<string>;
  },
): GroupedTopologyView {
  const hubId = getHubId(layer);
  const spokeRole = getSpokeRole(layer);
  const spokeNodes = nodes.filter((node) => node.role === spokeRole);
  const shouldAggregate = spokeNodes.length >= AUTO_AGGREGATE_SPOKE_THRESHOLD;

  const spokeGroupsByUpstream = buildSpokeGroupsByUpstream(
    nodes,
    connections,
    layer,
  );

  const expandedSpokeGroups = new Set(options.expandedSpokeGroups);
  if (options.focusNodeId) {
    for (const [upstream, memberIds] of spokeGroupsByUpstream.entries()) {
      if (
        memberIds.includes(options.focusNodeId) ||
        upstream === options.focusNodeId
      ) {
        expandedSpokeGroups.add(upstream);
      }
    }
  }
  for (const matchId of options.searchMatchIds) {
    for (const [upstream, memberIds] of spokeGroupsByUpstream.entries()) {
      if (memberIds.includes(matchId)) {
        expandedSpokeGroups.add(upstream);
      }
    }
  }

  const hiddenNodeIds = new Set<string>();
  const nodeIdToGroupId = new Map<string, string>();
  const groupNodes: CollapsedRoleGroup[] = [];

  if (shouldAggregate) {
    for (const [upstream, memberIds] of spokeGroupsByUpstream.entries()) {
      if (memberIds.length === 0) {
        continue;
      }
      if (expandedSpokeGroups.has(upstream)) {
        continue;
      }

      const groupId = spokeGroupNodeId(upstream);
      groupNodes.push({
        id: groupId,
        role: spokeRole,
        label: `${memberIds.length} ${spokeRole}`,
        memberIds,
        memberCount: memberIds.length,
        upstreamOf: upstream,
      });

      for (const memberId of memberIds) {
        hiddenNodeIds.add(memberId);
        nodeIdToGroupId.set(memberId, groupId);
      }
    }
  }

  const syntheticGroupNodes: TopologyNodeBase[] = groupNodes.map((group) => ({
    id: group.id,
    iofogUuid: null,
    fogName: null,
    host: null,
    deploymentTarget: "edgelet",
    displayName: group.label,
    role: group.role,
    mode: layer === "router" ? "edge" : "leaf",
  }));

  let displayNodes = [
    ...nodes.filter((node) => !hiddenNodeIds.has(node.id)),
    ...syntheticGroupNodes,
  ];

  const displayConnections: TopologyConnection[] = [];
  const seen = new Set<string>();
  let syntheticId = -1;

  for (const connection of connections) {
    const source =
      nodeIdToGroupId.get(connection.source) ?? connection.source;
    const dest = nodeIdToGroupId.get(connection.dest) ?? connection.dest;

    if (source === dest) {
      continue;
    }

    const key = `${source}|${dest}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    displayConnections.push({
      id: connection.id >= 0 ? connection.id : syntheticId--,
      source,
      dest,
    });
  }

  if (options.focusNodeId && options.searchMatchIds.size === 0) {
    const primaryFocus = resolveFocusIds(options.focusNodeId, groupNodes)[0];
    const neighborhood = computeNeighborhood(
      primaryFocus,
      connections,
      hubId,
    );

    for (const group of groupNodes) {
      if (neighborhood.has(group.id)) {
        continue;
      }
      if (group.upstreamOf && neighborhood.has(group.upstreamOf)) {
        neighborhood.add(group.id);
      }
    }

    displayNodes = displayNodes.filter((node) => neighborhood.has(node.id));
  }

  if (options.searchMatchIds.size > 0) {
    const visible = new Set<string>(options.searchMatchIds);
    for (const matchId of options.searchMatchIds) {
      for (const connection of connections) {
        if (connection.source === matchId) {
          visible.add(connection.dest);
        }
        if (connection.dest === matchId) {
          visible.add(connection.source);
        }
      }
      visible.add(hubId);
    }
    for (const node of displayNodes) {
      if (isSpokeGroupNodeId(node.id)) {
        const upstream = spokeGroupUpstreamOf(node.id);
        if (upstream && visible.has(upstream)) {
          visible.add(node.id);
        }
      }
    }
    displayNodes = displayNodes.filter((node) => visible.has(node.id));
  }

  const visibleIds = new Set(displayNodes.map((node) => node.id));
  const filteredConnections = displayConnections.filter(
    (connection) =>
      visibleIds.has(connection.source) && visibleIds.has(connection.dest),
  );

  return {
    displayNodes,
    displayConnections: filteredConnections,
    groupNodes,
    hiddenNodeIds,
    nodeIdToGroupId,
  };
}

export function getSwimlaneColumnForNode(
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

export function snapToSwimlaneColumn(
  node: TopologyNodeBase,
  layer: TopologyLayer,
  position: { x: number; y: number },
): { x: number; y: number } {
  const column = getSwimlaneColumnForNode(node, layer);
  return {
    x: SWIMLANE_COLUMN_X[column] ?? position.x,
    y: position.y,
  };
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
