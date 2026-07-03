import React, { useState } from "react";
import { GitBranch, RefreshCw } from "lucide-react";

import {
  useNetworkTopology,
  useNetworkTopologyStore,
} from "@/lib/networkTopology/useNetworkTopology";
import type { TopologyLayer } from "@/lib/networkTopology/types";

import MeshGraphLayerTab from "./MeshGraphLayerTab";

const TABS: { id: TopologyLayer; label: string }[] = [
  { id: "router", label: "Router" },
  { id: "nats", label: "Message Fabric" },
];

function tabClass(active: boolean): string {
  return [
    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-cyan-500/20 text-cyan-100 border border-cyan-400/40"
      : "text-gray-400 hover:text-white hover:bg-gray-800/80 border border-transparent",
  ].join(" ");
}

export default function MeshGraphPage() {
  const snapshot = useNetworkTopology();
  const store = useNetworkTopologyStore();
  const [activeLayer, setActiveLayer] = useState<TopologyLayer>("router");

  const summary = snapshot.summary;
  const layerStats =
    activeLayer === "router" ? summary?.router : summary?.nats;

  const handleRefresh = () => {
    void store.fetchSummary({ silent: true });
    void store.fetchLayer(activeLayer, { silent: true });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="border-b border-gray-700/50 bg-gray-800/50 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600">
              <GitBranch className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mesh Graph</h1>
              <p className="mt-1 text-sm text-gray-400">
                {snapshot.summaryLoading
                  ? "Loading summary…"
                  : layerStats
                    ? `${layerStats.totalNodes} nodes · ${layerStats.totalConnections} connections`
                    : "Network topology visualization"}
                {summary?.controlPlane
                  ? ` · Control plane: ${summary.controlPlane}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={tabClass(activeLayer === tab.id)}
                onClick={() => setActiveLayer(tab.id)}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              className="ml-2 inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
              onClick={handleRefresh}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeLayer === "router" ? (
          <MeshGraphLayerTab layer="router" layerData={snapshot.router} />
        ) : (
          <MeshGraphLayerTab layer="nats" layerData={snapshot.nats} />
        )}
      </div>
    </div>
  );
}
