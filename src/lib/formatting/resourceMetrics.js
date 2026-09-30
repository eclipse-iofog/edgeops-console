import { MiBFactor, prettyBytes } from "@/lib/formatting";

export function cpuUsageUnitsToCores(units) {
  const n = Number(units);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return n / 100;
}

export function formatCpuCores(units) {
  const n = Number(units);
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${cpuUsageUnitsToCores(n).toFixed(2)} cores`;
}

export function formatCpuCoresWithLimit(units, limitUnits) {
  const usage = Number(units);
  if (!Number.isFinite(usage)) {
    return "—";
  }
  const limit = Number(limitUnits);
  const usageLabel = `${(usage / 100).toFixed(2)} cores`;
  if (!Number.isFinite(limit) || limit <= 0) {
    return usageLabel;
  }
  return `${usageLabel} / ${(limit / 100).toFixed(2)} limit`;
}

export function formatHostCpuPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

export function formatHostCpuPercentLabel(value) {
  const pct = formatHostCpuPercent(value);
  if (pct == null) {
    return "—";
  }
  return `${pct.toFixed(1)}% of host`;
}

export function formatHostBytesUsedTotal(total, available) {
  const used = hostUsedBytes(total, available);
  const totalBytes = Number(total);
  if (used == null || !Number.isFinite(totalBytes) || totalBytes <= 0) {
    return "—";
  }
  return `${prettyBytes(used)} / ${prettyBytes(totalBytes)}`;
}

export function hostUsedBytes(total, available) {
  const totalBytes = Number(total);
  const availableBytes = Number(available);
  if (
    !Number.isFinite(totalBytes) ||
    !Number.isFinite(availableBytes) ||
    totalBytes <= 0
  ) {
    return null;
  }
  return Math.max(0, totalBytes - availableBytes);
}

export function formatDecimalGbPair(usageGb, limitGb) {
  const usage = Number(usageGb);
  const limit = Number(limitGb);
  if (!Number.isFinite(usage)) {
    return "—";
  }
  const usageLabel = `${usage.toFixed(1)} GB`;
  if (!Number.isFinite(limit) || limit <= 0) {
    return usageLabel;
  }
  return `${usageLabel} / ${limit.toFixed(0)} GB`;
}

export function edgeletMemoryUsageBytes(memoryUsageMiB) {
  return Number(memoryUsageMiB || 0) * MiBFactor;
}

export function formatEdgeletMemory(usageMiB, limitMiB) {
  const usedBytes = edgeletMemoryUsageBytes(usageMiB);
  const limit = Number(limitMiB);
  if (!Number.isFinite(limit) || limit <= 0) {
    return prettyBytes(usedBytes);
  }
  return `${prettyBytes(usedBytes)} / ${prettyBytes(limit * MiBFactor)}`;
}

export function isResourceViolation(value) {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
}

export function microserviceCpuMaxUnits(cpus) {
  const cores = Number(cpus);
  if (!Number.isFinite(cores) || cores <= 0) {
    return null;
  }
  return cores * 100;
}

export function microserviceMemoryLimitBytes(memoryLimitMiB) {
  const limitMiB = Number(memoryLimitMiB);
  if (!Number.isFinite(limitMiB) || limitMiB <= 0) {
    return null;
  }
  return limitMiB * MiBFactor;
}

export function formatMicroserviceMemory(usageBytes, memoryLimitMiB) {
  const used = Number(usageBytes);
  if (!Number.isFinite(used)) {
    return "—";
  }
  const limitBytes = microserviceMemoryLimitBytes(memoryLimitMiB);
  if (limitBytes == null) {
    return prettyBytes(used);
  }
  return `${prettyBytes(used)} / ${prettyBytes(limitBytes)}`;
}

/** Controller CPU usage units: 100 units = 1 core = 1000 millicores. */
export function cpuUnitsToMillicores(units) {
  const n = Number(units);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return n * 10;
}

export function coresToMillicores(cores) {
  const n = Number(cores);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return n * 1000;
}

const MILLICORE_AXIS_STEPS = [
  10, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000,
  2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 30000, 50000,
];

export function niceMillicoreAxisMax(maxMillicores, paddingFactor = 1.15) {
  const padded = maxMillicores * paddingFactor;
  if (padded <= 0) {
    return 100;
  }
  for (const step of MILLICORE_AXIS_STEPS) {
    if (step >= padded) {
      return step;
    }
  }
  return Math.ceil(padded / 1000) * 1000;
}

/** Bubble chart X max from observed CPU usage (millicores), not limits. */
export function bubbleChartCpuAxisMaxMillicores({ usageMillicores = [] } = {}) {
  const usageMax = usageMillicores.reduce(
    (max, value) =>
      Number.isFinite(value) && value > max ? value : max,
    0,
  );
  return niceMillicoreAxisMax(usageMax);
}

export function formatMillicoreAxisLabel(millicores) {
  const n = Math.round(Number(millicores));
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${n}m`;
}

export function formatMicroserviceCpuDisplay(cpuUsageUnits, cpus) {
  const usage = Number(cpuUsageUnits);
  if (!Number.isFinite(usage)) {
    return "—";
  }
  const maxUnits = microserviceCpuMaxUnits(cpus);
  const coreLabel = `${(usage / 100).toFixed(2)} cores`;
  if (maxUnits == null) {
    return coreLabel;
  }
  return `${coreLabel} / ${(maxUnits / 100).toFixed(2)} limit`;
}

export function displayHostMetric(value, formatter) {
  if (value == null || value === "") {
    return "—";
  }
  return formatter(value);
}
