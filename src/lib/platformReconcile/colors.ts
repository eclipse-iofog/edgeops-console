import type { PlatformPhase, ProvisioningStatus } from "./types";

export const PlatformPhaseColor: Record<PlatformPhase, string> = {
  Pending: "#FBBF24",
  Progressing: "#3B82F6",
  Ready: "#16A34A",
  Failed: "#DC2626",
  Deleting: "#6B7280",
};

export const ProvisioningStatusColor: Record<ProvisioningStatus, string> = {
  pending: "#FBBF24",
  ready: "#16A34A",
  failed: "#DC2626",
};

export function isPlatformReconciling(phase?: string): boolean {
  return phase === "Pending" || phase === "Progressing" || phase === "Deleting";
}

export function isProvisioningPending(status?: string): boolean {
  return status === "pending";
}

export function resolveAgentMarkerColor(agent: {
  daemonStatus?: string;
  warningMessage?: string;
}): string {
  const warning = agent.warningMessage || "";
  if (warning.startsWith("Platform reconcile:")) {
    return "orange";
  }
  if (agent.daemonStatus === "RUNNING") {
    if (warning && warning !== "HEALTHY") {
      return "#CA8A04";
    }
    return "green";
  }
  return "red";
}
