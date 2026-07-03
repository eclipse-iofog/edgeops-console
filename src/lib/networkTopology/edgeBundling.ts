import { SWIMLANE_COLUMN_X } from "./layout";
import type { TopologyConnection } from "./types";

export type EdgeBundleMeta = {
  offset: number;
  useTrunk: boolean;
  trunkX: number | null;
  bundleCount: number;
};

function columnMidpoint(
  fromColumn: number,
  toColumn: number,
  positions?: Map<string, { x: number; y: number }>,
  group?: TopologyConnection[],
): number {
  if (positions && group && group.length > 0) {
    let sum = 0;
    let count = 0;
    for (const connection of group) {
      const sourceX = positions.get(connection.source)?.x;
      const destX = positions.get(connection.dest)?.x;
      if (sourceX !== undefined && destX !== undefined) {
        sum += (sourceX + destX) / 2;
        count += 1;
      }
    }
    if (count > 0) {
      return sum / count;
    }
  }

  const fromX = SWIMLANE_COLUMN_X[fromColumn] ?? 0;
  const toX = SWIMLANE_COLUMN_X[toColumn] ?? fromX;
  return (fromX + toX) / 2;
}

/** Assign bundle offsets and inter-column trunk routing for dense fan-out/fan-in. */
export function computeEdgeBundleMeta(
  connections: TopologyConnection[],
  hubId: string | null,
  hubTrunkX: number | null,
  nodeColumn: Map<string, number>,
  positions?: Map<string, { x: number; y: number }>,
): Map<number, EdgeBundleMeta> {
  const meta = new Map<number, EdgeBundleMeta>();
  const bySource = new Map<string, TopologyConnection[]>();
  const byDest = new Map<string, TopologyConnection[]>();
  const byColumnPair = new Map<string, TopologyConnection[]>();

  for (const connection of connections) {
    const sourceList = bySource.get(connection.source) ?? [];
    sourceList.push(connection);
    bySource.set(connection.source, sourceList);

    const destList = byDest.get(connection.dest) ?? [];
    destList.push(connection);
    byDest.set(connection.dest, destList);

    const sourceColumn = nodeColumn.get(connection.source);
    const destColumn = nodeColumn.get(connection.dest);
    if (sourceColumn !== undefined && destColumn !== undefined) {
      const pairKey = `${Math.min(sourceColumn, destColumn)}|${Math.max(sourceColumn, destColumn)}`;
      const pairList = byColumnPair.get(pairKey) ?? [];
      pairList.push(connection);
      byColumnPair.set(pairKey, pairList);
    }
  }

  const assignOffsets = (
    groups: Map<string, TopologyConnection[]>,
    sign: 1 | -1,
  ) => {
    for (const group of groups.values()) {
      if (group.length <= 1) {
        continue;
      }
      const sorted = [...group].sort((a, b) => a.id - b.id);
      const mid = (sorted.length - 1) / 2;
      sorted.forEach((connection, index) => {
        const existing = meta.get(connection.id) ?? {
          offset: 0,
          useTrunk: false,
          trunkX: null,
          bundleCount: group.length,
        };
        meta.set(connection.id, {
          ...existing,
          offset: existing.offset + sign * (index - mid) * 18,
          bundleCount: group.length,
        });
      });
    }
  };

  assignOffsets(bySource, 1);
  assignOffsets(byDest, -1);

  for (const [pairKey, group] of byColumnPair.entries()) {
    if (group.length <= 1) {
      continue;
    }
    const [left, right] = pairKey.split("|").map(Number);
    const trunkX = columnMidpoint(left, right, positions, group);
    for (const connection of group) {
      const existing = meta.get(connection.id) ?? {
        offset: 0,
        useTrunk: false,
        trunkX: null,
        bundleCount: group.length,
      };
      meta.set(connection.id, {
        ...existing,
        useTrunk: true,
        trunkX: trunkX + existing.offset * 0.08,
        bundleCount: group.length,
      });
    }
  }

  if (hubId && hubTrunkX !== null) {
    for (const connection of connections) {
      if (connection.dest !== hubId) {
        continue;
      }
      const existing = meta.get(connection.id) ?? {
        offset: 0,
        useTrunk: false,
        trunkX: null,
        bundleCount: 1,
      };
      meta.set(connection.id, {
        ...existing,
        useTrunk: true,
        trunkX: hubTrunkX + existing.offset * 0.1,
      });
    }
  }

  for (const connection of connections) {
    if (!meta.has(connection.id)) {
      meta.set(connection.id, {
        offset: 0,
        useTrunk: false,
        trunkX: null,
        bundleCount: 1,
      });
    }
  }

  return meta;
}

/** @deprecated Use computeEdgeBundleMeta */
export function computeEdgeBundleOffsets(
  connections: TopologyConnection[],
): Map<number, number> {
  const meta = computeEdgeBundleMeta(
    connections,
    null,
    null,
    new Map(),
  );
  return new Map(
    [...meta.entries()].map(([id, value]) => [id, value.offset]),
  );
}
