import { describe, expect, it } from "vitest";

import {
  getPollMode,
  getResourceStoreId,
  getRouteMeta,
  isWorkbenchEligible,
  POLL_MODES,
} from "./navigation";

describe("navigation registry", () => {
  it("matches exact paths", () => {
    expect(getRouteMeta("/dashboard")?.title).toBe("Overview");
    expect(getRouteMeta("/config/secret")?.resourceStoreId).toBe("secrets");
  });

  it("uses longest-prefix match for nested paths", () => {
    expect(getRouteMeta("/account/force-password-change")?.workbenchEligible).toBe(
      false,
    );
    expect(getRouteMeta("/account/settings")?.path).toBe("/account");
  });

  it("exports poll and workbench helpers", () => {
    expect(getPollMode("/Workloads/MicroservicesList")).toBe(POLL_MODES.FULL);
    expect(getPollMode("/config/VolumeMounts")).toBe(POLL_MODES.LIGHT);
    expect(getPollMode("/config/secret")).toBe(POLL_MODES.OFF);
    expect(getResourceStoreId("/config/Registries")).toBe("registries");
    expect(isWorkbenchEligible("/login")).toBe(false);
    expect(isWorkbenchEligible("/dashboard")).toBe(true);
  });
});
