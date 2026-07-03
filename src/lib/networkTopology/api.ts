import type { ResponseLike } from "@/lib/resourceStore/types";

import { TOPOLOGY_PAGE_SIZE } from "./constants";
import type {
  NodeConnectionsResponse,
  TopologyConnection,
  TopologyLayer,
  TopologyNodeBase,
  TopologyNodeDetail,
  TopologyOverview,
  TopologySubgraph,
  TopologySummary,
} from "./types";

type PaginatedResponse<TKey extends string, TItem> = {
  total: number;
  limit: number;
  offset: number;
} & Record<TKey, TItem[]>;

export async function fetchAllPages<T>(
  fetchPage: (
    offset: number,
    limit: number,
  ) => Promise<{ total: number; items: T[]; limit: number }>,
  onProgress?: (loaded: number, total: number) => void,
  limit = TOPOLOGY_PAGE_SIZE,
): Promise<T[]> {
  let offset = 0;
  const all: T[] = [];

  while (true) {
    const page = await fetchPage(offset, limit);
    all.push(...page.items);
    onProgress?.(all.length, page.total);
    if (all.length >= page.total) {
      break;
    }
    offset += page.limit;
  }

  return all;
}

export async function fetchTopologySummary(
  request: (path: string) => Promise<ResponseLike | null>,
): Promise<TopologySummary> {
  const response = await request("/api/v3/network-topology/summary");
  if (!response?.ok) {
    throw new Error(response?.message ?? "Failed to fetch topology summary");
  }
  return (await response.json()) as TopologySummary;
}

export async function fetchTopologyNodes(
  request: (path: string) => Promise<ResponseLike | null>,
  layer: TopologyLayer,
  onProgress?: (loaded: number, total: number) => void,
): Promise<TopologyNodeBase[]> {
  return fetchAllPages(async (offset, limit) => {
    const response = await request(
      `/api/v3/network-topology/${layer}/nodes?limit=${limit}&offset=${offset}`,
    );
    if (!response?.ok) {
      throw new Error(response?.message ?? `Failed to fetch ${layer} nodes`);
    }
    const data = (await response.json()) as PaginatedResponse<
      "nodes",
      TopologyNodeBase
    >;
    return { total: data.total, items: data.nodes, limit: data.limit };
  }, onProgress);
}

export async function fetchTopologyConnections(
  request: (path: string) => Promise<ResponseLike | null>,
  layer: TopologyLayer,
  onProgress?: (loaded: number, total: number) => void,
): Promise<TopologyConnection[]> {
  return fetchAllPages(async (offset, limit) => {
    const response = await request(
      `/api/v3/network-topology/${layer}/connections?limit=${limit}&offset=${offset}`,
    );
    if (!response?.ok) {
      throw new Error(
        response?.message ?? `Failed to fetch ${layer} connections`,
      );
    }
    const data = (await response.json()) as PaginatedResponse<
      "connections",
      TopologyConnection
    >;
    return { total: data.total, items: data.connections, limit: data.limit };
  }, onProgress);
}

export async function fetchTopologyNodeDetail(
  request: (path: string) => Promise<ResponseLike | null>,
  layer: TopologyLayer,
  id: string,
): Promise<TopologyNodeDetail> {
  const response = await request(
    `/api/v3/network-topology/${layer}/nodes/${encodeURIComponent(id)}`,
  );
  if (!response?.ok) {
    throw new Error(response?.message ?? "Failed to fetch node detail");
  }
  return (await response.json()) as TopologyNodeDetail;
}

export async function fetchTopologyNodeConnections(
  request: (path: string) => Promise<ResponseLike | null>,
  layer: TopologyLayer,
  id: string,
): Promise<NodeConnectionsResponse> {
  const response = await request(
    `/api/v3/network-topology/${layer}/nodes/${encodeURIComponent(id)}/connections`,
  );
  if (!response?.ok) {
    throw new Error(response?.message ?? "Failed to fetch node connections");
  }
  return (await response.json()) as NodeConnectionsResponse;
}

export async function fetchTopologyOverview(
  request: (path: string) => Promise<ResponseLike | null>,
  layer: TopologyLayer,
): Promise<TopologyOverview> {
  const response = await request(`/api/v3/network-topology/${layer}/overview`);
  if (!response?.ok) {
    throw new Error(response?.message ?? `Failed to fetch ${layer} overview`);
  }

  const data = (await response.json()) as {
    defaultNode?: TopologyNodeBase | null;
    interiorNodes?: TopologyNodeBase[];
    serverNodes?: TopologyNodeBase[];
    spokeGroups?: TopologyOverview["spokeGroups"];
  };

  return {
    defaultNode: data.defaultNode ?? null,
    midNodes: data.interiorNodes ?? data.serverNodes ?? [],
    spokeGroups: data.spokeGroups ?? [],
  };
}

export async function fetchTopologySubgraph(
  request: (path: string) => Promise<ResponseLike | null>,
  layer: TopologyLayer,
  center: string,
  depth = 2,
): Promise<TopologySubgraph> {
  const params = new URLSearchParams({
    center,
    depth: String(depth),
    limit: String(TOPOLOGY_PAGE_SIZE),
  });
  const response = await request(
    `/api/v3/network-topology/${layer}/subgraph?${params.toString()}`,
  );
  if (!response?.ok) {
    throw new Error(response?.message ?? `Failed to fetch ${layer} subgraph`);
  }

  const data = (await response.json()) as TopologySubgraph;
  return {
    nodes: data.nodes ?? [],
    connections: data.connections ?? [],
  };
}
