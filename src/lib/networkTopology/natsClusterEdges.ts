import { NATS_CLUSTER_NODE_ID } from "./constants";
import type { TopologyConnection, TopologyNodeBase } from "./types";

export function isNatsClusterMember(node: TopologyNodeBase): boolean {
  return node.role === "hub" || node.role === "server";
}

function unorderedPairKey(left: string, right: string): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function stableEdgeId(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  if (hash === 0) {
    return -1;
  }
  return hash > 0 ? -hash : hash;
}

/**
 * One undirected cluster route per server pair, and one leaf line onto the
 * cluster box when every upstream of that leaf is a hub or server.
 * Leaf-to-leaf rows stay, one per parent. The controller stores the mesh,
 * so missing server routes are not invented.
 */
export function prepareNatsConnections(
  nodes: TopologyNodeBase[],
  apiConnections: TopologyConnection[],
): TopologyConnection[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const memberIds = new Set(
    nodes.filter(isNatsClusterMember).map((node) => node.id),
  );

  const upstreams = new Map<string, string[]>();
  for (const connection of apiConnections) {
    const source = nodeById.get(connection.source);
    if (!source || source.role !== "leaf") {
      continue;
    }
    const list = upstreams.get(source.id) ?? [];
    list.push(connection.dest);
    upstreams.set(source.id, list);
  }

  const leafToCluster = new Set<string>();
  for (const [leafId, dests] of upstreams) {
    if (dests.length > 0 && dests.every((dest) => memberIds.has(dest))) {
      leafToCluster.add(leafId);
    }
  }

  const prepared: TopologyConnection[] = [];
  const seen = new Set<string>();

  for (const connection of apiConnections) {
    const source = nodeById.get(connection.source);
    const dest = nodeById.get(connection.dest);
    if (!source || !dest || source.id === dest.id) {
      continue;
    }

    if (memberIds.has(source.id) && memberIds.has(dest.id)) {
      const key = unorderedPairKey(source.id, dest.id);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const [from, to] =
        source.id < dest.id ? [source.id, dest.id] : [dest.id, source.id];
      prepared.push({ id: connection.id, source: from, dest: to });
      continue;
    }

    const leafDialsCluster =
      (source.role === "leaf" &&
        leafToCluster.has(source.id) &&
        memberIds.has(dest.id)) ||
      (dest.role === "leaf" &&
        leafToCluster.has(dest.id) &&
        memberIds.has(source.id));
    if (leafDialsCluster) {
      continue;
    }

    const key = `${connection.source}|${connection.dest}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    prepared.push(connection);
  }

  for (const leafId of leafToCluster) {
    const key = `${leafId}|${NATS_CLUSTER_NODE_ID}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    prepared.push({
      id: stableEdgeId(key),
      source: leafId,
      dest: NATS_CLUSTER_NODE_ID,
    });
  }

  return prepared;
}
