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
  isSpokeGroupNodeId,
  spokeGroupUpstreamOf,
} from "@/lib/networkTopology/autoGrouping";
import { NATS_CLUSTER_NODE_ID } from "@/lib/networkTopology/constants";
import { computeEdgeBundleMeta } from "@/lib/networkTopology/edgeBundling";
import {
  buildNodeLookup,
  classifyEdge,
  getEdgeVisualStyle,
  isBidirectionalEdge,
} from "@/lib/networkTopology/edgeStyles";
import {
  computeHierarchicalLayout,
  computeNatsVerticalLayout,
  getHubId,
  getHubTrunkX,
  type SwimlaneCanvas,
} from "@/lib/networkTopology/layout";
import { isNatsClusterMember } from "@/lib/networkTopology/natsClusterEdges";
import {
  getNodesOnPathEdges,
  mergeLayoutPositions,
} from "@/lib/networkTopology/layoutPositions";
import { getSemanticZoomLevel } from "@/lib/networkTopology/semanticZoom";
import type {
  TopologyConnection,
  TopologyLayer,
  TopologyNodeBase,
} from "@/lib/networkTopology/types";

import TopologyBundledEdge from "./TopologyBundledEdge";
import TopologyClusterEdge from "./TopologyClusterEdge";
import TopologyClusterNode from "./TopologyClusterNode";
import TopologySpokeGroupNode from "./TopologySpokeGroupNode";
import TopologyMeshNode, {
  type TopologyFlowNodeData,
} from "./TopologyMeshNode";

const CLUSTER_NODE_WIDTH = 200;
const CLUSTER_NODE_HEIGHT = 120;
const CLUSTER_PAD_X = 36;
const CLUSTER_PAD_TOP = 36;
const CLUSTER_PAD_BOTTOM = 28;

const nodeTypes = {
  topologyNode: TopologyMeshNode,
  topologySpokeGroup: TopologySpokeGroupNode,
  topologyCluster: TopologyClusterNode,
};

const edgeTypes = {
  topology: TopologyBundledEdge,
  cluster: TopologyClusterEdge,
};

function computeLayerLayout(
  nodes: TopologyNodeBase[],
  connections: TopologyConnection[],
  layer: TopologyLayer,
) {
  if (layer === "nats") {
    return computeNatsVerticalLayout(nodes, connections);
  }
  return computeHierarchicalLayout(nodes, layer, connections);
}

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

function readSwimlaneCanvas(
  container: HTMLDivElement | null,
  zoom: number,
): SwimlaneCanvas | null {
  if (!container || zoom <= 0) {
    return null;
  }
  const rect = container.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return { width: rect.width, height: rect.height, zoom };
}

