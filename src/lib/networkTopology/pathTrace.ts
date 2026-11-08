import { NATS_CLUSTER_NODE_ID } from "./constants";
import type { TopologyConnection } from "./types";

type AdjacencyEntry = {
  neighbor: string;
  edgeId: number;
};

function buildAdjacency(
  connections: TopologyConnection[],
): Map<string, AdjacencyEntry[]> {
  const adjacency = new Map<string, AdjacencyEntry[]>();

  const add = (from: string, to: string, edgeId: number) => {
    const list = adjacency.get(from) ?? [];
    list.push({ neighbor: to, edgeId });
    adjacency.set(from, list);
  };

  for (const connection of connections) {
    add(connection.source, connection.dest, connection.id);
    add(connection.dest, connection.source, connection.id);
  }

  return adjacency;
}

/** Shortest-path edge ids from node to hub (BFS). */
export function tracePathToHub(
  nodeId: string,
  hubId: string,
  connections: TopologyConnection[],
): Set<number> {
  if (nodeId === hubId) {
    return new Set();
  }

  const adjacency = buildAdjacency(connections);
  const queue = [nodeId];
  const visited = new Set([nodeId]);
  const parent = new Map<string, { from: string; edgeId: number }>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === hubId) {
      break;
    }

    for (const entry of adjacency.get(current) ?? []) {
      if (visited.has(entry.neighbor)) {
        continue;
      }
      visited.add(entry.neighbor);
      parent.set(entry.neighbor, { from: current, edgeId: entry.edgeId });
      queue.push(entry.neighbor);
    }
  }

  if (!visited.has(hubId)) {
    return new Set();
  }

  const pathEdges = new Set<number>();
  let cursor: string | undefined = hubId;
  while (cursor && cursor !== nodeId) {
    const step = parent.get(cursor);
    if (!step) {
      break;
    }
    pathEdges.add(step.edgeId);
    cursor = step.from;
  }

  return pathEdges;
}

/**
 * Every node that dials root, then the nodes that dial those, and the edges
 * between them. Connection source is the downstream node.
 */
export function collectDescendants(
  rootId: string,
  connections: TopologyConnection[],
): { nodeIds: Set<string>; edgeIds: Set<number> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<number>();
  const queue = [rootId];
  const seen = new Set<string>([rootId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const connection of connections) {
      if (connection.dest !== current || seen.has(connection.source)) {
        continue;
      }
      seen.add(connection.source);
      nodeIds.add(connection.source);
      edgeIds.add(connection.id);
      queue.push(connection.source);
    }
  }

  return { nodeIds, edgeIds };
}

/**
 * Match, every upstream node up to the cluster box, and every descendant.
 * The box id is included when the chain dials it, so callers can keep the
 * hub and servers.
 */
export function expandNatsChain(
  rootIds: Iterable<string>,
  connections: TopologyConnection[],
): Set<string> {
  const visible = new Set<string>(rootIds);
  const queue = [...visible];
  const seen = new Set<string>(visible);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const connection of connections) {
      if (connection.source !== current) {
        continue;
      }
      if (connection.dest === NATS_CLUSTER_NODE_ID) {
        visible.add(NATS_CLUSTER_NODE_ID);
        continue;
      }
      if (seen.has(connection.dest)) {
        continue;
      }
      seen.add(connection.dest);
      visible.add(connection.dest);
      queue.push(connection.dest);
    }
  }

  for (const rootId of rootIds) {
    for (const nodeId of collectDescendants(rootId, connections).nodeIds) {
      visible.add(nodeId);
    }
  }

  return visible;
}

/** Leaves that dial the cluster box, plus every node under those leaves. */
export function collectClusterLeaves(
  connections: TopologyConnection[],
): Set<string> {
  const ids = new Set<string>();
  for (const connection of connections) {
    if (connection.dest !== NATS_CLUSTER_NODE_ID) {
      continue;
    }
    ids.add(connection.source);
    for (const nodeId of collectDescendants(connection.source, connections).nodeIds) {
      ids.add(nodeId);
    }
  }
  return ids;
}

export function getNeighborIds(
  nodeId: string,
  connections: TopologyConnection[],
): Set<string> {
  const neighbors = new Set<string>();
  for (const connection of connections) {
    if (connection.source === nodeId) {
      neighbors.add(connection.dest);
    }
    if (connection.dest === nodeId) {
      neighbors.add(connection.source);
    }
  }
  return neighbors;
}
