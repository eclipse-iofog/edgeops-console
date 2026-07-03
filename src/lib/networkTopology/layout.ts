import { DEFAULT_NATS_HUB_ID, DEFAULT_ROUTER_ID } from "./constants";
import type {
  TopologyConnection,
  TopologyLayer,
  TopologyNodeBase,
} from "./types";

export type TopologyLayoutStrategy =
  | "swimlane"
  | "hierarchical"
  | "radial"
  | "force";

export const TOPOLOGY_LAYOUT_OPTIONS: {
  id: TopologyLayoutStrategy;
  label: string;
}[] = [
  { id: "swimlane", label: "Swimlane" },
  { id: "hierarchical", label: "Hierarchical" },
  { id: "radial", label: "Radial" },
  { id: "force", label: "Force" },
];

const LAYER_HUB_IDS: Record<TopologyLayer, string> = {
  router: DEFAULT_ROUTER_ID,
  nats: DEFAULT_NATS_HUB_ID,
};

const ROLE_TIER: Record<TopologyLayer, Record<string, number>> = {
  router: { default: 0, interior: 1, edge: 2 },
  nats: { hub: 0, server: 1, leaf: 2 },
};

const TIER_Y = [0, 280, 560];
const TIER_X_SPACING = 200;
/** Fallback column anchors when canvas is not measured (e.g. unit tests). */
export const SWIMLANE_COLUMN_X = [0, 420, 840] as const;
/** Width share per column: spoke/leaf, interior/server, hub/default (sums to 1). */
export const SWIMLANE_COLUMN_RATIOS: readonly [number, number, number] = [
  0.38, 0.24, 0.38,
];
const SWIMLANE_MARGIN_RATIO = 0.06;
const SWIMLANE_BASE_Y_SPACING = 120;
const SWIMLANE_MIN_Y_SPACING = 52;
const SWIMLANE_Y_FILL_RATIO = 0.72;
const SWIMLANE_MIN_WORLD_WIDTH = 840;
const SWIMLANE_MIN_WORLD_HEIGHT = 480;
const RING_RADIUS = [0, 220, 420];
const RING_SPREAD = Math.PI * 1.6;
const BARYCENTER_PASSES = 6;

