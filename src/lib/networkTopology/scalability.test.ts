import { describe, expect, it } from "vitest";

import { DEFAULT_NATS_HUB_ID, DEFAULT_ROUTER_ID } from "./constants";
import { computeEdgeBundleMeta, computeEdgeBundleOffsets } from "./edgeBundling";
import { buildGroupedTopologyView } from "./grouping";
import {
  computeHierarchicalLayout,
  computeLayout,
  getHubId,
} from "./layout";
import { mergeLayoutPositions } from "./layoutPositions";
import { tracePathToHub } from "./pathTrace";
import { getSemanticZoomLevel } from "./semanticZoom";
import type { TopologyConnection, TopologyNodeBase } from "./types";

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

const connections: TopologyConnection[] = [
  { id: 1, source: "edge-1", dest: "interior-1" },
  { id: 2, source: "interior-1", dest: DEFAULT_ROUTER_ID },
];

describe("networkTopology layout", () => {
  it("places hub above interior above edge in hierarchical layout", () => {
    const positions = computeHierarchicalLayout(
      [hub, interior, edge],
      "router",
      connections,
    );
    expect(positions.get(DEFAULT_ROUTER_ID)?.y).toBeLessThan(
      positions.get("interior-1")!.y,
    );
    expect(positions.get("interior-1")!.y).toBeLessThan(
      positions.get("edge-1")!.y,
    );
  });

  it("orders edge nodes under their connected interior to reduce crossings", () => {
    const interiorB: TopologyNodeBase = {
      ...interior,
      id: "interior-2",
      iofogUuid: "interior-2",
      fogName: "interior-2",
      displayName: "interior-2",
    };
    const edgeB: TopologyNodeBase = {
      ...edge,
      id: "edge-2",
      iofogUuid: "edge-2",
      fogName: "edge-2",
      displayName: "edge-2",
    };
    const meshConnections: TopologyConnection[] = [
      { id: 1, source: "edge-1", dest: "interior-1" },
      { id: 2, source: "edge-2", dest: "interior-2" },
      { id: 3, source: "interior-1", dest: DEFAULT_ROUTER_ID },
      { id: 4, source: "interior-2", dest: DEFAULT_ROUTER_ID },
    ];
    const positions = computeHierarchicalLayout(
      [hub, interior, interiorB, edge, edgeB],
      "router",
      meshConnections,
    );

    const edge1X = positions.get("edge-1")!.x;
    const edge2X = positions.get("edge-2")!.x;
    const interior1X = positions.get("interior-1")!.x;
    const interior2X = positions.get("interior-2")!.x;

    expect(Math.abs(edge1X - interior1X)).toBeLessThan(
      Math.abs(edge1X - interior2X),
    );
    expect(Math.abs(edge2X - interior2X)).toBeLessThan(
      Math.abs(edge2X - interior1X),
    );
  });

  it("defaults to hierarchical in computeLayout", () => {
    const positions = computeLayout("hierarchical", [hub, interior, edge], connections, "router");
    expect(positions.get(DEFAULT_ROUTER_ID)).toBeDefined();
  });
});

describe("networkTopology pathTrace", () => {
  it("traces shortest path edges from edge node to hub", () => {
    const traced = tracePathToHub("edge-1", DEFAULT_ROUTER_ID, connections);
    expect(traced).toEqual(new Set([1, 2]));
  });

  it("returns hub id per layer", () => {
    expect(getHubId("router")).toBe(DEFAULT_ROUTER_ID);
    expect(getHubId("nats")).toBe(DEFAULT_NATS_HUB_ID);
  });
});

describe("networkTopology grouping", () => {
  it("collapses edge role nodes into a single group node", () => {
    const view = buildGroupedTopologyView(
      [hub, interior, edge],
      connections,
      "router",
      new Set(["edge"]),
    );

    expect(view.displayNodes.some((node) => node.id === "group-edge")).toBe(true);
    expect(view.hiddenNodeIds.has("edge-1")).toBe(true);
    expect(
      view.displayConnections.some(
        (connection) =>
          connection.source === "group-edge" && connection.dest === "interior-1",
      ),
    ).toBe(true);
  });
});

describe("networkTopology edgeBundling", () => {
  it("assigns bundle offsets for fan-out edges", () => {
    const fanOut: TopologyConnection[] = [
      { id: 10, source: "interior-1", dest: "edge-1" },
      { id: 11, source: "interior-1", dest: "edge-2" },
      { id: 12, source: "interior-1", dest: "edge-3" },
    ];
    const offsets = computeEdgeBundleOffsets(fanOut);
    expect(offsets.get(10)).not.toBe(offsets.get(12));
  });

  it("marks hub-bound edges for trunk routing", () => {
    const meta = computeEdgeBundleMeta(
      [{ id: 1, source: "interior-1", dest: DEFAULT_ROUTER_ID }],
      DEFAULT_ROUTER_ID,
      0,
      new Map([
        ["interior-1", 1],
        [DEFAULT_ROUTER_ID, 2],
      ]),
    );
    expect(meta.get(1)?.useTrunk).toBe(true);
  });
});

describe("networkTopology layout persistence", () => {
  it("keeps saved positions and only adds layout for new nodes", () => {
    const merged = mergeLayoutPositions(
      ["a", "b"],
      { a: { x: 10, y: 20 } },
      new Map([["b", { x: 100, y: 200 }]]),
    );
    expect(merged.a).toEqual({ x: 10, y: 20 });
    expect(merged.b).toEqual({ x: 100, y: 200 });
  });
});

describe("networkTopology semantic zoom", () => {
  it("returns detail level at high zoom", () => {
    expect(getSemanticZoomLevel(1)).toBe("detail");
  });

  it("returns overview level at low zoom", () => {
    expect(getSemanticZoomLevel(0.2)).toBe("overview");
  });
});
