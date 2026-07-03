import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getControllerDisplayStatus,
  getHeartbeatAgeMs,
  HEARTBEAT_STALE_MS,
  type ClusterController,
} from "./clusterControllerStatus";

const baseController: ClusterController = {
  uuid: "f6d8546a-a6ea-4b35-a30e-8d923162c55c",
  host: "192.168.1.11",
  processId: 57987,
  lastHeartbeat: "2026-07-03T09:46:42.253Z",
  isActive: true,
  createdAt: "2026-07-03T06:16:36.484Z",
  updatedAt: "2026-07-03T09:46:42.257Z",
};

describe("clusterControllerStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null heartbeat age when lastHeartbeat is missing", () => {
    expect(getHeartbeatAgeMs(null)).toBeNull();
  });

  it("marks fresh active controllers as active", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T09:46:50.000Z"));

    expect(getControllerDisplayStatus(baseController)).toBe("active");
  });

  it("marks fresh inactive controllers as standby", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T09:46:50.000Z"));

    expect(
      getControllerDisplayStatus({ ...baseController, isActive: false }),
    ).toBe("standby");
  });

  it("marks controllers with stale heartbeats as stale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(
      new Date(
        new Date(baseController.lastHeartbeat!).getTime() +
          HEARTBEAT_STALE_MS +
          1,
      ),
    );

    expect(getControllerDisplayStatus(baseController)).toBe("stale");
    expect(
      getControllerDisplayStatus({ ...baseController, isActive: false }),
    ).toBe("stale");
  });
});
