import { Container, Cpu, Network, Waypoints } from "lucide-react";
import React from "react";

import KubernetesIcon from "@/components/icons/KubernetesIcon";
import {
  DEFAULT_NATS_HUB_ID,
  DEFAULT_ROUTER_ID,
} from "@/lib/networkTopology/constants";
import type { TopologyLayer, TopologyNodeBase } from "@/lib/networkTopology/types";

export type TopologyIconId =
  | "kubernetes"
  | "container"
  | "router-spoke"
  | "router-interior"
  | "nats-spoke"
  | "nats-server";

export function isDefaultHubNode(node: TopologyNodeBase): boolean {
  return node.id === DEFAULT_ROUTER_ID || node.id === DEFAULT_NATS_HUB_ID;
}

/** Primary graph title for default router / NATS hub nodes. */
export function getDefaultHubPrimaryLabel(node: TopologyNodeBase): string {
  const fogName = node.fogName?.trim();
  if (fogName) return fogName;
  if (node.deploymentTarget === "kubernetes") return "Kubernetes";
  return "Remote";
}

/** Role badge text for default hub nodes (differs from raw API role). */
export function getDefaultHubBadgeLabel(node: TopologyNodeBase): string {
  if (node.id === DEFAULT_ROUTER_ID) return "Default Router";
  return node.role;
}

export function getTopologyNodeIcon(
  node: TopologyNodeBase,
  layer: TopologyLayer,
): TopologyIconId {
  if (isDefaultHubNode(node)) {
    return node.deploymentTarget === "kubernetes" ? "kubernetes" : "container";
  }

  if (layer === "router") {
    return node.role === "interior" ? "router-interior" : "router-spoke";
  }

  return node.role === "server" ? "nats-server" : "nats-spoke";
}

type TopologyNodeIconProps = {
  node: TopologyNodeBase;
  layer: TopologyLayer;
  size?: number;
  className?: string;
};

export function TopologyNodeIcon({
  node,
  layer,
  size = 18,
  className,
}: TopologyNodeIconProps) {
  const iconId = getTopologyNodeIcon(node, layer);

  switch (iconId) {
    case "kubernetes":
      return <KubernetesIcon size={size} className={className} />;
    case "container":
      return <Container size={size} className={className} strokeWidth={2} />;
    case "router-interior":
      return <Waypoints size={size} className={className} strokeWidth={2} />;
    case "router-spoke":
      return <Network size={size} className={className} strokeWidth={2} />;
    case "nats-server":
      return <Waypoints size={size} className={className} strokeWidth={2} />;
    case "nats-spoke":
    default:
      return <Cpu size={size} className={className} strokeWidth={2} />;
  }
}

export function shouldOpenAgentSlideOver(node: TopologyNodeBase): boolean {
  return Boolean(node.iofogUuid);
}
