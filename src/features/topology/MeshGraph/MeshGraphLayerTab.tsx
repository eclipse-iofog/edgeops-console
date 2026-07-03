import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { useController, useData } from "@/app/providers";
import AgentSlideOverPanel from "@/features/agents/AgentSlideOverPanel";
import { fetchTopologyNodeDetail } from "@/lib/networkTopology/api";
import {
  buildAutoGroupedView,
  countDegradedNodes,
  isSpokeGroupNodeId,
  spokeGroupNodeId,
  spokeGroupUpstreamOf,
} from "@/lib/networkTopology/autoGrouping";
import {
  applyNodeFilters,
  EMPTY_MESH_FILTERS,
  getNodeConnections,
  normalizeFogNameTerms,
} from "@/lib/networkTopology/filters";
import { resolveGroupMemberIds } from "@/lib/networkTopology/grouping";
import { enrichNatsConnections } from "@/lib/networkTopology/natsClusterEdges";
import { getHubId } from "@/lib/networkTopology/layout";
import { tracePathToHub } from "@/lib/networkTopology/pathTrace";
import type {
  MeshGraphFilters,
  TopologyLayer,
  TopologyLayerSnapshot,
  TopologyNodeBase,
  TopologyNodeDetail,
} from "@/lib/networkTopology/types";
import { useNetworkTopologyStore } from "@/lib/networkTopology/useNetworkTopology";

import MeshGraphFilterBar from "./MeshGraphFilterBar";
import TopologyGraph, { type GraphFocusRequest } from "./TopologyGraph";
import TopologyNodeSlideOver from "./TopologyNodeSlideOver";
import { shouldOpenAgentSlideOver } from "./topologyNodeIcon";

type MeshGraphLayerTabProps = {
  layer: TopologyLayer;
  layerData: TopologyLayerSnapshot;
};

function setsEqual(a: Set<string>, b: string[]): boolean {
  if (a.size !== b.length) {
    return false;
  }
  return b.every((id) => a.has(id));
}

