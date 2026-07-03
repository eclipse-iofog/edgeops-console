import { describe, expect, it } from "vitest";

import {
  DEFAULT_NATS_HUB_ID,
  DEFAULT_ROUTER_ID,
} from "@/lib/networkTopology/constants";
import type { TopologyNodeBase } from "@/lib/networkTopology/types";

import {
  getDefaultHubBadgeLabel,
  getDefaultHubPrimaryLabel,
} from "./topologyNodeIcon";

const baseDefaultHub: TopologyNodeBase = {
  id: DEFAULT_ROUTER_ID,
  iofogUuid: null,
  fogName: null,
  host: "192.168.1.11",
  deploymentTarget: "remote",
  displayName: "Default Router",
  role: "default",
  mode: "edge",
};

describe("default hub graph labels", () => {
  it("prefers fog name for the primary title", () => {
    expect(
      getDefaultHubPrimaryLabel({ ...baseDefaultHub, fogName: "edge-router-1" }),
    ).toBe("edge-router-1");
  });

  it("shows Kubernetes when there is no fog name on a k8s deployment", () => {
    expect(
      getDefaultHubPrimaryLabel({
        ...baseDefaultHub,
        deploymentTarget: "kubernetes",
      }),
    ).toBe("Kubernetes");
  });

  it("shows Remote for non-k8s deployments without a fog name", () => {
    expect(getDefaultHubPrimaryLabel(baseDefaultHub)).toBe("Remote");
  });

  it("uses Default Router badge text for the default router node", () => {
    expect(getDefaultHubBadgeLabel(baseDefaultHub)).toBe("Default Router");
  });

  it("keeps hub badge text for the default NATS hub node", () => {
    expect(
      getDefaultHubBadgeLabel({
        ...baseDefaultHub,
        id: DEFAULT_NATS_HUB_ID,
        displayName: "Default NATS Hub",
        role: "hub",
      }),
    ).toBe("hub");
  });
});
