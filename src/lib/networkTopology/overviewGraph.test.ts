import { describe, expect, it } from "vitest";

import { DEFAULT_ROUTER_ID } from "./constants";
import {
  buildOverviewGraph,
  isSpokeGroupNodeId,
  mergeSubgraphExpansion,
  spokeGroupNodeId,
} from "./overviewGraph";
import { computeSwimlaneLayout } from "./layout";
import type { TopologyConnection, TopologyNodeBase, TopologyOverview } from "./types";

const hub: TopologyNodeBase = {
  id: DEFAULT_ROUTER_ID,
  iofogUuid: null,
  fogName: null,
  host: "10.0.0.1",
  deploymentTarget: "remote",
  displayName: "Default Router",
  role: "default",
  mode: "edge",
};

const interior: TopologyNodeBase = {
  id: "interior-1",
  iofogUuid: "interior-1",
  fogName: "interior-1",
  host: "10.0.0.2",
  deploymentTarget: "edgelet",
  displayName: "interior-1",
  role: "interior",
  mode: "interior",
};

describe("overviewGraph", () => {
  it("builds spoke group nodes from overview API shape", () => {
    const overview: TopologyOverview = {
      defaultNode: hub,
      midNodes: [interior],
      spokeGroups: [{ upstreamOf: "interior-1", role: "edge", count: 12 }],
    };

    const graph = buildOverviewGraph(overview, "router");
    expect(graph.nodes.some((node) => node.id === spokeGroupNodeId("interior-1"))).toBe(
      true,
    );
    expect(graph.connections.some(
      (connection) =>
        connection.source === spokeGroupNodeId("interior-1") &&
        connection.dest === "interior-1",
    )).toBe(true);
  });

  it("merges subgraph expansion by replacing spoke group node", () => {
    const overview: TopologyOverview = {
      defaultNode: hub,
      midNodes: [interior],
      spokeGroups: [{ upstreamOf: "interior-1", role: "edge", count: 2 }],
    };
    const base = buildOverviewGraph(overview, "router");
    const edge: TopologyNodeBase = {
      id: "edge-1",
      iofogUuid: "edge-1",
      fogName: "edge-1",
      host: "10.0.0.3",
      deploymentTarget: "edgelet",
      displayName: "edge-1",
      role: "edge",
      mode: "edge",
    };
    const merged = mergeSubgraphExpansion(
      base.nodes,
      base.connections,
      "interior-1",
      [edge, interior],
      [{ id: 99, source: "edge-1", dest: "interior-1" }],
    );

    expect(merged.nodes.some((node) => isSpokeGroupNodeId(node.id))).toBe(false);
    expect(merged.nodes.some((node) => node.id === "edge-1")).toBe(true);
  });
});

describe("swimlane layout", () => {
  it("places hub to the right of interior and spoke groups", () => {
    const overview: TopologyOverview = {
      defaultNode: hub,
      midNodes: [interior],
      spokeGroups: [{ upstreamOf: "interior-1", role: "edge", count: 5 }],
    };
    const graph = buildOverviewGraph(overview, "router");
    const positions = computeSwimlaneLayout(
      graph.nodes,
      graph.connections as TopologyConnection[],
      "router",
    );

    expect(positions.get(DEFAULT_ROUTER_ID)!.x).toBeGreaterThan(
      positions.get("interior-1")!.x,
    );
    expect(positions.get("interior-1")!.x).toBeGreaterThan(
      positions.get(spokeGroupNodeId("interior-1"))!.x,
    );
  });
});
