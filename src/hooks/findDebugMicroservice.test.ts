import { describe, expect, it } from "vitest";
import { findDebugMicroservice } from "./findDebugMicroservice";

const systemApps = [
  {
    name: "system-remote-1",
    microservices: [
      {
        uuid: "debug-remote-1-uuid",
        name: "debug",
        iofogUuid: "node-remote-1",
      },
      {
        uuid: "router-remote-1-uuid",
        name: "router",
        iofogUuid: "node-remote-1",
      },
    ],
  },
  {
    name: "system-edge-2",
    microservices: [
      {
        uuid: "debug-edge-2-uuid",
        name: "debug",
        iofogUuid: "node-edge-2",
      },
    ],
  },
];

describe("findDebugMicroservice", () => {
  it("finds debug microservice under system-{agentName}", () => {
    expect(
      findDebugMicroservice("node-remote-1", "remote-1", systemApps),
    ).toBe("debug-remote-1-uuid");
  });

  it("returns null when agent name does not match system application", () => {
    expect(
      findDebugMicroservice("node-remote-1", "edge-2", systemApps),
    ).toBeNull();
  });

  it("returns null when agent name is missing", () => {
    expect(findDebugMicroservice("node-remote-1", undefined, systemApps)).toBeNull();
  });

  it("returns null when node uuid does not match debug microservice agent", () => {
    expect(
      findDebugMicroservice("wrong-node-uuid", "remote-1", systemApps),
    ).toBeNull();
  });

  it("supports legacy debug-{nodeUuid} microservice names", () => {
    const legacyApps = [
      {
        name: "system-legacy-agent",
        microservices: [
          {
            uuid: "legacy-debug-uuid",
            name: "debug-node-legacy",
            iofogUuid: "node-legacy",
          },
        ],
      },
    ];

    expect(
      findDebugMicroservice("node-legacy", "legacy-agent", legacyApps),
    ).toBe("legacy-debug-uuid");
  });
});
