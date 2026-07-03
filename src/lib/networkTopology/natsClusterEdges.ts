import { DEFAULT_NATS_HUB_ID } from "./constants";
import type { TopologyConnection, TopologyNodeBase } from "./types";

function connectionPairKey(source: string, dest: string): string {
  return `${source}|${dest}`;
}

function syntheticConnectionId(source: string, dest: string): number {
  const key = `synthetic:${source}:${dest}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return hash > 0 ? -hash : hash;
}

function findNatsHubNode(nodes: TopologyNodeBase[]): TopologyNodeBase | undefined {
  return (
    nodes.find((node) => node.id === DEFAULT_NATS_HUB_ID) ??
    nodes.find((node) => node.role === "hub")
  );
}

/** Server-mode nodes participate in NATS cluster config — infer missing mesh links. */
export function buildSyntheticNatsClusterConnections(
  nodes: TopologyNodeBase[],
): TopologyConnection[] {
  const hub = findNatsHubNode(nodes);
  const servers = nodes.filter((node) => node.role === "server");
  if (!hub || servers.length === 0) {
    return [];
  }

  const synthetic: TopologyConnection[] = [];

  for (const server of servers) {
    synthetic.push({
      id: syntheticConnectionId(server.id, hub.id),
      source: server.id,
      dest: hub.id,
    });
  }

  for (let i = 0; i < servers.length; i += 1) {
    for (let j = i + 1; j < servers.length; j += 1) {
      const a = servers[i];
      const b = servers[j];
      const [source, dest] = a.id.localeCompare(b.id) <= 0 ? [a, b] : [b, a];
      synthetic.push({
        id: syntheticConnectionId(source.id, dest.id),
        source: source.id,
        dest: dest.id,
      });
    }
  }

  return synthetic;
}

export function mergeTopologyConnections(
  apiConnections: TopologyConnection[],
  syntheticConnections: TopologyConnection[],
): TopologyConnection[] {
  const seen = new Set(
    apiConnections.map((connection) =>
      connectionPairKey(connection.source, connection.dest),
    ),
  );
  const merged = [...apiConnections];

  for (const connection of syntheticConnections) {
    const key = connectionPairKey(connection.source, connection.dest);
    if (seen.has(key)) {
      continue;
    }
    merged.push(connection);
    seen.add(key);
  }

  return merged;
}

export function enrichNatsConnections(
  nodes: TopologyNodeBase[],
  apiConnections: TopologyConnection[],
): TopologyConnection[] {
  const synthetic = buildSyntheticNatsClusterConnections(nodes);
  return mergeTopologyConnections(apiConnections, synthetic);
}
