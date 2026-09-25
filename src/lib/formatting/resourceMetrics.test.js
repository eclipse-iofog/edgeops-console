import { describe, expect, it } from "vitest";
import {
  bubbleChartCpuAxisMax,
  cpuUsageUnitsToCores,
  formatCpuCores,
  formatDecimalGbPair,
  formatEdgeletMemory,
  formatHostBytesUsedTotal,
  hostUsedBytes,
  microserviceCpuMaxUnits,
  microserviceMemoryLimitBytes,
} from "./resourceMetrics";
import { MiBFactor } from "@/lib/formatting";

describe("resourceMetrics", () => {
  it("derives bubble chart cpu axis max from usage and limits", () => {
    expect(
      bubbleChartCpuAxisMax({ usageCores: [0.08], limitCores: [0.5] }),
    ).toBe(0.55);
    expect(
      bubbleChartCpuAxisMax({ usageCores: [0.2], limitCores: [2] }),
    ).toBe(2.2);
    expect(bubbleChartCpuAxisMax({ usageCores: [], limitCores: [] })).toBe(1);
  });

  it("formats cpu usage as cores", () => {
    expect(cpuUsageUnitsToCores(100)).toBe(1);
    expect(cpuUsageUnitsToCores(32)).toBe(0.32);
    expect(cpuUsageUnitsToCores(undefined)).toBe(0);
    expect(formatCpuCores(100)).toBe("1.00 cores");
    expect(formatCpuCores(32)).toBe("0.32 cores");
  });

  it("computes host used bytes from total and available", () => {
    expect(hostUsedBytes(1000, 400)).toBe(600);
    expect(hostUsedBytes(null, 400)).toBe(null);
  });

  it("formats edgelet memory against limit in MiB", () => {
    expect(formatEdgeletMemory(1024, 4096)).toContain("/");
    expect(formatEdgeletMemory(512, 0)).not.toContain("/");
  });

  it("formats data directory decimal GB pair", () => {
    expect(formatDecimalGbPair(12.5, 50)).toBe("12.5 GB / 50 GB");
  });

  it("derives microservice bar limits", () => {
    expect(microserviceCpuMaxUnits(0.5)).toBe(50);
    expect(microserviceCpuMaxUnits(0)).toBe(null);
    expect(microserviceMemoryLimitBytes(512)).toBe(512 * MiBFactor);
  });

  it("formats host used over total bytes", () => {
    expect(formatHostBytesUsedTotal(1000, 400)).toContain("/");
    expect(formatHostBytesUsedTotal(null, 400)).toBe("—");
  });
});
