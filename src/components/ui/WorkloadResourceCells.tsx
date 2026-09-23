import React from "react";
import CustomProgressBar from "@/components/ui/CustomProgressBar";
import {
  formatCpuCores,
  formatMicroserviceMemory,
  microserviceCpuMaxUnits,
  microserviceMemoryLimitBytes,
} from "@/lib/formatting/resourceMetrics";

type MicroserviceRow = {
  status?: { cpuUsage?: number; memoryUsage?: number; status?: string };
  cpus?: number;
  memoryLimit?: number;
};

function isRunningSample(row: MicroserviceRow) {
  return row.status?.status === "RUNNING";
}

export function MicroserviceCpuCell({ row }: { row: MicroserviceRow }) {
  if (!isRunningSample(row)) {
    return <span className="text-xs text-gray-500">—</span>;
  }

  const usage = Number(row.status?.cpuUsage ?? 0);
  const maxUnits = microserviceCpuMaxUnits(row.cpus);

  if (maxUnits == null) {
    return (
      <span className="text-xs text-gray-300 whitespace-nowrap">
        {formatCpuCores(usage)}
      </span>
    );
  }

  return (
    <CustomProgressBar value={usage} max={maxUnits} unit="microservice-cpu" />
  );
}

export function MicroserviceMemoryCell({ row }: { row: MicroserviceRow }) {
  if (!isRunningSample(row)) {
    return <span className="text-xs text-gray-500">—</span>;
  }

  const usageBytes = Number(row.status?.memoryUsage ?? 0);
  const limitBytes = microserviceMemoryLimitBytes(row.memoryLimit);

  if (limitBytes == null) {
    return (
      <span className="text-xs text-gray-300 whitespace-nowrap">
        {formatMicroserviceMemory(usageBytes, undefined)}
      </span>
    );
  }

  return (
    <CustomProgressBar
      value={usageBytes}
      max={limitBytes}
      unit="microservice-memory"
    />
  );
}
