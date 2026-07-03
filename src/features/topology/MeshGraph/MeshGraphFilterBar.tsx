import React from "react";
import { Crosshair, RotateCcw, X } from "lucide-react";

import {
  NATS_ROLE_OPTIONS,
  ROUTER_ROLE_OPTIONS,
} from "@/lib/networkTopology/constants";
import {
  EDGE_PALETTE,
  NATS_EDGE_LEGEND,
  ROUTER_EDGE_LEGEND,
} from "@/lib/networkTopology/edgeStyles";
import {
  EMPTY_MESH_FILTERS,
  hasActiveFilters,
  type MeshGraphFilters,
} from "@/lib/networkTopology/filters";
import type { TopologyLayer } from "@/lib/networkTopology/types";

import FogNameFilterInput from "./FogNameFilterInput";

type MeshGraphFilterBarProps = {
  layer: TopologyLayer;
  filters: MeshGraphFilters;
  onChange: (filters: MeshGraphFilters) => void;
  visibleCount: number;
  totalCount: number;
  visibleConnectionCount: number;
  degradedCount: number;
  roleStats: Record<string, number>;
  isFocused: boolean;
  onResetView: () => void;
  onSearchFocus: () => void;
  canSearchFocus: boolean;
};

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function chipClass(active: boolean): string {
  return [
    "rounded-full border px-2.5 py-1 text-xs transition-colors",
    active
      ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
      : "border-gray-600 bg-gray-800/80 text-gray-300 hover:bg-gray-700/80",
  ].join(" ");
}

function EdgeLegend({ layer }: { layer: TopologyLayer }) {
  const kinds = layer === "router" ? ROUTER_EDGE_LEGEND : NATS_EDGE_LEGEND;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Links
      </span>
      {kinds.map((kind) => (
        <span
          key={kind}
          className="inline-flex items-center gap-1.5 text-xs text-gray-300"
        >
          <span
            className="inline-block h-0.5 w-5 rounded-full"
            style={{ backgroundColor: EDGE_PALETTE[kind].normal }}
          />
          {EDGE_PALETTE[kind].label}
        </span>
      ))}
    </div>
  );
}

export default function MeshGraphFilterBar({
  layer,
  filters,
  onChange,
  visibleCount,
  totalCount,
  visibleConnectionCount,
  degradedCount,
  roleStats,
  isFocused,
  onResetView,
  onSearchFocus,
  canSearchFocus,
}: MeshGraphFilterBarProps) {
  const roleOptions =
    layer === "router" ? ROUTER_ROLE_OPTIONS : NATS_ROLE_OPTIONS;

  return (
    <div className="flex flex-col gap-3 border-b border-gray-700/50 bg-gray-900/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
        <span className="font-medium uppercase tracking-wide text-gray-400">
          Ops
        </span>
        {Object.entries(roleStats).map(([role, count]) => (
          <span key={role}>
            {role}: {count}
          </span>
        ))}
        {degradedCount > 0 ? (
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-200">
            {degradedCount} degraded
          </span>
        ) : (
          <span className="text-gray-500">All agents running</span>
        )}
        {isFocused ? (
          <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-cyan-100">
            Neighborhood focus
          </span>
        ) : (
          <span className="text-gray-500">Survey mode · select a node to focus</span>
        )}
      </div>

      <EdgeLegend layer={layer} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Role
        </span>
        {roleOptions.map((role) => (
          <button
            key={role}
            type="button"
            className={chipClass(filters.roles.includes(role))}
            onClick={() =>
              onChange({
                ...filters,
                roles: toggleValue(filters.roles, role),
              })
            }
          >
            {role}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FogNameFilterInput
          fogNames={filters.fogNames}
          onChange={(fogNames) => onChange({ ...filters, fogNames })}
        />
        {canSearchFocus ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-700/60 bg-cyan-900/30 px-2.5 py-1.5 text-xs text-cyan-100 hover:bg-cyan-900/50"
            onClick={onSearchFocus}
            title="Focus graph on the first matching node"
          >
            <Crosshair size={12} />
            Focus
          </button>
        ) : null}
        {isFocused || hasActiveFilters(filters) ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-600 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
            onClick={() => {
              onResetView();
              onChange(EMPTY_MESH_FILTERS);
            }}
          >
            <RotateCcw size={12} />
            Reset view
          </button>
        ) : null}
        {hasActiveFilters(filters) ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-600 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
            onClick={() => onChange(EMPTY_MESH_FILTERS)}
          >
            <X size={12} />
            Clear filters
          </button>
        ) : null}
        <span className="text-xs text-gray-400">
          Showing {visibleCount} / {totalCount} nodes · {visibleConnectionCount}{" "}
          connections
        </span>
      </div>
    </div>
  );
}
