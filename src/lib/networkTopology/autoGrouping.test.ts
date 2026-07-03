import { describe, expect, it } from "vitest";

import { DEFAULT_ROUTER_ID } from "./constants";
import {
  AUTO_AGGREGATE_SPOKE_THRESHOLD,
  buildAutoGroupedView,
  getSwimlaneColumnForNode,
  isSpokeGroupNodeId,
  snapToSwimlaneColumn,
  spokeGroupNodeId,
} from "./autoGrouping";
import type { TopologyConnection, TopologyNodeBase } from "./types";

function edgeNode(
  id: string,
  role: string,
  displayName = id,
): TopologyNodeBase {
  return {
    id,
    iofogUuid: `${id}-uuid`,
    fogName: displayName,
    host: "host",
    deploymentTarget: "edgelet",
    displayName,
    role,
    mode: "edge",
  };
}

function hubNode(): TopologyNodeBase {
  return {
    id: DEFAULT_ROUTER_ID,
    iofogUuid: null,
    fogName: null,
    host: null,
    deploymentTarget: "remote",
    displayName: "Default Router",
    role: "default",
    mode: "hub",
  };
}

describe("autoGrouping", () => {
  it("aggregates spokes by upstream when above threshold", () => {
    const interior = edgeNode("interior-1", "interior", "Interior 1");
    const hub = hubNode();
    const spokes = Array.from({ length: AUTO_AGGREGATE_SPOKE_THRESHOLD }, (_, i) =>
      edgeNode(`edge-${i}`, "edge", `Edge ${i}`),
    );
    const nodes = [hub, interior, ...spokes];
    const connections: TopologyConnection[] = spokes.flatMap((spoke, i) => [
      { id: i * 2, source: spoke.id, dest: interior.id },
      { id: i * 2 + 1, source: interior.id, dest: hub.id },
    ]);

    const view = buildAutoGroupedView(nodes, connections, "router", {
      expandedSpokeGroups: new Set(),
      focusNodeId: null,
      searchMatchIds: new Set(),
    });

    expect(view.displayNodes.some((node) => isSpokeGroupNodeId(node.id))).toBe(
      true,
    );
    expect(view.displayNodes.length).toBe(3);
    expect(view.groupNodes[0]?.upstreamOf).toBe("interior-1");
  });

  it("does not aggregate when below threshold", () => {
    const interior = edgeNode("interior-1", "interior");
    const hub = hubNode();
    const spokes = [edgeNode("edge-1", "edge"), edgeNode("edge-2", "edge")];
    const nodes = [hub, interior, ...spokes];
    const connections: TopologyConnection[] = [
      { id: 1, source: "edge-1", dest: "interior-1" },
      { id: 2, source: "edge-2", dest: "interior-1" },
      { id: 3, source: "interior-1", dest: DEFAULT_ROUTER_ID },
    ];

    const view = buildAutoGroupedView(nodes, connections, "router", {
      expandedSpokeGroups: new Set(),
      focusNodeId: null,
      searchMatchIds: new Set(),
    });

    expect(view.displayNodes.length).toBe(4);
    expect(view.groupNodes.length).toBe(0);
  });

  it("filters to neighborhood when a node is focused", () => {
    const interior = edgeNode("interior-1", "interior");
    const interior2 = edgeNode("interior-2", "interior", "Interior 2");
    const hub = hubNode();
    const spokes = Array.from({ length: 8 }, (_, i) =>
      edgeNode(`edge-${i}`, "edge", `Edge ${i}`),
    );
    const nodes = [hub, interior, interior2, ...spokes];
    const connections: TopologyConnection[] = [
      ...spokes.slice(0, 4).flatMap((spoke, i) => [
        { id: i + 1, source: spoke.id, dest: interior.id },
      ]),
      ...spokes.slice(4).flatMap((spoke, i) => [
        { id: i + 20, source: spoke.id, dest: interior2.id },
      ]),
      { id: 100, source: interior.id, dest: hub.id },
      { id: 101, source: interior2.id, dest: hub.id },
    ];

    const view = buildAutoGroupedView(nodes, connections, "router", {
      expandedSpokeGroups: new Set(),
      focusNodeId: "edge-0",
      searchMatchIds: new Set(),
    });

    expect(view.displayNodes.some((node) => node.id === "interior-2")).toBe(
      false,
    );
    expect(view.displayNodes.some((node) => node.id === hub.id)).toBe(true);
  });

  it("snaps nodes to swimlane columns", () => {
    const edge = edgeNode("edge-1", "edge");
    const interior = edgeNode("interior-1", "interior");
    const hub = hubNode();

    expect(getSwimlaneColumnForNode(edge, "router")).toBe(0);
    expect(getSwimlaneColumnForNode(interior, "router")).toBe(1);
    expect(getSwimlaneColumnForNode(hub, "router")).toBe(2);

    const snapped = snapToSwimlaneColumn(edge, "router", { x: 999, y: 50 });
    expect(snapped.x).toBe(0);
    expect(snapped.y).toBe(50);
  });

  it("builds spoke group id from upstream", () => {
    expect(spokeGroupNodeId("interior-1")).toBe("spoke-group-interior-1");
  });
});
