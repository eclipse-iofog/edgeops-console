import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  getSwimlaneColumnForNode,
  isSpokeGroupNodeId,
  snapToSwimlaneColumn,
  spokeGroupUpstreamOf,
} from "@/lib/networkTopology/autoGrouping";
import { computeEdgeBundleMeta } from "@/lib/networkTopology/edgeBundling";
import {
  buildNodeLookup,
  classifyEdge,
  getEdgeVisualStyle,
  isBidirectionalEdge,
} from "@/lib/networkTopology/edgeStyles";
import {
  computeLayout,
  getHubId,
  getHubTrunkX,
} from "@/lib/networkTopology/layout";
import {
  getNodesOnPathEdges,
  loadSavedPositions,
  loadSavedViewport,
  mergeLayoutPositions,
  savePositions,
  saveViewport,
} from "@/lib/networkTopology/layoutPositions";
import { getSemanticZoomLevel } from "@/lib/networkTopology/semanticZoom";
import type {
  TopologyConnection,
  TopologyLayer,
  TopologyNodeBase,
} from "@/lib/networkTopology/types";

import TopologyBundledEdge from "./TopologyBundledEdge";
import TopologySpokeGroupNode from "./TopologySpokeGroupNode";
import TopologyMeshNode, {
  type TopologyFlowNodeData,
} from "./TopologyMeshNode";

const LAYOUT_STRATEGY = "swimlane" as const;

const nodeTypes = {
  topologyNode: TopologyMeshNode,
  topologySpokeGroup: TopologySpokeGroupNode,
};

const edgeTypes = {
  topology: TopologyBundledEdge,
};

export type GraphFocusRequest = {
  nodeIds: string[];
  token: number;
};

type TopologyGraphProps = {
  layer: TopologyLayer;
  nodes: TopologyNodeBase[];
  connections: TopologyConnection[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  highlightedEdgeIds: Set<number>;
  pathTraceEdgeIds: Set<number>;
  neighborNodeIds: Set<string>;
  searchMatchNodeIds: Set<string>;
  focusRequest: GraphFocusRequest | null;
  expandedSpokeGroups: Set<string>;
  expandingSpokeGroup: string | null;
  agentStatusByUuid: Record<string, string | undefined>;
  onNodeClick: (node: TopologyNodeBase) => void;
  onSpokeGroupClick: (upstreamOf: string) => void;
  onNodeHover: (nodeId: string | null) => void;
  onPaneClick: () => void;
  allNodes: TopologyNodeBase[];
};

function positionsStorageKey(layer: TopologyLayer): string {
  return `mesh-graph-positions-${layer}`;
}

function viewportStorageKey(layer: TopologyLayer): string {
  return `mesh-graph-viewport-${layer}`;
}

function buildNodeColumnMap(
  nodes: TopologyNodeBase[],
  layer: TopologyLayer,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const node of nodes) {
    map.set(node.id, getSwimlaneColumnForNode(node, layer));
  }
  return map;
}

