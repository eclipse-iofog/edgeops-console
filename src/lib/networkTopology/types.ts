export type DeploymentTarget = "kubernetes" | "remote" | "edgelet";
export type ControlPlane = "kubernetes" | "remote";
export type TopologyLayer = "router" | "nats";
export type RouterRole = "default" | "edge" | "interior";
export type NatsRole = "hub" | "leaf" | "server";

export interface TopologyNodeBase {
  id: string;
  iofogUuid: string | null;
  fogName: string | null;
  host: string | null;
  deploymentTarget: DeploymentTarget;
  displayName: string;
  role: string;
  mode: string;
}

export interface RouterTopologyNode extends TopologyNodeBase {
  role: RouterRole;
  mode: "edge" | "interior";
}

export interface NatsTopologyNode extends TopologyNodeBase {
  role: NatsRole;
  mode: "leaf" | "server";
}

export interface RouterTopologyNodeDetail extends RouterTopologyNode {
  messagingPort?: number;
  edgeRouterPort?: number | null;
  interRouterPort?: number | null;
  isDefault?: boolean;
}

export interface NatsTopologyNodeDetail extends NatsTopologyNode {
  serverPort?: number | null;
  leafPort?: number | null;
  clusterPort?: number | null;
  mqttPort?: number | null;
  httpPort?: number | null;
  jsStorageSize?: string | null;
  jsMemoryStoreSize?: string | null;
  isHub?: boolean;
}

export type TopologyNodeDetail =
  | RouterTopologyNodeDetail
  | NatsTopologyNodeDetail;

export interface TopologyConnection {
  id: number;
  source: string;
  dest: string;
}

export interface TopologyLayerData {
  nodes: TopologyNodeBase[];
  connections: TopologyConnection[];
}

export interface TopologyLayerSnapshot extends TopologyLayerData {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  loaded: boolean;
  loadProgress: { nodes: number; connections: number; nodesTotal: number; connectionsTotal: number } | null;
}

export interface TopologySummary {
  controlPlane: ControlPlane;
  router: {
    totalNodes: number;
    totalConnections: number;
    byRole: Record<string, number>;
  };
  nats: {
    totalNodes: number;
    totalConnections: number;
    byRole: Record<string, number>;
  };
}

export interface NetworkTopologySnapshot {
  summary: TopologySummary | null;
  summaryLoading: boolean;
  summaryError: string | null;
  router: TopologyLayerSnapshot;
  nats: TopologyLayerSnapshot;
}

export interface NodeConnectionsResponse {
  upstream: TopologyConnection[];
  downstream: TopologyConnection[];
}

export type MeshGraphFilters = {
  roles: string[];
  fogNames: string[];
};

export type TopologyViewMode = "overview" | "full";

export interface TopologySpokeGroup {
  upstreamOf: string;
  role: string;
  count: number;
}

export interface TopologyOverview {
  defaultNode: TopologyNodeBase | null;
  midNodes: TopologyNodeBase[];
  spokeGroups: TopologySpokeGroup[];
}

export interface TopologySubgraph {
  nodes: TopologyNodeBase[];
  connections: TopologyConnection[];
}