export default function MeshGraphLayerTab({
  layer,
  layerData,
}: MeshGraphLayerTabProps) {
  const { request } = useController();
  const { data } = useData();
  const store = useNetworkTopologyStore();
  const [filters, setFilters] = useState<MeshGraphFilters>(EMPTY_MESH_FILTERS);
  const [expandedSpokeGroups, setExpandedSpokeGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchMatchNodeIds, setSearchMatchNodeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [focusRequest, setFocusRequest] = useState<GraphFocusRequest | null>(
    null,
  );
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [pathTraceEdgeIds, setPathTraceEdgeIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [neighborNodeIds, setNeighborNodeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [agentSlideOverOpen, setAgentSlideOverOpen] = useState(false);
  const [topologySlideOverOpen, setTopologySlideOverOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [topologyDetail, setTopologyDetail] = useState<TopologyNodeDetail | null>(
    null,
  );
  const [topologyDetailLoading, setTopologyDetailLoading] = useState(false);
  const [connectionCounts, setConnectionCounts] = useState({
    upstream: 0,
    downstream: 0,
  });

  useEffect(() => {
    if (!layerData.loaded && !layerData.loading) {
      void store.fetchLayer(layer);
    }
  }, [layer, layerData.loaded, layerData.loading, store]);

  const layerConnections = useMemo(() => {
    if (layer === "nats") {
      return enrichNatsConnections(layerData.nodes, layerData.connections);
    }
    return layerData.connections;
  }, [layer, layerData.nodes, layerData.connections]);

  const filteredNodes = useMemo(
    () =>
      applyNodeFilters(
        layerData.nodes,
        filters,
        layer,
        layerConnections,
      ),
    [layerData.nodes, layerConnections, filters, layer],
  );

  const neighborhoodFocusId =
    selectedNodeId && searchMatchNodeIds.size === 0 ? selectedNodeId : null;

  const groupedView = useMemo(
    () =>
      buildAutoGroupedView(filteredNodes, layerConnections, layer, {
        expandedSpokeGroups,
        focusNodeId: neighborhoodFocusId,
        searchMatchIds: searchMatchNodeIds,
      }),
    [
      filteredNodes,
      layerConnections,
      layer,
      expandedSpokeGroups,
      neighborhoodFocusId,
      searchMatchNodeIds,
    ],
  );

  const agentStatusByUuid = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    const byUUID = data?.reducedAgents?.byUUID ?? {};
    for (const node of layerData.nodes) {
      if (node.iofogUuid && byUUID[node.iofogUuid]) {
        map[node.iofogUuid] = byUUID[node.iofogUuid].daemonStatus;
      }
    }
    return map;
  }, [data?.reducedAgents?.byUUID, layerData.nodes]);

  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const node of layerData.nodes) {
      stats[node.role] = (stats[node.role] ?? 0) + 1;
    }
    return stats;
  }, [layerData.nodes]);

  const degradedCount = useMemo(
    () => countDegradedNodes(layerData.nodes, agentStatusByUuid),
    [layerData.nodes, agentStatusByUuid],
  );

  const hubId = getHubId(layer);

  const findSearchMatches = useCallback(
    (fogNames: string[]) => {
      const terms = normalizeFogNameTerms(fogNames);
      if (terms.length === 0) {
        return [];
      }
      return filteredNodes.filter((node) => {
        const fogName = (node.fogName ?? "").toLowerCase();
        const displayName = (node.displayName ?? "").toLowerCase();
        return terms.some(
          (term) => fogName.startsWith(term) || displayName.startsWith(term),
        );
      });
    },
    [filteredNodes],
  );

  const applyInteractionFocus = useCallback(
    (nodeId: string | null, connections = layerConnections) => {
      if (!nodeId) {
        setHighlightedEdgeIds(new Set());
        setPathTraceEdgeIds(new Set());
        setNeighborNodeIds(new Set());
        return;
      }

      const resolvedIds = resolveGroupMemberIds(nodeId, groupedView.groupNodes);
      const primaryId = resolvedIds[0] ?? nodeId;
      const connectionInfo = getNodeConnections(primaryId, connections);
      const traced = tracePathToHub(primaryId, hubId, connections);

      setHighlightedEdgeIds(
        new Set(connectionInfo.all.map((connection) => connection.id)),
      );
      setPathTraceEdgeIds(traced);
      setNeighborNodeIds(connectionInfo.neighborIds);
    },
    [groupedView.groupNodes, hubId, layerConnections],
  );

  useEffect(() => {
    const matches = findSearchMatches(filters.fogNames);
    const matchIds = matches.map((node) => node.id);

    setSearchMatchNodeIds((current) => {
      if (setsEqual(current, matchIds)) {
        return current;
      }
      return new Set(matchIds);
    });

    if (matchIds.length === 0) {
      return;
    }

    setFocusRequest({ nodeIds: matchIds, token: Date.now() });
    if (matchIds.length === 1 && !selectedNodeId) {
      applyInteractionFocus(matchIds[0]);
    }
  }, [filters.fogNames, findSearchMatches, selectedNodeId, applyInteractionFocus]);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    applyInteractionFocus(null);
    setAgentSlideOverOpen(false);
    setTopologySlideOverOpen(false);
    setSelectedAgent(null);
    setTopologyDetail(null);
  }, [applyInteractionFocus]);

  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      setHoveredNodeId(nodeId);
      if (selectedNodeId) {
        return;
      }
      applyInteractionFocus(nodeId);
    },
    [applyInteractionFocus, selectedNodeId],
  );

  const handleSpokeGroupClick = useCallback(
    (upstreamOf: string) => {
      setExpandedSpokeGroups((current) => {
        const next = new Set(current);
        next.add(upstreamOf);
        return next;
      });
      setFocusRequest({
        nodeIds: [upstreamOf, spokeGroupNodeId(upstreamOf)],
        token: Date.now(),
      });
      applyInteractionFocus(upstreamOf);
      setSelectedNodeId(spokeGroupNodeId(upstreamOf));
    },
    [applyInteractionFocus],
  );

  const handleNodeClick = useCallback(
    async (node: TopologyNodeBase) => {
      if (isSpokeGroupNodeId(node.id)) {
        const upstreamOf = spokeGroupUpstreamOf(node.id);
        if (upstreamOf) {
          handleSpokeGroupClick(upstreamOf);
        }
        return;
      }

      applyInteractionFocus(node.id);
      setSelectedNodeId(node.id);

      const connectionInfo = getNodeConnections(node.id, layerConnections);
      setConnectionCounts({
        upstream: connectionInfo.upstream.length,
        downstream: connectionInfo.downstream.length,
      });

      if (shouldOpenAgentSlideOver(node)) {
        const cached = data?.reducedAgents?.byUUID?.[node.iofogUuid!];
        setSelectedAgent(
          cached ?? {
            uuid: node.iofogUuid,
            name: node.fogName ?? node.displayName,
          },
        );
        setAgentSlideOverOpen(true);
        setTopologySlideOverOpen(false);
        setTopologyDetail(null);
        return;
      }

      setAgentSlideOverOpen(false);
      setSelectedAgent(null);
      setTopologySlideOverOpen(true);
      setTopologyDetailLoading(true);
      try {
        const detail = await fetchTopologyNodeDetail(
          request,
          layer,
          node.id,
        );
        setTopologyDetail(detail);
      } catch {
        setTopologyDetail(node as TopologyNodeDetail);
      } finally {
        setTopologyDetailLoading(false);
      }
    },
    [
      applyInteractionFocus,
      handleSpokeGroupClick,
      layer,
      layerConnections,
      data?.reducedAgents?.byUUID,
      request,
    ],
  );

  const handleSearchFocus = useCallback(() => {
    const matches = findSearchMatches(filters.fogNames);
    if (matches.length === 0) {
      return;
    }

    const matchIds = matches.map((node) => node.id);
    setFocusRequest({ nodeIds: matchIds, token: Date.now() });
    applyInteractionFocus(matchIds[0]);
    setSelectedNodeId(matchIds[0]);
  }, [applyInteractionFocus, filters.fogNames, findSearchMatches]);

  const handleResetView = useCallback(() => {
    setExpandedSpokeGroups(new Set());
    clearSelection();
  }, [clearSelection]);

  const isLoading =
    layerData.loading || (!layerData.loaded && !layerData.error);
  const isRefreshing = layerData.refreshing;
  const progress = layerData.loadProgress;
  const isFocused = Boolean(selectedNodeId || hoveredNodeId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MeshGraphFilterBar
        layer={layer}
        filters={filters}
        onChange={setFilters}
        visibleCount={groupedView.displayNodes.length}
        totalCount={layerData.nodes.length}
        visibleConnectionCount={groupedView.displayConnections.length}
        degradedCount={degradedCount}
        roleStats={roleStats}
        isFocused={isFocused}
        onResetView={handleResetView}
        onSearchFocus={handleSearchFocus}
        canSearchFocus={filters.fogNames.length > 0}
      />

      <div className="relative flex-1 min-h-0">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-300">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
            <div className="text-sm">Loading topology…</div>
            {progress ? (
              <div className="text-xs text-gray-500">
                Nodes {progress.nodes}
                {progress.nodesTotal ? ` / ${progress.nodesTotal}` : ""} ·
                Connections {progress.connections}
                {progress.connectionsTotal
                  ? ` / ${progress.connectionsTotal}`
                  : ""}
              </div>
            ) : null}
          </div>
        ) : layerData.error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-red-300">{layerData.error}</p>
            <button
              type="button"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-500"
              onClick={() => void store.fetchLayer(layer)}
            >
              Retry
            </button>
          </div>
        ) : groupedView.displayNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No nodes match the current filters.
          </div>
        ) : (
          <TopologyGraph
            layer={layer}
            nodes={groupedView.displayNodes}
            allNodes={layerData.nodes}
            connections={groupedView.displayConnections}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={hoveredNodeId}
            highlightedEdgeIds={highlightedEdgeIds}
            pathTraceEdgeIds={pathTraceEdgeIds}
            neighborNodeIds={neighborNodeIds}
            searchMatchNodeIds={searchMatchNodeIds}
            focusRequest={focusRequest}
            expandedSpokeGroups={expandedSpokeGroups}
            expandingSpokeGroup={null}
            agentStatusByUuid={agentStatusByUuid}
            onNodeClick={handleNodeClick}
            onSpokeGroupClick={handleSpokeGroupClick}
            onNodeHover={handleNodeHover}
            onPaneClick={clearSelection}
          />
        )}

        {isRefreshing ? (
          <div className="absolute right-4 top-4 z-20 rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-1.5 text-xs text-gray-300">
            Refreshing…
          </div>
        ) : null}
      </div>

      <AgentSlideOverPanel
        open={agentSlideOverOpen}
        onClose={() => {
          setAgentSlideOverOpen(false);
          setSelectedAgent(null);
        }}
        selectedNode={selectedAgent}
        onSelectedNodeChange={setSelectedAgent}
      />

      <TopologyNodeSlideOver
        open={topologySlideOverOpen}
        onClose={() => {
          setTopologySlideOverOpen(false);
          setTopologyDetail(null);
        }}
        layer={layer}
        detail={topologyDetail}
        loading={topologyDetailLoading}
        upstreamCount={connectionCounts.upstream}
        downstreamCount={connectionCounts.downstream}
      />
    </div>
  );
}