function buildFlowGraph(input: {
  layer: TopologyLayer;
  nodes: TopologyNodeBase[];
  connections: TopologyConnection[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  highlightedEdgeIds: Set<number>;
  pathTraceEdgeIds: Set<number>;
  neighborNodeIds: Set<string>;
  searchMatchNodeIds: Set<string>;
  mergedPositions: Record<string, { x: number; y: number }>;
  livePositions?: Map<string, { x: number; y: number }>;
  nodeLookup: Map<string, TopologyNodeBase>;
  zoomLevel: ReturnType<typeof getSemanticZoomLevel>;
  expandedSpokeGroups: Set<string>;
  expandingSpokeGroup: string | null;
  agentStatusByUuid: Record<string, string | undefined>;
}): { flowNodes: Node[]; flowEdges: Edge[] } {
  const {
    layer,
    nodes,
    connections,
    selectedNodeId,
    hoveredNodeId,
    highlightedEdgeIds,
    pathTraceEdgeIds,
    neighborNodeIds,
    searchMatchNodeIds,
    mergedPositions,
    livePositions,
    nodeLookup,
    zoomLevel,
    expandedSpokeGroups,
    expandingSpokeGroup,
    agentStatusByUuid,
  } = input;

  const activeFocusId = selectedNodeId ?? hoveredNodeId;
  const pathNodeIds = getNodesOnPathEdges(pathTraceEdgeIds, connections);
  const hasSearch = searchMatchNodeIds.size > 0;
  const hasFocus = Boolean(activeFocusId) || hasSearch;

  const searchNeighborIds = new Set<string>();
  if (hasSearch) {
    for (const matchId of searchMatchNodeIds) {
      for (const connection of connections) {
        if (connection.source === matchId) {
          searchNeighborIds.add(connection.dest);
        }
        if (connection.dest === matchId) {
          searchNeighborIds.add(connection.source);
        }
      }
    }
  }

  const computedLayout = computeLayout(
    LAYOUT_STRATEGY,
    nodes,
    connections,
    layer,
  );
  const hubId = getHubId(layer);
  const hubTrunkX = getHubTrunkX(hubId, computedLayout);
  const nodeColumn = buildNodeColumnMap(nodes, layer);
  const bundleMeta = computeEdgeBundleMeta(
    connections,
    hubId,
    hubTrunkX,
    nodeColumn,
  );

  const flowNodes: Node[] = nodes.map((node) => {
    const rawPosition =
      livePositions?.get(node.id) ??
      mergedPositions[node.id] ??
      computedLayout.get(node.id) ?? { x: 0, y: 0 };
    const position = snapToSwimlaneColumn(node, layer, rawPosition);
    const isSelected = node.id === selectedNodeId;
    const isHovered = node.id === hoveredNodeId;
    const isNeighbor = neighborNodeIds.has(node.id);
    const isOnPath = pathNodeIds.has(node.id);
    const searchMatch = searchMatchNodeIds.has(node.id);
    const isSearchNeighbor = searchNeighborIds.has(node.id);
    const dimmed =
      hasFocus &&
      !isSelected &&
      !isHovered &&
      !isNeighbor &&
      !isOnPath &&
      !searchMatch &&
      !isSearchNeighbor;

    if (isSpokeGroupNodeId(node.id)) {
      const upstreamOf = spokeGroupUpstreamOf(node.id) ?? "";
      const countMatch = node.displayName.match(/^(\d+)/);
      return {
        id: node.id,
        type: "topologySpokeGroup",
        position,
        data: {
          label: node.displayName,
          upstreamOf,
          memberCount: countMatch ? Number(countMatch[1]) : 0,
          role: node.role,
          expanded: expandedSpokeGroups.has(upstreamOf),
          expanding: expandingSpokeGroup === upstreamOf,
          selected: isSelected,
          dimmed,
          highlighted: isNeighbor || isHovered || searchMatch,
        },
        draggable: true,
      };
    }

    return {
      id: node.id,
      type: "topologyNode",
      position,
      data: {
        node,
        layer,
        selected: isSelected,
        dimmed,
        highlighted: isNeighbor || isOnPath || isSearchNeighbor,
        hovered: isHovered,
        searchMatch,
        zoomLevel,
        agentStatus: node.iofogUuid
          ? agentStatusByUuid[node.iofogUuid] ?? null
          : null,
      } satisfies TopologyFlowNodeData,
      draggable: true,
    };
  });

  const nodeIds = new Set(flowNodes.map((node) => node.id));
  const flowEdges: Edge[] = connections
    .filter(
      (connection) =>
        nodeIds.has(connection.source) && nodeIds.has(connection.dest),
    )
    .map((connection) => {
    const highlighted =
      highlightedEdgeIds.has(connection.id) ||
      pathTraceEdgeIds.has(connection.id);
    const pathTraced = pathTraceEdgeIds.has(connection.id);
    const dimmed = hasFocus && !highlighted;
    const edgeKind = classifyEdge(connection, nodeLookup, layer);
    const visual = getEdgeVisualStyle(edgeKind, highlighted, dimmed);
    const bundle = bundleMeta.get(connection.id) ?? {
      offset: 0,
      useTrunk: false,
      trunkX: null,
      bundleCount: 1,
    };
    const arrowMarker = {
      type: "arrowclosed" as const,
      color: visual.markerColor,
      width: 16,
      height: 16,
    };

    return {
      id: String(connection.id),
      source: connection.source,
      target: connection.dest,
      type: "topology",
      animated: pathTraced,
      data: {
        bundleOffset: bundle.offset,
        useTrunk: bundle.useTrunk,
        trunkX: bundle.trunkX,
        pathTraced,
        flowActive: pathTraced || (highlighted && hasFocus),
      },
      style: {
        stroke: visual.stroke,
        strokeWidth: pathTraced ? 3 : visual.strokeWidth,
        opacity: dimmed ? 0.1 : highlighted ? 1 : 0.5,
      },
      markerEnd: arrowMarker,
      ...(isBidirectionalEdge(edgeKind)
        ? { markerStart: arrowMarker }
        : {}),
    };
  });

  return { flowNodes, flowEdges };
}

function ZoomWatcher({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) {
  const zoom = useStore((state) => state.transform[2]);
  useEffect(() => {
    onZoomChange(zoom);
  }, [zoom, onZoomChange]);
  return null;
}

function TopologyGraphInner({
  layer,
  nodes,
  connections,
  selectedNodeId,
  hoveredNodeId,
  highlightedEdgeIds,
  pathTraceEdgeIds,
  neighborNodeIds,
  searchMatchNodeIds,
  focusRequest,
  expandedSpokeGroups,
  expandingSpokeGroup,
  agentStatusByUuid,
  onNodeClick,
  onSpokeGroupClick,
  onNodeHover,
  onPaneClick,
  allNodes,
}: TopologyGraphProps) {
  const { fitView, setCenter, setViewport, getViewport } = useReactFlow();
  const nodeLookup = useMemo(() => buildNodeLookup(allNodes), [allNodes]);
  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const positionsKey = positionsStorageKey(layer);
  const viewportKey = viewportStorageKey(layer);
  const savedPositionsRef = useRef(loadSavedPositions(positionsKey));
  const viewportRestoredRef = useRef(false);
  const initialFitDoneRef = useRef(false);
  const lastFocusTokenRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const pendingGraphSyncRef = useRef(false);
  const flowNodesRef = useRef<Node[]>([]);
  const [zoom, setZoom] = useState(1);
  const zoomLevel = getSemanticZoomLevel(zoom);

  const mergedPositions = useMemo(() => {
    const computed = computeLayout(LAYOUT_STRATEGY, nodes, connections, layer);
    const merged = mergeLayoutPositions(
      nodes.map((node) => node.id),
      savedPositionsRef.current,
      computed,
    );
    const snapped: Record<string, { x: number; y: number }> = {};
    for (const node of nodes) {
      const position = merged[node.id] ?? computed.get(node.id) ?? { x: 0, y: 0 };
      snapped[node.id] = snapToSwimlaneColumn(node, layer, position);
    }
    return snapped;
  }, [nodes, connections, layer]);

  const graphInput = useMemo(
    () => ({
      layer,
      nodes,
      connections,
      selectedNodeId,
      hoveredNodeId,
      highlightedEdgeIds,
      pathTraceEdgeIds,
      neighborNodeIds,
      searchMatchNodeIds,
      mergedPositions,
      nodeLookup,
      zoomLevel,
      expandedSpokeGroups,
      expandingSpokeGroup,
      agentStatusByUuid,
    }),
    [
      layer,
      nodes,
      connections,
      selectedNodeId,
      hoveredNodeId,
      highlightedEdgeIds,
      pathTraceEdgeIds,
      neighborNodeIds,
      searchMatchNodeIds,
      mergedPositions,
      nodeLookup,
      zoomLevel,
      expandedSpokeGroups,
      expandingSpokeGroup,
      agentStatusByUuid,
    ],
  );

  const initialGraph = useMemo(
    () => buildFlowGraph(graphInput),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layer, nodes, connections],
  );

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialGraph.flowNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialGraph.flowEdges);

  flowNodesRef.current = flowNodes;

  const applyGraphSync = useCallback(() => {
    const livePositions = new Map(
      flowNodesRef.current.map((node) => [node.id, node.position]),
    );
    const graph = buildFlowGraph({ ...graphInput, livePositions });
    setFlowNodes((current) => {
      const currentById = new Map(current.map((node) => [node.id, node]));
      return graph.flowNodes.map((nextNode) => {
        const existing = currentById.get(nextNode.id);
        if (!existing) {
          return nextNode;
        }
        return {
          ...nextNode,
          position: existing.position,
          dragging: existing.dragging,
        };
      });
    });
    setFlowEdges(graph.flowEdges);
  }, [graphInput, setFlowNodes, setFlowEdges]);

  useEffect(() => {
    if (isDraggingRef.current) {
      pendingGraphSyncRef.current = true;
      return;
    }
    pendingGraphSyncRef.current = false;
    applyGraphSync();
  }, [applyGraphSync]);

  useEffect(() => {
    if (viewportRestoredRef.current || nodes.length === 0) {
      return;
    }

    const savedViewport = loadSavedViewport(viewportKey);
    if (savedViewport) {
      viewportRestoredRef.current = true;
      initialFitDoneRef.current = true;
      window.requestAnimationFrame(() => {
        void setViewport(savedViewport, { duration: 0 });
      });
      return;
    }

    if (!initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      window.requestAnimationFrame(() => {
        void fitView({ padding: 0.2, duration: 300 });
      });
    }
  }, [nodes.length, viewportKey, setViewport, fitView]);

  useEffect(() => {
    if (!focusRequest || focusRequest.token === lastFocusTokenRef.current) {
      return;
    }
    lastFocusTokenRef.current = focusRequest.token;

    const targets = flowNodes.filter((node) =>
      focusRequest.nodeIds.includes(node.id),
    );
    if (targets.length === 0) {
      return;
    }

    if (targets.length === 1) {
      const target = targets[0];
      void setCenter(target.position.x + 80, target.position.y + 40, {
        zoom: Math.max(getViewport().zoom, 0.85),
        duration: 400,
      });
      return;
    }

    void fitView({
      nodes: targets.map((node) => ({ id: node.id })),
      padding: 0.35,
      duration: 400,
    });
  }, [focusRequest, flowNodes, setCenter, fitView, getViewport]);

  const persistViewport = useCallback(() => {
    const viewport = getViewport();
    saveViewport(viewportKey, viewport);
  }, [getViewport, viewportKey]);

  const handleMoveEnd = useCallback(() => {
    persistViewport();
  }, [persistViewport]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, flowNode) => {
      if (flowNode.type === "topologySpokeGroup") {
        const upstreamOf = spokeGroupUpstreamOf(flowNode.id);
        if (upstreamOf) {
          onSpokeGroupClick(upstreamOf);
        }
        return;
      }
      const data = flowNode.data as TopologyFlowNodeData;
      onNodeClick(data.node);
    },
    [onNodeClick, onSpokeGroupClick],
  );

  const handleNodeMouseEnter: NodeMouseHandler = useCallback(
    (_event, flowNode) => {
      if (isDraggingRef.current) {
        return;
      }
      onNodeHover(flowNode.id);
    },
    [onNodeHover],
  );

  const handleNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    if (isDraggingRef.current) {
      return;
    }
    onNodeHover(null);
  }, [onNodeHover]);

  const handleNodeDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, flowNode: Node) => {
      isDraggingRef.current = false;

      const topologyNode = nodesById.get(flowNode.id);
      const snapped = topologyNode
        ? snapToSwimlaneColumn(topologyNode, layer, flowNode.position)
        : flowNode.position;

      if (snapped.x !== flowNode.position.x) {
        setFlowNodes((current) =>
          current.map((node) =>
            node.id === flowNode.id ? { ...node, position: snapped } : node,
          ),
        );
      }

      savedPositionsRef.current[flowNode.id] = snapped;
      savedPositionsRef.current = mergeLayoutPositions(
        nodes.map((node) => node.id),
        savedPositionsRef.current,
        new Map(),
      );
      savePositions(positionsKey, savedPositionsRef.current);

      if (pendingGraphSyncRef.current) {
        pendingGraphSyncRef.current = false;
        applyGraphSync();
      }
    },
    [nodesById, layer, nodes, positionsKey, applyGraphSync, setFlowNodes],
  );

  const handleResetLayout = useCallback(() => {
    savedPositionsRef.current = {};
    sessionStorage.removeItem(positionsKey);
    sessionStorage.removeItem(viewportKey);
    viewportRestoredRef.current = false;
    initialFitDoneRef.current = false;

    const computed = computeLayout(LAYOUT_STRATEGY, nodes, connections, layer);
    const graph = buildFlowGraph({
      ...graphInput,
      mergedPositions: Object.fromEntries(computed.entries()),
    });
    setFlowNodes(graph.flowNodes);
    window.requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 300 });
    });
  }, [
    positionsKey,
    viewportKey,
    nodes,
    connections,
    layer,
    graphInput,
    setFlowNodes,
    fitView,
  ]);

  return (
    <div className="relative h-full w-full min-h-0">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onPaneClick={onPaneClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onMoveEnd={handleMoveEnd}
        minZoom={0.05}
        maxZoom={2}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
        className="bg-gray-950/40"
      >
        <ZoomWatcher onZoomChange={setZoom} />
        <Background gap={20} size={1} color="#334155" />
        <Controls
          showInteractive={false}
          className="!bg-gray-900/90 !border-gray-700 !shadow-lg [&>button]:!border-gray-700 [&>button]:!bg-gray-800 [&>button]:!text-white [&>button:hover]:!bg-gray-700"
        />
        <MiniMap
          className="!bg-gray-900/80 !border-gray-700"
          nodeColor={(node) => {
            if (node.type === "topologySpokeGroup") {
              return "#10b981";
            }
            const data = node.data as TopologyFlowNodeData;
            return data?.node?.role === "default" || data?.node?.role === "hub"
              ? "#06b6d4"
              : "#64748b";
          }}
          maskColor="rgba(15, 23, 42, 0.75)"
        />
      </ReactFlow>

      <div className="absolute bottom-4 left-36 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={handleResetLayout}
          className="rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-1.5 text-xs text-gray-200 shadow-lg hover:bg-gray-800"
        >
          Reset layout
        </button>
        <span className="rounded-lg border border-gray-700/60 bg-gray-900/70 px-2 py-1 text-[10px] uppercase tracking-wide text-gray-400">
          Swimlane · {zoomLevel}
        </span>
      </div>
    </div>
  );
}

export default function TopologyGraph(props: TopologyGraphProps) {
  return (
    <ReactFlowProvider>
      <TopologyGraphInner {...props} />
    </ReactFlowProvider>
  );
}
