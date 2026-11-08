import { describe, expect, it } from "vitest";

import {
  DEFAULT_NATS_HUB_ID,
  DEFAULT_ROUTER_ID,
  NATS_CLUSTER_NODE_ID,
} from "./constants";
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

  it("folds edges that only dial the default router into one badge", () => {
    const hub = hubNode();
    const spokes = Array.from({ length: AUTO_AGGREGATE_SPOKE_THRESHOLD }, (_, i) =>
      edgeNode(`edge-${i}`, "edge"),
    );
    const connections: TopologyConnection[] = spokes.map((spoke, index) => ({
      id: index + 1,
      source: spoke.id,
      dest: DEFAULT_ROUTER_ID,
    }));

    const view = buildAutoGroupedView([hub, ...spokes], connections, "router", {
      expandedSpokeGroups: new Set(),
      focusNodeId: null,
      searchMatchIds: new Set(),
    });

    expect(view.groupNodes).toHaveLength(1);
    expect(view.groupNodes[0]?.upstreamOf).toBe(DEFAULT_ROUTER_ID);
    expect(view.displayNodes).toHaveLength(2);
  });

  it("folds cluster leaves into one badge and keeps a leaf chain visible", () => {
    const hub = edgeNode(DEFAULT_NATS_HUB_ID, "hub", "Hub");
    const clusterLeaves = Array.from(
      { length: AUTO_AGGREGATE_SPOKE_THRESHOLD },
      (_, index) => edgeNode(`leaf-${index}`, "leaf"),
    );
    const parent = clusterLeaves[0]!;
    const child = edgeNode("leaf-child", "leaf");
    const connections: TopologyConnection[] = [
      ...clusterLeaves.map((node, index) => ({
        id: index + 1,
        source: node.id,
        dest: NATS_CLUSTER_NODE_ID,
      })),
      { id: 50, source: child.id, dest: parent.id },
    ];

    const view = buildAutoGroupedView(
      [hub, ...clusterLeaves, child],
      connections,
      "nats",
      {
        expandedSpokeGroups: new Set(),
        focusNodeId: null,
        searchMatchIds: new Set(),
      },
    );

    const group = view.groupNodes.find(
      (node) => node.id === spokeGroupNodeId(NATS_CLUSTER_NODE_ID),
    );
    expect(group?.memberIds).not.toContain(parent.id);
    expect(group?.memberIds).not.toContain(child.id);
    expect(group?.memberIds).toHaveLength(AUTO_AGGREGATE_SPOKE_THRESHOLD - 1);
    expect(view.displayNodes.some((node) => node.id === parent.id)).toBe(true);
    expect(view.displayNodes.some((node) => node.id === child.id)).toBe(true);
    expect(
      view.displayConnections.some(
        (connection) =>
          connection.source === group?.id &&
          connection.dest === NATS_CLUSTER_NODE_ID,
      ),
    ).toBe(true);
    expect(view.displayNodes.some((node) => node.id === NATS_CLUSTER_NODE_ID)).toBe(
      false,
    );
  });

  it("keeps ancestors and descendants on the canvas when a nats leaf is focused", () => {
    const hub = edgeNode(DEFAULT_NATS_HUB_ID, "hub", "Hub");
    const server = edgeNode("edge-4", "server", "edge-4");
    const edge1 = edgeNode("edge-1", "leaf");
    const edge2 = edgeNode("edge-2", "leaf");
    const edge3 = edgeNode("edge-3", "leaf");
    const sibling = edgeNode("lab-raspi", "leaf");
    const view = buildAutoGroupedView(
      [hub, server, edge1, edge2, edge3, sibling],
      [
        { id: 1, source: edge1.id, dest: NATS_CLUSTER_NODE_ID },
        { id: 2, source: edge2.id, dest: edge1.id },
        { id: 3, source: edge3.id, dest: edge2.id },
        { id: 4, source: sibling.id, dest: edge2.id },
      ],
      "nats",
      {
        expandedSpokeGroups: new Set(),
        focusNodeId: sibling.id,
        searchMatchIds: new Set(),
      },
    );

    expect(view.displayNodes.map((node) => node.id)).toEqual([
      hub.id,
      server.id,
      edge1.id,
      edge2.id,
      edge3.id,
      sibling.id,
    ]);
  });

  it("keeps the leaf chain when a nats fog search matches one leaf", () => {
    const hub = edgeNode(DEFAULT_NATS_HUB_ID, "hub", "lima");
    const server = edgeNode("edge-4", "server", "edge-4");
    const edge1 = edgeNode("edge-1", "leaf");
    const edge2 = edgeNode("edge-2", "leaf");
    const edge3 = edgeNode("edge-3", "leaf");
    const view = buildAutoGroupedView(
      [hub, server, edge1, edge2, edge3],
      [
        { id: 1, source: edge1.id, dest: NATS_CLUSTER_NODE_ID },
        { id: 2, source: edge2.id, dest: edge1.id },
        { id: 3, source: edge3.id, dest: edge2.id },
      ],
      "nats",
      {
        expandedSpokeGroups: new Set(),
        focusNodeId: null,
        searchMatchIds: new Set([edge1.id]),
      },
    );

    expect(view.displayNodes.map((node) => node.id).sort()).toEqual([
      DEFAULT_NATS_HUB_ID,
      "edge-1",
      "edge-2",
      "edge-3",
      "edge-4",
    ]);
  });

  it("keeps a leaf edge that lands on the cluster box", () => {
    const hub = edgeNode(DEFAULT_NATS_HUB_ID, "hub", "Hub");
    const leaf = edgeNode("edge-1", "leaf");
    const view = buildAutoGroupedView(
      [hub, leaf],
      [{ id: 2, source: leaf.id, dest: NATS_CLUSTER_NODE_ID }],
      "nats",
      {
        expandedSpokeGroups: new Set(),
        focusNodeId: null,
        searchMatchIds: new Set(),
      },
    );

    expect(view.displayNodes.map((node) => node.id)).toEqual([hub.id, leaf.id]);
    expect(view.displayConnections).toEqual([
      expect.objectContaining({
        source: leaf.id,
        dest: NATS_CLUSTER_NODE_ID,
      }),
    ]);
  });
});
