import React, { useMemo } from "react";

import SlideOver from "@/components/ui/SlideOver";
import ResourceLink from "@/components/ui/ResourceLink";
import type {
  TopologyLayer,
  TopologyNodeDetail,
} from "@/lib/networkTopology/types";

import { TopologyNodeIcon } from "./topologyNodeIcon";

type TopologyNodeSlideOverProps = {
  open: boolean;
  onClose: () => void;
  layer: TopologyLayer;
  detail: TopologyNodeDetail | null;
  loading: boolean;
  upstreamCount: number;
  downstreamCount: number;
};

export default function TopologyNodeSlideOver({
  open,
  onClose,
  layer,
  detail,
  loading,
  upstreamCount,
  downstreamCount,
}: TopologyNodeSlideOverProps) {
  const fields = useMemo(() => {
    if (!detail) {
      return [];
    }

    const routerDetail = detail as Record<string, unknown>;
    const baseFields = [
      {
        label: "Display Name",
        render: () => detail.displayName,
      },
      {
        label: "Role",
        render: () => detail.role,
      },
      {
        label: "Mode",
        render: () => detail.mode,
      },
      {
        label: "Deployment",
        render: () => detail.deploymentTarget,
      },
      {
        label: "Host",
        render: () => detail.host ?? "N/A",
      },
      {
        label: "Connections",
        render: () =>
          `${upstreamCount} upstream · ${downstreamCount} downstream`,
      },
    ];

    if (detail.iofogUuid) {
      baseFields.push({
        label: "Agent",
        render: () => (
          <ResourceLink path="/nodes/list" query={{ agentId: detail.iofogUuid! }}>
            {detail.fogName ?? detail.iofogUuid}
          </ResourceLink>
        ),
      });
    }

    const portEntries: { label: string; value?: unknown }[] =
      layer === "router"
        ? [
            { label: "Messaging port", value: routerDetail.messagingPort },
            { label: "Edge router port", value: routerDetail.edgeRouterPort },
            { label: "Inter-router port", value: routerDetail.interRouterPort },
          ]
        : [
            { label: "Server port", value: routerDetail.serverPort },
            { label: "Leaf port", value: routerDetail.leafPort },
            { label: "Cluster port", value: routerDetail.clusterPort },
            { label: "MQTT port", value: routerDetail.mqttPort },
            { label: "HTTP port", value: routerDetail.httpPort },
            { label: "JS storage", value: routerDetail.jsStorageSize },
            { label: "JS memory store", value: routerDetail.jsMemoryStoreSize },
          ];

    const portFields = portEntries
      .filter((entry) => entry.value != null && entry.value !== "")
      .map((entry) => ({
        label: entry.label,
        render: () => String(entry.value),
      }));

    return [...baseFields, ...portFields];
  }, [detail, layer, upstreamCount, downstreamCount]);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={
        loading
          ? "Loading…"
          : detail?.displayName ?? "Topology Node"
      }
      titleExtra={
        detail ? (
          <span className="inline-flex text-cyan-300">
            <TopologyNodeIcon node={detail} layer={layer} size={18} />
          </span>
        ) : null
      }
      data={detail}
      fields={fields as any}
    />
  );
}
