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