function sortByDisplayName(nodes: TopologyNodeBase[]): TopologyNodeBase[] {
  return [...nodes].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function groupNodesByTier(
  nodes: TopologyNodeBase[],
  layer: TopologyLayer,
): Record<number, TopologyNodeBase[]> {
  const tiers: Record<number, TopologyNodeBase[]> = { 0: [], 1: [], 2: [] };
  for (const node of nodes) {
    const tier = ROLE_TIER[layer][node.role] ?? 2;
    tiers[tier].push(node);
  }
  return tiers;
}

function buildAdjacency(
  connections: TopologyConnection[],
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  const link = (a: string, b: string) => {
    const setA = adjacency.get(a) ?? new Set<string>();
    setA.add(b);
    adjacency.set(a, setA);
  };

  for (const connection of connections) {
    link(connection.source, connection.dest);
    link(connection.dest, connection.source);
  }

  return adjacency;
}

function barycenterOrder(
  nodeIds: string[],
  referenceOrder: string[],
  adjacency: Map<string, Set<string>>,
): string[] {
  const referenceIndex = new Map(
    referenceOrder.map((id, index) => [id, index]),
  );

  return [...nodeIds].sort((leftId, rightId) => {
    const leftScore = averageNeighborIndex(leftId, referenceIndex, adjacency);
    const rightScore = averageNeighborIndex(rightId, referenceIndex, adjacency);
    if (leftScore === rightScore) {
      return leftId.localeCompare(rightId);
    }
    return leftScore - rightScore;
  });
}

function averageNeighborIndex(
  nodeId: string,
  referenceIndex: Map<string, number>,
  adjacency: Map<string, Set<string>>,
): number {
  const neighbors = adjacency.get(nodeId);
  if (!neighbors) {
    return Number.POSITIVE_INFINITY;
  }

  let total = 0;
  let count = 0;
  for (const neighborId of neighbors) {
    const index = referenceIndex.get(neighborId);
    if (index !== undefined) {
      total += index;
      count += 1;
    }
  }

  return count > 0 ? total / count : Number.POSITIVE_INFINITY;
}

function assignTierPositions(
  tierOrder: Record<number, string[]>,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  for (const tierIndex of [0, 1, 2]) {
    const ids = tierOrder[tierIndex] ?? [];
    if (ids.length === 0) {
      continue;
    }

    const y = TIER_Y[tierIndex] ?? 560;
    const width = Math.max(ids.length - 1, 0) * TIER_X_SPACING;
    const startX = -width / 2;

    ids.forEach((id, index) => {
      positions.set(id, { x: startX + index * TIER_X_SPACING, y });
    });
  }

  return positions;
}

/** Top-down tier layout with barycenter ordering to reduce edge crossings. */
export function computeHierarchicalLayout(
  nodes: TopologyNodeBase[],
  layer: TopologyLayer,
  connections: TopologyConnection[] = [],
): Map<string, { x: number; y: number }> {
  const hubId = LAYER_HUB_IDS[layer];
  const tiers = groupNodesByTier(nodes, layer);
  const adjacency = buildAdjacency(connections);

  const tierOrder: Record<number, string[]> = {
    0: [],
    1: sortByDisplayName(tiers[1]).map((node) => node.id),
    2: sortByDisplayName(tiers[2]).map((node) => node.id),
  };

  const hubNode =
    tiers[0].find((node) => node.id === hubId) ??
    sortByDisplayName(tiers[0])[0];
  tierOrder[0] = hubNode ? [hubNode.id] : [];

  for (let pass = 0; pass < BARYCENTER_PASSES; pass += 1) {
    tierOrder[1] = barycenterOrder(tierOrder[1], tierOrder[2], adjacency);
    tierOrder[2] = barycenterOrder(tierOrder[2], tierOrder[1], adjacency);
  }

  return assignTierPositions(tierOrder);
}

function swimlaneColumn(node: TopologyNodeBase, layer: TopologyLayer): number {
  const hubId = LAYER_HUB_IDS[layer];
  if (node.id === hubId || node.role === "default" || node.role === "hub") {
    return 2;
  }
  if (node.id.startsWith("spoke-group-")) {
    return 0;
  }
  const midRole = layer === "router" ? "interior" : "server";
  const spokeRole = layer === "router" ? "edge" : "leaf";
  if (node.role === midRole) {
    return 1;
  }
  if (node.role === spokeRole) {
    return 0;
  }
  return 1;
}

export type SwimlaneMetrics = {
  columnX: readonly [number, number, number];
  ySpacing: number;
};

export type SwimlaneCanvas = {
  width: number;
  height: number;
  zoom: number;
};

export function getSwimlaneColumnCounts(
  nodes: TopologyNodeBase[],
  layer: TopologyLayer,
): [number, number, number] {
  const counts: [number, number, number] = [0, 0, 0];
  for (const node of nodes) {
    counts[swimlaneColumn(node, layer)] += 1;
  }
  return counts;
}

function columnCenterX(
  columnIndex: number,
  usableWidth: number,
  margin: number,
  ratios: readonly [number, number, number],
): number {
  let leading = 0;
  for (let index = 0; index < columnIndex; index += 1) {
    leading += ratios[index] ?? 0;
  }
  const ratio = ratios[columnIndex] ?? 0;
  return margin + usableWidth * (leading + ratio / 2);
}

function fallbackSwimlaneMetrics(): SwimlaneMetrics {
  return {
    columnX: SWIMLANE_COLUMN_X,
    ySpacing: SWIMLANE_BASE_Y_SPACING,
  };
}

/** Derive lane centers and row spacing from canvas size and zoom (used on Reset layout). */
export function computeSwimlaneMetrics(
  columnCounts: [number, number, number],
  canvas?: SwimlaneCanvas,
): SwimlaneMetrics {
  const maxCount = Math.max(...columnCounts, 1);

  if (!canvas || canvas.width <= 0 || canvas.height <= 0 || canvas.zoom <= 0) {
    return fallbackSwimlaneMetrics();
  }

  const worldWidth = Math.max(
    canvas.width / canvas.zoom,
    SWIMLANE_MIN_WORLD_WIDTH,
  );
  const worldHeight = Math.max(
    canvas.height / canvas.zoom,
    SWIMLANE_MIN_WORLD_HEIGHT,
  );
  const margin = worldWidth * SWIMLANE_MARGIN_RATIO;
  const usableWidth = worldWidth - margin * 2;
  const columnX: [number, number, number] = [
    columnCenterX(0, usableWidth, margin, SWIMLANE_COLUMN_RATIOS),
    columnCenterX(1, usableWidth, margin, SWIMLANE_COLUMN_RATIOS),
    columnCenterX(2, usableWidth, margin, SWIMLANE_COLUMN_RATIOS),
  ];
  const ySpacing = Math.max(
    SWIMLANE_MIN_Y_SPACING,
    Math.min(
      SWIMLANE_BASE_Y_SPACING,
      (worldHeight * SWIMLANE_Y_FILL_RATIO) / maxCount,
    ),
  );

  return { columnX, ySpacing };
}

/** Canvas-aware default: edge/leaf left, interior/server center, hub right. */
export function computeDefaultSwimlaneLayout(
  nodes: TopologyNodeBase[],
  connections: TopologyConnection[],
  layer: TopologyLayer,
  canvas: SwimlaneCanvas,
): Map<string, { x: number; y: number }> {
  const metrics = computeSwimlaneMetrics(
    getSwimlaneColumnCounts(nodes, layer),
    canvas,
  );
  return computeSwimlaneLayout(nodes, connections, layer, metrics);
}

/** Left-to-right swimlanes: Spoke → Mid-tier → Hub. */
export function computeSwimlaneLayout(
  nodes: TopologyNodeBase[],
  connections: TopologyConnection[],
  layer: TopologyLayer,
  metrics: SwimlaneMetrics = fallbackSwimlaneMetrics(),
): Map<string, { x: number; y: number }> {
  const adjacency = buildAdjacency(connections);
  const columns: Record<number, string[]> = { 0: [], 1: [], 2: [] };

  for (const node of nodes) {
    columns[swimlaneColumn(node, layer)].push(node.id);
  }

  for (const columnIndex of [0, 1, 2]) {
    columns[columnIndex] = barycenterOrder(
      columns[columnIndex],
      columns[columnIndex === 0 ? 1 : columnIndex - 1] ?? [],
      adjacency,
    );
    if (columns[columnIndex].length <= 1) {
      continue;
    }
    columns[columnIndex] = barycenterOrder(
      columns[columnIndex],
      columns[columnIndex === 2 ? 1 : columnIndex + 1] ?? [],
      adjacency,
    );
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const columnIndex of [0, 1, 2]) {
    const ids = columns[columnIndex];
    const x = metrics.columnX[columnIndex] ?? 0;
    const ySpacing = metrics.ySpacing;
    const height = Math.max(ids.length - 1, 0) * ySpacing;
    const startY = -height / 2;

    ids.forEach((id, index) => {
      positions.set(id, { x, y: startY + index * ySpacing });
    });
  }

  return positions;
}

export function computeRadialLayout(
  nodes: TopologyNodeBase[],
  layer: TopologyLayer,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const hubId = LAYER_HUB_IDS[layer];
  const tiers = groupNodesByTier(nodes, layer);

  for (const tierIndex of [0, 1, 2]) {
    const tierNodes = sortByDisplayName(tiers[tierIndex]);
    if (tierNodes.length === 0) {
      continue;
    }

    if (tierIndex === 0) {
      const hub = tierNodes.find((node) => node.id === hubId) ?? tierNodes[0];
      positions.set(hub.id, { x: 0, y: 0 });
      const others = tierNodes.filter((node) => node.id !== hub.id);
      others.forEach((node, index) => {
        const angle = (index / Math.max(others.length, 1)) * Math.PI * 2;
        positions.set(node.id, {
          x: Math.cos(angle) * 80,
          y: Math.sin(angle) * 80,
        });
      });
      continue;
    }

    const radius = RING_RADIUS[tierIndex] ?? 420;
    tierNodes.forEach((node, index) => {
      const angle =
        -RING_SPREAD / 2 +
        (index / Math.max(tierNodes.length, 1)) * RING_SPREAD;
      positions.set(node.id, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    });
  }

  return positions;
}

export function computeForceDirectedLayout(
  nodes: TopologyNodeBase[],
  connections: TopologyConnection[],
  layer: TopologyLayer,
  iterations = 60,
): Map<string, { x: number; y: number }> {
  const positions = computeHierarchicalLayout(nodes, layer, connections);
  const nodeIds = nodes.map((node) => node.id);
  const pos = new Map(
    nodeIds.map((id) => [id, { ...(positions.get(id) ?? { x: 0, y: 0 }) }]),
  );

  const repulsion = 12000;
  const attraction = 0.004;
  const idealLength = 180;

  for (let step = 0; step < iterations; step += 1) {
    const forces = new Map(nodeIds.map((id) => [id, { x: 0, y: 0 }]));

    for (let i = 0; i < nodeIds.length; i += 1) {
      for (let j = i + 1; j < nodeIds.length; j += 1) {
        const a = nodeIds[i];
        const b = nodeIds[j];
        const pa = pos.get(a)!;
        const pb = pos.get(b)!;
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces.get(a)!.x += fx;
        forces.get(a)!.y += fy;
        forces.get(b)!.x -= fx;
        forces.get(b)!.y -= fy;
      }
    }

    for (const connection of connections) {
      if (!pos.has(connection.source) || !pos.has(connection.dest)) {
        continue;
      }
      const pa = pos.get(connection.source)!;
      const pb = pos.get(connection.dest)!;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const delta = dist - idealLength;
      const fx = (dx / dist) * delta * attraction;
      const fy = (dy / dist) * delta * attraction;
      forces.get(connection.source)!.x += fx;
      forces.get(connection.source)!.y += fy;
      forces.get(connection.dest)!.x -= fx;
      forces.get(connection.dest)!.y -= fy;
    }

    const damping = 0.85 - (step / iterations) * 0.35;
    for (const id of nodeIds) {
      const p = pos.get(id)!;
      const f = forces.get(id)!;
      p.x += f.x * damping;
      p.y += f.y * damping;
    }
  }

  return pos;
}

export function computeLayout(
  strategy: TopologyLayoutStrategy,
  nodes: TopologyNodeBase[],
  connections: TopologyConnection[],
  layer: TopologyLayer,
): Map<string, { x: number; y: number }> {
  switch (strategy) {
    case "swimlane":
      return computeSwimlaneLayout(nodes, connections, layer);
    case "radial":
      return computeRadialLayout(nodes, layer);
    case "force":
      return computeForceDirectedLayout(nodes, connections, layer);
    case "hierarchical":
      return computeHierarchicalLayout(nodes, layer, connections);
    default:
      return computeSwimlaneLayout(nodes, connections, layer);
  }
}

export function getHubId(layer: TopologyLayer): string {
  return LAYER_HUB_IDS[layer];
}

export function getSpokeRole(layer: TopologyLayer): string {
  return layer === "router" ? "edge" : "leaf";
}

export function getMidRole(layer: TopologyLayer): string {
  return layer === "router" ? "interior" : "server";
}

/** When edges share a hub target, align bundle trunks vertically. */
export function getHubTrunkX(
  hubId: string,
  positions: Map<string, { x: number; y: number }>,
): number | null {
  const hubPosition = positions.get(hubId);
  return hubPosition?.x ?? null;
}
