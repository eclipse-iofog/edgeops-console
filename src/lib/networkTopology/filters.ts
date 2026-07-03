import { PINNED_NODE_IDS } from "./constants";
import type { MeshGraphFilters, TopologyConnection, TopologyLayer, TopologyNodeBase } from "./types";

export function normalizeFogNameTerms(fogNames: string[]): string[] {
  return fogNames
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

function matchesSearch(node: TopologyNodeBase, terms: string[]): boolean {
  if (terms.length === 0) {
    return true;
  }

  const fogName = (node.fogName ?? "").toLowerCase();
  const displayName = (node.displayName ?? "").toLowerCase();

  return terms.some(
    (term) => fogName.startsWith(term) || displayName.startsWith(term),
  );
}

export function shouldPinHubNode(
  node: TopologyNodeBase,
  filters: MeshGraphFilters,
  layer: TopologyLayer,
): boolean {
  const pinnedIds = new Set(PINNED_NODE_IDS[layer]);
  if (!pinnedIds.has(node.id)) {
    return false;
  }

  const searchTerms = normalizeFogNameTerms(filters.fogNames);
  if (searchTerms.length > 0 && !matchesSearch(node, searchTerms)) {
    return false;
  }

  return true;
}

export function matchesFilters(
  node: TopologyNodeBase,
  filters: MeshGraphFilters,
): boolean {
  if (filters.roles.length > 0 && !filters.roles.includes(node.role)) {
    return false;
  }
  if (!matchesSearch(node, normalizeFogNameTerms(filters.fogNames))) {
    return false;
  }
  return true;
}

function matchesFiltersExceptFog(
  node: TopologyNodeBase,
  filters: MeshGraphFilters,
): boolean {
  if (filters.roles.length > 0 && !filters.roles.includes(node.role)) {
    return false;
  }
  return true;
}

function expandDirectNeighbors(
  matchedIds: Set<string>,
  connections: TopologyConnection[],
): Set<string> {
  const visible = new Set(matchedIds);

  for (const connection of connections) {
    if (matchedIds.has(connection.source)) {
      visible.add(connection.dest);
    }
    if (matchedIds.has(connection.dest)) {
      visible.add(connection.source);
    }
  }

  return visible;
}

export function applyNodeFilters(
  nodes: TopologyNodeBase[],
  filters: MeshGraphFilters,
  layer: TopologyLayer,
  connections: TopologyConnection[] = [],
): TopologyNodeBase[] {
  const fogTerms = normalizeFogNameTerms(filters.fogNames);

  if (fogTerms.length > 0) {
    const matchedIds = new Set<string>();
    for (const node of nodes) {
      if (
        matchesFiltersExceptFog(node, filters) &&
        matchesSearch(node, fogTerms)
      ) {
        matchedIds.add(node.id);
      }
    }

    const visibleIds = expandDirectNeighbors(matchedIds, connections);
    return nodes.filter(
      (node) =>
        visibleIds.has(node.id) && matchesFiltersExceptFog(node, filters),
    );
  }

  return nodes.filter(
    (node) => shouldPinHubNode(node, filters, layer) || matchesFilters(node, filters),
  );
}

export function filterConnectionsForNodes(
  connections: TopologyConnection[],
  visibleNodeIds: Set<string>,
): TopologyConnection[] {
  return connections.filter(
    (connection) =>
      visibleNodeIds.has(connection.source) &&
      visibleNodeIds.has(connection.dest),
  );
}

export function getNodeConnections(
  nodeId: string,
  connections: TopologyConnection[],
) {
  const upstream = connections.filter((connection) => connection.source === nodeId);
  const downstream = connections.filter((connection) => connection.dest === nodeId);
  return {
    upstream,
    downstream,
    all: [...upstream, ...downstream],
    neighborIds: new Set([
      ...upstream.map((connection) => connection.dest),
      ...downstream.map((connection) => connection.source),
    ]),
  };
}

export function addFogNameBadge(
  fogNames: string[],
  value: string,
): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return fogNames;
  }

  const exists = fogNames.some(
    (name) => name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) {
    return fogNames;
  }

  return [...fogNames, trimmed];
}

export const EMPTY_MESH_FILTERS: MeshGraphFilters = {
  roles: [],
  fogNames: [],
};

export function hasActiveFilters(filters: MeshGraphFilters): boolean {
  return filters.roles.length > 0 || filters.fogNames.length > 0;
}
