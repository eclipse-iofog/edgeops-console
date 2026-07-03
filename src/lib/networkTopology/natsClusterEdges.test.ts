import { describe, expect, it } from "vitest";

import { DEFAULT_NATS_HUB_ID } from "@/lib/networkTopology/constants";
import {
  buildSyntheticNatsClusterConnections,
  enrichNatsConnections,
  mergeTopologyConnections,
} from "@/lib/networkTopology/natsClusterEdges";
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

describe("natsClusterEdges", () => {
  it("adds synthetic server to hub and server to server links", () => {
    const synthetic = buildSyntheticNatsClusterConnections([
      hub,
      serverA,
      serverB,
    ]);

    expect(synthetic).toHaveLength(3);
    expect(synthetic).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "server-a", dest: DEFAULT_NATS_HUB_ID }),
        expect.objectContaining({ source: "server-b", dest: DEFAULT_NATS_HUB_ID }),
        expect.objectContaining({ source: "server-a", dest: "server-b" }),
      ]),
    );
  });

  it("does not duplicate api connections", () => {
    const enriched = enrichNatsConnections(
      [hub, serverA, serverB],
      [{ id: 1, source: "server-a", dest: DEFAULT_NATS_HUB_ID }],
    );

    const serverToHub = enriched.filter(
      (connection) =>
        connection.source === "server-a" && connection.dest === DEFAULT_NATS_HUB_ID,
    );
    expect(serverToHub).toHaveLength(1);
    expect(enriched.length).toBe(3);
  });

  it("mergeTopologyConnections skips existing pairs", () => {
    const merged = mergeTopologyConnections(
      [{ id: 1, source: "a", dest: "b" }],
      [{ id: -1, source: "a", dest: "b" }, { id: -2, source: "b", dest: "c" }],
    );

    expect(merged).toHaveLength(2);
  });
});
