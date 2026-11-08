import { describe, expect, it } from "vitest";

import {
  DEFAULT_NATS_HUB_ID,
  NATS_CLUSTER_NODE_ID,
} from "@/lib/networkTopology/constants";
import { prepareNatsConnections } from "@/lib/networkTopology/natsClusterEdges";
import type { TopologyNodeBase } from "@/lib/networkTopology/types";

const hub: TopologyNodeBase = {
  id: DEFAULT_NATS_HUB_ID,
  iofogUuid: null,
  fogName: null,
  host: "10.0.0.1",
  deploymentTarget: "remote",
  displayName: "Default NATS Hub",
  role: "hub",
  mode: "server",
};

const serverA: TopologyNodeBase = {
  id: "server-a",
  iofogUuid: "server-a",
  fogName: "server-a",
  host: "10.0.0.2",
  deploymentTarget: "edgelet",
  displayName: "server-a",
  role: "server",
  mode: "server",
};

const serverB: TopologyNodeBase = {
  id: "server-b",
  iofogUuid: "server-b",
  fogName: "server-b",
  host: "10.0.0.3",
  deploymentTarget: "edgelet",
  displayName: "server-b",
  role: "server",
  mode: "server",
};

function leaf(id: string): TopologyNodeBase {
  return {
    id,
    iofogUuid: id,
    fogName: id,
    host: "10.0.0.9",
    deploymentTarget: "edgelet",
    displayName: id,
    role: "leaf",
    mode: "leaf",
  };
}

describe("prepareNatsConnections", () => {
  it("collapses a bidirectional cluster pair to one undirected route", () => {
    const prepared = prepareNatsConnections(
      [hub, serverA],
      [
        { id: 1, source: "server-a", dest: DEFAULT_NATS_HUB_ID },
        { id: 2, source: DEFAULT_NATS_HUB_ID, dest: "server-a" },
      ],
    );

    expect(prepared).toHaveLength(1);
    expect(prepared[0]).toEqual(
      expect.objectContaining({
        id: 1,
        source: DEFAULT_NATS_HUB_ID,
        dest: "server-a",
      }),
    );
  });

  it("draws one leaf edge onto the cluster box", () => {
    const prepared = prepareNatsConnections(
      [hub, serverA, leaf("leaf-1")],
      [
        { id: 10, source: "leaf-1", dest: DEFAULT_NATS_HUB_ID },
        { id: 11, source: "leaf-1", dest: "server-a" },
      ],
    );

    expect(prepared).toHaveLength(1);
    expect(prepared[0]).toEqual(
      expect.objectContaining({
        source: "leaf-1",
        dest: NATS_CLUSTER_NODE_ID,
      }),
    );
  });

  it("keeps a leaf-to-leaf edge and two leaf parents", () => {
    const prepared = prepareNatsConnections(
      [hub, leaf("parent-a"), leaf("parent-b"), leaf("child")],
      [
        { id: 1, source: "parent-a", dest: DEFAULT_NATS_HUB_ID },
        { id: 2, source: "child", dest: "parent-a" },
        { id: 3, source: "child", dest: "parent-b" },
      ],
    );

    expect(prepared).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "parent-a",
          dest: NATS_CLUSTER_NODE_ID,
        }),
        expect.objectContaining({ id: 2, source: "child", dest: "parent-a" }),
        expect.objectContaining({ id: 3, source: "child", dest: "parent-b" }),
      ]),
    );
    expect(prepared).toHaveLength(3);
  });

  it("does not invent cluster routes the controller did not store", () => {
    const prepared = prepareNatsConnections(
      [hub, serverA, serverB, leaf("leaf-1")],
      [{ id: 4, source: "leaf-1", dest: "server-a" }],
    );

    expect(prepared).toHaveLength(1);
    expect(prepared[0]?.dest).toBe(NATS_CLUSTER_NODE_ID);
  });
});
