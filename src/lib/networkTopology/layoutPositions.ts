export type SavedViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type NodePosition = {
  x: number;
  y: number;
};

export function mergeLayoutPositions(
  nodeIds: string[],
  saved: Record<string, NodePosition>,
  computed: Map<string, NodePosition>,
): Record<string, NodePosition> {
  const activeIds = new Set(nodeIds);
  const merged: Record<string, NodePosition> = {};

  for (const id of nodeIds) {
    if (saved[id]) {
      merged[id] = saved[id];
    } else if (computed.has(id)) {
      merged[id] = computed.get(id)!;
    }
  }

  for (const id of Object.keys(saved)) {
    if (activeIds.has(id) && !merged[id]) {
      merged[id] = saved[id];
    }
  }

  return merged;
}

export function loadSavedPositions(key: string): Record<string, NodePosition> {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, NodePosition>) : {};
  } catch {
    return {};
  }
}

export function savePositions(
  key: string,
  positions: Record<string, NodePosition>,
): void {
  sessionStorage.setItem(key, JSON.stringify(positions));
}

export function loadSavedViewport(key: string): SavedViewport | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SavedViewport) : null;
  } catch {
    return null;
  }
}

export function saveViewport(key: string, viewport: SavedViewport): void {
  sessionStorage.setItem(key, JSON.stringify(viewport));
}

export function getNodesOnPathEdges(
  pathEdgeIds: Set<number>,
  connections: { source: string; dest: string; id: number }[],
): Set<string> {
  const nodes = new Set<string>();
  for (const connection of connections) {
    if (pathEdgeIds.has(connection.id)) {
      nodes.add(connection.source);
      nodes.add(connection.dest);
    }
  }
  return nodes;
}
