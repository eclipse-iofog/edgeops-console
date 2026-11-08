import { describe, expect, it } from "vitest";

import {
  DEFAULT_NATS_HUB_ID,
  DEFAULT_ROUTER_ID,
  NATS_CLUSTER_NODE_ID,
} from "./constants";
import { computeEdgeBundleMeta, computeEdgeBundleOffsets } from "./edgeBundling";
import { buildGroupedTopologyView } from "./grouping";
import {
  computeDefaultSwimlaneLayout,
  computeHierarchicalLayout,
  computeLayout,
  computeNatsVerticalLayout,
  computeSwimlaneMetrics,
  SWIMLANE_COLUMN_X,
  getHubId,
} from "./layout";
import { mergeLayoutPositions } from "./layoutPositions";
import { collectDescendants, tracePathToHub } from "./pathTrace";
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

describe("nats vertical layout", () => {
  const natsHub: TopologyNodeBase = {
    id: DEFAULT_NATS_HUB_ID,
    iofogUuid: null,
    fogName: null,
    host: null,
    deploymentTarget: "remote",
    displayName: "Hub",
    role: "hub",
    mode: "server",
  };
  const server: TopologyNodeBase = {
    id: "server-1",
    iofogUuid: "server-1",
    fogName: "server-1",
    host: null,
    deploymentTarget: "edgelet",
    displayName: "server-1",
    role: "server",
    mode: "server",
  };

  function leafNode(id: string): TopologyNodeBase {
    return {
      id,
      iofogUuid: id,
      fogName: id,
      host: null,
      deploymentTarget: "edgelet",
      displayName: id,
      role: "leaf",
      mode: "leaf",
    };
  }

  it("places a cluster leaf below the servers and a child leaf further down", () => {
    const parent = leafNode("parent");
    const child = leafNode("child");
    const positions = computeNatsVerticalLayout(
      [natsHub, server, parent, child],
      [
        { id: 1, source: "parent", dest: NATS_CLUSTER_NODE_ID },
        { id: 2, source: "child", dest: "parent" },
      ],
    );

    expect(positions.get("parent")!.y).toBeGreaterThan(positions.get("server-1")!.y);
    expect(positions.get("child")!.y).toBeGreaterThan(positions.get("parent")!.y);
  });

  it("places a detached leaf tree to the right of the cluster", () => {
    const root = leafNode("detached-root");
    const positions = computeNatsVerticalLayout(
      [natsHub, server, root],
      [],
    );

    expect(positions.get("detached-root")!.x).toBeGreaterThan(
      positions.get("server-1")!.x,
    );
  });
});

describe("networkTopology pathTrace", () => {
  it("traces shortest path edges from edge node to hub", () => {
    const traced = tracePathToHub("edge-1", DEFAULT_ROUTER_ID, connections);
    expect(traced).toEqual(new Set([1, 2]));
  });

  it("collects every descendant under a leaf", () => {
    const descendants = collectDescendants("edge-1", [
      { id: 1, source: "edge-2", dest: "edge-1" },
      { id: 2, source: "edge-3", dest: "edge-2" },
      { id: 3, source: "lab-raspi", dest: "edge-2" },
      { id: 4, source: "edge-1", dest: NATS_CLUSTER_NODE_ID },
    ]);

    expect([...descendants.nodeIds].sort()).toEqual([
      "edge-2",
      "edge-3",
      "lab-raspi",
    ]);
    expect(descendants.edgeIds).toEqual(new Set([1, 2, 3]));
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

describe("networkTopology default swimlane layout", () => {
  it("uses fallback anchors when canvas is unavailable", () => {
    const metrics = computeSwimlaneMetrics([2, 1, 1]);
    expect(metrics.columnX).toEqual(SWIMLANE_COLUMN_X);
  });

  it("places role columns left, center, and right from canvas ratios", () => {
    const canvas = { width: 1200, height: 800, zoom: 0.5 };
    const positions = computeDefaultSwimlaneLayout(
      [hub, interior, edge],
      connections,
      "router",
      canvas,
    );

    const edgeX = positions.get("edge-1")!.x;
    const interiorX = positions.get("interior-1")!.x;
    const hubX = positions.get(DEFAULT_ROUTER_ID)!.x;

    expect(edgeX).toBeLessThan(interiorX);
    expect(interiorX).toBeLessThan(hubX);
  });

  it("widens lane spread when zoomed out", () => {
    const zoomedIn = computeSwimlaneMetrics([2, 1, 1], {
      width: 1200,
      height: 800,
      zoom: 1,
    });
    const zoomedOut = computeSwimlaneMetrics([2, 1, 1], {
      width: 1200,
      height: 800,
      zoom: 0.25,
    });
    expect(zoomedOut.columnX[2] - zoomedOut.columnX[0]).toBeGreaterThan(
      zoomedIn.columnX[2] - zoomedIn.columnX[0],
    );
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
