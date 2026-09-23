import React from "react";
import CustomProgressBar from "@/components/ui/CustomProgressBar";
import {
  formatHostCpuPercent,
  hostUsedBytes,
} from "@/lib/formatting/resourceMetrics";

export function displayOrDash(value: unknown) {
  if (value == null || value === "") {
    return "—";
  }
  return String(value);
}

export function HostCpuMetricBar({ row }: { row: any }) {
  const pct = formatHostCpuPercent(row.systemTotalCpu);
  if (pct == null) {
    return <span className="text-xs text-gray-500">—</span>;
  }
  return (
    <CustomProgressBar value={pct} max={100} unit="host-percent" />
  );
}

export function HostMemoryMetricBar({ row }: { row: any }) {
  const used = hostUsedBytes(row.systemTotalMemory, row.systemAvailableMemory);
  const total = Number(row.systemTotalMemory);
  if (used == null || !Number.isFinite(total) || total <= 0) {
    return <span className="text-xs text-gray-500">—</span>;
  }
  return (
    <CustomProgressBar value={used} max={total} unit="bytes-used-total" />
  );
}

export function HostDiskFsMetricBar({ row }: { row: any }) {
  const used = hostUsedBytes(row.systemTotalDisk, row.systemAvailableDisk);
  const total = Number(row.systemTotalDisk);
  if (used == null || !Number.isFinite(total) || total <= 0) {
    return <span className="text-xs text-gray-500">—</span>;
  }
  return (
    <CustomProgressBar value={used} max={total} unit="bytes-used-total" />
  );
}
