import { describe, expect, it } from "vitest";

import { DEFAULT_ROUTER_ID } from "@/lib/networkTopology/constants";
import {
  classifyEdge,
  buildNodeLookup,
} from "@/lib/networkTopology/edgeStyles";
import {
  applyNodeFilters,
  EMPTY_MESH_FILTERS,
  getNodeConnections,
  addFogNameBadge,
  matchesFilters,
  normalizeFogNameTerms,
} from "@/lib/networkTopology/filters";
import type { TopologyNodeBase } from "@/lib/networkTopology/types";

const edge1Node: TopologyNodeBase = {
  id: "edge-1",
  iofogUuid: "edge-1",
  fogName: "edge-1",
  host: "10.0.0.1",
  deploymentTarget: "edgelet",
  displayName: "edge-1",
  role: "edge",
  mode: "edge",
};

const edge2Node: TopologyNodeBase = {
  id: "edge-2",
  iofogUuid: "edge-2",
  fogName: "edge-2",
  host: "10.0.0.2",
  deploymentTarget: "edgelet",
  displayName: "edge-2",
  role: "interior",
  mode: "interior",
};

const edgeNode: TopologyNodeBase = {
  id: "edge-legacy",
  iofogUuid: "edge-legacy",
  fogName: "edge-node-1",
  host: "10.0.0.1",
  deploymentTarget: "edgelet",
  displayName: "edge-node-1",
  role: "edge",
  mode: "edge",
};

const defaultRouter: TopologyNodeBase = {
  id: DEFAULT_ROUTER_ID,
  iofogUuid: null,
  fogName: null,
  host: "10.0.0.2",
  deploymentTarget: "remote",
  displayName: "Default Router",
  role: "default",
  mode: "edge",
};

const interiorNode: TopologyNodeBase = {
  id: "interior-1",
  iofogUuid: "interior-1",
  fogName: "interior-node-1",
  host: "10.0.0.3",
  deploymentTarget: "edgelet",
  displayName: "interior-node-1",
  role: "interior",
  mode: "interior",
};

describe("networkTopology filters", () => {
  it("pins default router when role filter excludes it", () => {
    const filtered = applyNodeFilters(
      [defaultRouter, edgeNode],
      { ...EMPTY_MESH_FILTERS, roles: ["edge"] },
      "router",
    );

    expect(filtered.map((node) => node.id)).toEqual([
      DEFAULT_ROUTER_ID,
      "edge-legacy",
    ]);
  });

  it("matches multiple fog name badge prefixes", () => {
    expect(normalizeFogNameTerms(["edge-a", "warehouse", "edge-b"])).toEqual([
      "edge-a",
      "warehouse",
      "edge-b",
    ]);
    expect(addFogNameBadge(["edge-a"], "edge-a")).toEqual(["edge-a"]);
    expect(addFogNameBadge(["edge-a"], "Edge-B")).toEqual(["edge-a", "Edge-B"]);
    expect(
      matchesFilters(edgeNode, {
        ...EMPTY_MESH_FILTERS,
        fogNames: ["warehouse", "edge-node"],
      }),
    ).toBe(true);
    expect(
      matchesFilters(edgeNode, {
        ...EMPTY_MESH_FILTERS,
        fogNames: ["prod", "warehouse"],
      }),
    ).toBe(false);
  });

  it("includes fog name matches and their connected neighbors", () => {
    const connections = [
      { id: 1, source: "edge-1", dest: "edge-2" },
      { id: 2, source: "edge-1", dest: DEFAULT_ROUTER_ID },
      { id: 3, source: "edge-2", dest: DEFAULT_ROUTER_ID },
    ];

    const filtered = applyNodeFilters(
      [defaultRouter, edge1Node, edge2Node],
      { ...EMPTY_MESH_FILTERS, fogNames: ["edge-1"] },
      "router",
      connections,
    );

    expect(filtered.map((node) => node.id).sort()).toEqual([
      DEFAULT_ROUTER_ID,
      "edge-1",
      "edge-2",
    ]);
  });

  it("does not cascade fog filter to two-hop neighbors", () => {
    const edge3Node: TopologyNodeBase = {
      id: "edge-3",
      iofogUuid: "edge-3",
      fogName: "edge-3",
      host: "10.0.0.4",
      deploymentTarget: "edgelet",
      displayName: "edge-3",
      role: "edge",
      mode: "edge",
    };

    const connections = [
      { id: 1, source: "edge-1", dest: "edge-2" },
      { id: 2, source: "edge-1", dest: DEFAULT_ROUTER_ID },
      { id: 3, source: "edge-2", dest: DEFAULT_ROUTER_ID },
      { id: 4, source: "edge-2", dest: "edge-3" },
      { id: 5, source: "edge-3", dest: DEFAULT_ROUTER_ID },
    ];

    const filtered = applyNodeFilters(
      [defaultRouter, edge1Node, edge2Node, edge3Node],
      { ...EMPTY_MESH_FILTERS, fogNames: ["edge-1"] },
      "router",
      connections,
    );

    expect(filtered.map((node) => node.id).sort()).toEqual([
      DEFAULT_ROUTER_ID,
      "edge-1",
      "edge-2",
    ]);
  });

  it("collects upstream and downstream connections", () => {
    const connections = getNodeConnections("edge-1", [
      { id: 1, source: "edge-1", dest: DEFAULT_ROUTER_ID },
      { id: 2, source: "edge-2", dest: DEFAULT_ROUTER_ID },
    ]);

    expect(connections.upstream).toHaveLength(1);
    expect(connections.downstream).toHaveLength(0);
    expect(connections.neighborIds.has(DEFAULT_ROUTER_ID)).toBe(true);
  });
});

describe("networkTopology edgeStyles", () => {
  it("classifies router interior and nats server edges", () => {
    const lookup = buildNodeLookup([
      interiorNode,
      { ...interiorNode, id: "interior-2", fogName: "interior-node-2" },
      edge1Node,
      {
        id: "server-1",
        iofogUuid: "server-1",
        fogName: "server-1",
        host: "10.0.0.4",
        deploymentTarget: "edgelet",
        displayName: "server-1",
        role: "server",
        mode: "server",
      },
      {
        id: "server-2",
        iofogUuid: "server-2",
        fogName: "server-2",
        host: "10.0.0.6",
        deploymentTarget: "edgelet",
        displayName: "server-2",
        role: "server",
        mode: "server",
      },
      {
        id: "leaf-1",
        iofogUuid: "leaf-1",
        fogName: "leaf-1",
        host: "10.0.0.5",
        deploymentTarget: "edgelet",
        displayName: "leaf-1",
        role: "leaf",
        mode: "leaf",
      },
    ]);

    expect(
      classifyEdge(
        { id: 1, source: "interior-1", dest: "interior-2" },
        lookup,
        "router",
      ),
    ).toBe("router-interior-interior");

    expect(
      classifyEdge(
        { id: 2, source: "interior-1", dest: "edge-1" },
        lookup,
        "router",
      ),
    ).toBe("router-edge-interior");

    expect(
      classifyEdge(
        { id: 3, source: "server-1", dest: "server-2" },
        lookup,
        "nats",
      ),
    ).toBe("nats-server-server");

    expect(
      classifyEdge(
        { id: 4, source: "leaf-1", dest: "server-1" },
        lookup,
        "nats",
      ),
    ).toBe("nats-leaf-server");
  });
});
