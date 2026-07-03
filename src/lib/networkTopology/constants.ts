export const DEFAULT_ROUTER_ID = "default-router";
export const DEFAULT_NATS_HUB_ID = "default-nats-hub";

export const PINNED_NODE_IDS: Record<"router" | "nats", string[]> = {
  router: [DEFAULT_ROUTER_ID],
  nats: [DEFAULT_NATS_HUB_ID],
};

export const ROUTER_ROLE_OPTIONS = ["default", "edge", "interior"] as const;
export const NATS_ROLE_OPTIONS = ["hub", "leaf", "server"] as const;

export const TOPOLOGY_PAGE_SIZE = 500;
