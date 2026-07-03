export const HEARTBEAT_STALE_MS = 60_000;

export type ClusterController = {
  uuid: string;
  host: string | null;
  processId: number | null;
  lastHeartbeat: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClusterControllerDisplayStatus = "active" | "standby" | "stale";

export function getHeartbeatAgeMs(lastHeartbeat: string | null): number | null {
  if (!lastHeartbeat) {
    return null;
  }

  const age = Date.now() - new Date(lastHeartbeat).getTime();
  return Number.isNaN(age) ? null : age;
}

export function getControllerDisplayStatus(
  controller: ClusterController,
): ClusterControllerDisplayStatus {
  const age = getHeartbeatAgeMs(controller.lastHeartbeat);
  if (age === null || age >= HEARTBEAT_STALE_MS) {
    return "stale";
  }
  return controller.isActive ? "active" : "standby";
}
