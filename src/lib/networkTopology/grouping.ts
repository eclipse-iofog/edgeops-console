import type { TopologyConnection, TopologyLayer, TopologyNodeBase } from "./types";
import { getMidRole, getSpokeRole } from "./layout";

export type CollapsedRoleGroup = {
  id: string;
  role: string;
  label: string;
  memberIds: string[];
  memberCount: number;
  upstreamOf?: string;
};

export type GroupedTopologyView = {
  displayNodes: TopologyNodeBase[];
  displayConnections: TopologyConnection[];
  groupNodes: CollapsedRoleGroup[];
  hiddenNodeIds: Set<string>;
  nodeIdToGroupId: Map<string, string>;
};

const COLLAPSIBLE_ROLES: Record<TopologyLayer, string[]> = {
  router: ["edge", "interior"],
  nats: ["leaf", "server"],
};

export function getCollapsibleRoles(layer: TopologyLayer): string[] {
  return COLLAPSIBLE_ROLES[layer];
}

export function buildGroupedTopologyView(
  nodes: TopologyNodeBase[],
  connections: TopologyConnection[],
  layer: TopologyLayer,
  collapsedRoles: Set<string>,
): GroupedTopologyView {
  if (collapsedRoles.size === 0) {
    return {
      displayNodes: nodes,
      displayConnections: connections,
      groupNodes: [],
      hiddenNodeIds: new Set(),
      nodeIdToGroupId: new Map(),
    };
  }

  const hiddenNodeIds = new Set<string>();
  const nodeIdToGroupId = new Map<string, string>();
  const groupNodes: CollapsedRoleGroup[] = [];

  for (const role of collapsedRoles) {
    const members = nodes.filter((node) => node.role === role);
    if (members.length === 0) {
      continue;
    }

    const groupId = `group-${role}`;
    groupNodes.push({
      id: groupId,
      role,
      label: `${members.length} ${role}`,
      memberIds: members.map((node) => node.id),
      memberCount: members.length,
    });

    for (const member of members) {
      hiddenNodeIds.add(member.id);
      nodeIdToGroupId.set(member.id, groupId);
    }
  }

  const visibleNodes = nodes.filter((node) => !hiddenNodeIds.has(node.id));

  const displayConnections: TopologyConnection[] = [];
  const seen = new Set<string>();

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
      id: connection.id,
      source,
      dest,
    });
  }

  const syntheticGroupNodes: TopologyNodeBase[] = groupNodes.map((group) => ({
    id: group.id,
    iofogUuid: null,
    fogName: null,
    host: null,
    deploymentTarget: "remote",
    displayName: group.label,
    role: group.role,
    mode: layer === "router" ? "edge" : "leaf",
  }));

  return {
    displayNodes: [...visibleNodes, ...syntheticGroupNodes],
    displayConnections,
    groupNodes,
    hiddenNodeIds,
    nodeIdToGroupId,
  };
}

export function resolveGroupMemberIds(
  nodeId: string,
  groupNodes: CollapsedRoleGroup[],
): string[] {
  const group = groupNodes.find((item) => item.id === nodeId);
  return group?.memberIds ?? [nodeId];
}

export function roleTierLabel(layer: TopologyLayer, role: string): string {
  if (role === getSpokeRole(layer)) {
    return layer === "router" ? "Edge nodes" : "Leaf nodes";
  }
  if (role === getMidRole(layer)) {
    return layer === "router" ? "Interior nodes" : "Server nodes";
  }
  return role;
}
