export type PlatformPhase =
  | "Pending"
  | "Progressing"
  | "Ready"
  | "Failed"
  | "Deleting";

export type ProvisioningStatus = "pending" | "ready" | "failed";

export interface PlatformCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
}

export interface PlatformStatus {
  phase: PlatformPhase;
  generation: number;
  observedGeneration: number;
  lastError?: string | null;
  lastTransitionAt?: string;
  conditions?: PlatformCondition[];
}

export const HUB_READY_TOOLTIP =
  "Hub provisioning complete. Edge TCP bridges on tagged fogs converge separately via fog platform reconcile.";

export const PLATFORM_PHASE_TOOLTIPS: Record<PlatformPhase, string> = {
  Pending: "Waiting to start platform setup",
  Progressing: "Platform setup in progress",
  Ready: "Router and NATS platform is ready",
  Failed: "Platform setup failed — check Last error",
  Deleting: "Platform is being torn down",
};

export const PROVISIONING_STATUS_TOOLTIPS: Record<ProvisioningStatus, string> =
  {
    pending: "Hub provisioning queued or in progress",
    ready: HUB_READY_TOOLTIP,
    failed: "Hub provisioning failed — check Provisioning error",
  };