function resolveNodePositions(input: {
  nodes: TopologyNodeBase[];
  mergedPositions: Record<string, { x: number; y: number }>;
  livePositions?: Map<string, { x: number; y: number }>;
  fallbackLayout: Map<string, { x: number; y: number }>;
}): Map<string, { x: number; y: number }> {
  const { nodes, mergedPositions, livePositions, fallbackLayout } = input;
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    const position =
      livePositions?.get(node.id) ??
      mergedPositions[node.id] ??
      fallbackLayout.get(node.id) ?? { x: 0, y: 0 };
    positions.set(node.id, position);
  }
  return positions;
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
  const pathReachesCluster =
    layer === "nats" &&
    connections.some(
      (connection) =>
        pathTraceEdgeIds.has(connection.id) &&
        (connection.source === NATS_CLUSTER_NODE_ID ||
          connection.dest === NATS_CLUSTER_NODE_ID),
    );

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

  const computedLayout = computeLayerLayout(nodes, connections, layer);
  const nodePositions = resolveNodePositions({
    nodes,
    mergedPositions,
    livePositions,
    fallbackLayout: computedLayout,
  });
  const hubId = getHubId(layer);
  const hubTrunkX = getHubTrunkX(hubId, nodePositions);
  const bundleMeta = computeEdgeBundleMeta(
    connections,
    hubId,
    hubTrunkX,
    new Map(),
    nodePositions,
  );
  const classifyLookup = new Map(nodeLookup);
  for (const node of nodes) {
    if (!classifyLookup.has(node.id)) {
      classifyLookup.set(node.id, node);
    }
  }

  const flowNodes: Node[] = nodes.map((node) => {
    const position = nodePositions.get(node.id) ?? { x: 0, y: 0 };
    const isSelected = node.id === selectedNodeId;
    const isHovered = node.id === hoveredNodeId;
    const isNeighbor = neighborNodeIds.has(node.id);
    const isOnPath = pathNodeIds.has(node.id);
    const searchMatch = searchMatchNodeIds.has(node.id);
    const isSearchNeighbor = searchNeighborIds.has(node.id);
    const inLitCluster =
      pathReachesCluster && (node.role === "hub" || node.role === "server");
    const dimmed =
      hasFocus &&
      !inLitCluster &&
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
      zIndex: 1,
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

  if (layer === "nats") {
    const members = nodes.filter(isNatsClusterMember);
    if (members.length > 0) {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let anyVisible = false;
      for (const member of members) {
        const position = nodePositions.get(member.id) ?? { x: 0, y: 0 };
        minX = Math.min(minX, position.x);
        minY = Math.min(minY, position.y);
        maxX = Math.max(maxX, position.x + CLUSTER_NODE_WIDTH);
        maxY = Math.max(maxY, position.y + CLUSTER_NODE_HEIGHT);
        const memberNode = flowNodes.find((flowNode) => flowNode.id === member.id);
        const memberData = memberNode?.data as TopologyFlowNodeData | undefined;
        if (memberData && !memberData.dimmed) {
          anyVisible = true;
        }
      }
      const jsDomain =
        members.find((member) => member.jsDomain)?.jsDomain ?? null;
      flowNodes.unshift({
        id: NATS_CLUSTER_NODE_ID,
        type: "topologyCluster",
        position: {
          x: minX - CLUSTER_PAD_X,
          y: minY - CLUSTER_PAD_TOP,
        },
        style: {
          width: maxX - minX + CLUSTER_PAD_X * 2,
          height: maxY - minY + CLUSTER_PAD_TOP + CLUSTER_PAD_BOTTOM,
          pointerEvents: "none",
        },
        data: {
          jsDomain,
          dimmed: !anyVisible && hasFocus,
        },
        draggable: false,
        selectable: false,
        zIndex: 0,
      });
    }
  }

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
    const edgeKind = classifyEdge(connection, classifyLookup, layer);
    const clusterRoute = edgeKind === "nats-cluster";
    const dimmed =
      hasFocus && !highlighted && !(pathReachesCluster && clusterRoute);
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
      type: clusterRoute ? "cluster" : "topology",
      animated: pathTraced && !clusterRoute,
      zIndex: clusterRoute ? 0 : 1,
      data: {
        bundleOffset: bundle.offset,
        useTrunk: bundle.useTrunk && !clusterRoute,
        trunkX: bundle.trunkX,
        pathTraced,
        flowActive: pathTraced || (highlighted && hasFocus),
      },
      style: {
        stroke: visual.stroke,
        strokeWidth: pathTraced ? 3 : visual.strokeWidth,
        opacity: dimmed ? 0.1 : highlighted ? 1 : clusterRoute ? 0.85 : 0.5,
      },
      ...(layer === "nats"
        ? {}
        : {
            markerEnd: arrowMarker,
            ...(isBidirectionalEdge(edgeKind) ? { markerStart: arrowMarker } : {}),
          }),
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
  const { fitView, setCenter, getViewport } = useReactFlow();
  const nodeLookup = useMemo(() => buildNodeLookup(allNodes), [allNodes]);
  const savedPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const lastFocusTokenRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const pendingGraphSyncRef = useRef(false);
  const flowNodesRef = useRef<Node[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialLayoutDoneRef = useRef(false);
  const [containerReady, setContainerReady] = useState(false);
  const [positionsSeed, setPositionsSeed] = useState(0);
  const [zoom, setZoom] = useState(1);
  const zoomLevel = getSemanticZoomLevel(zoom);

  useEffect(() => {
    savedPositionsRef.current = {};
    initialLayoutDoneRef.current = false;
    setPositionsSeed((value) => value + 1);
  }, [layer]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateReady = () => {
      const rect = element.getBoundingClientRect();
      setContainerReady(rect.width > 0 && rect.height > 0);
    };

    updateReady();
    const observer = new ResizeObserver(updateReady);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const mergedPositions = useMemo(() => {
    const computed = computeLayerLayout(nodes, connections, layer);
    return mergeLayoutPositions(
      nodes.map((node) => node.id),
      savedPositionsRef.current,
      computed,
    );
  }, [nodes, connections, layer, positionsSeed]);

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
        if (!existing || nextNode.id === NATS_CLUSTER_NODE_ID) {
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

  const applyDefaultLayout = useCallback(
    (options?: { fitView?: boolean }) => {
      const canvas = readSwimlaneCanvas(
        containerRef.current,
        getViewport().zoom,
      );
      if (!canvas) {
        return false;
      }

      const computed = computeLayerLayout(nodes, connections, layer);
      const positions = Object.fromEntries(computed.entries());
      savedPositionsRef.current = positions;

      initialLayoutDoneRef.current = true;
      setPositionsSeed((value) => value + 1);

      const graph = buildFlowGraph({
        ...graphInput,
        mergedPositions: positions,
      });
      setFlowNodes(graph.flowNodes);
      setFlowEdges(graph.flowEdges);

      if (options?.fitView) {
        window.requestAnimationFrame(() => {
          void fitView({ padding: 0.2, duration: 300 });
        });
      }

      return true;
    },
    [
      nodes,
      connections,
      layer,
      graphInput,
      getViewport,
      setFlowNodes,
      setFlowEdges,
      fitView,
    ],
  );

  useEffect(() => {
    if (initialLayoutDoneRef.current || nodes.length === 0 || !containerReady) {
      return;
    }

    applyDefaultLayout({ fitView: true });
  }, [nodes.length, containerReady, layer, applyDefaultLayout]);

  useEffect(() => {
    if (isDraggingRef.current) {
      pendingGraphSyncRef.current = true;
      return;
    }
    pendingGraphSyncRef.current = false;
    applyGraphSync();
  }, [applyGraphSync]);

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

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, flowNode) => {
      if (flowNode.type === "topologyCluster") {
        return;
      }
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
      if (isDraggingRef.current || flowNode.type === "topologyCluster") {
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

      savedPositionsRef.current[flowNode.id] = flowNode.position;
      savedPositionsRef.current = mergeLayoutPositions(
        nodes.map((node) => node.id),
        savedPositionsRef.current,
        new Map(),
      );
      flowNodesRef.current = flowNodesRef.current.map((node) =>
        node.id === flowNode.id
          ? { ...node, position: flowNode.position }
          : node,
      );
      pendingGraphSyncRef.current = false;
      applyGraphSync();
    },
    [nodes, applyGraphSync],
  );

  const handleResetLayout = useCallback(() => {
    applyDefaultLayout({ fitView: true });
  }, [applyDefaultLayout]);

  return (
    <div ref={containerRef} className="relative h-full w-full min-h-0">
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
            if (node.type === "topologyCluster") {
              return "#7c3aed";
            }
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
          Free drag · {zoomLevel}
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
