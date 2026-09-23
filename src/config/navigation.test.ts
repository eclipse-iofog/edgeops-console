import { describe, expect, it } from "vitest";

import {
  getPollMode,
  getResourceStoreId,
  getRouteMeta,
  isWorkbenchEligible,
  POLL_MODES,
  SIDEBAR_NAV_GROUPS,
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

  it("registers AI Model Catalog, AI Knowledge Catalog, Runtime Classes, and Microservice Templates", () => {
    expect(getRouteMeta("/config/Models")?.title).toBe("AI Model Catalog");
    expect(getPollMode("/config/Models")).toBe(POLL_MODES.LIGHT);
    expect(getResourceStoreId("/config/Models")).toBe("models");
    expect(isWorkbenchEligible("/config/Models")).toBe(true);

    expect(getRouteMeta("/config/Knowledge")?.title).toBe("AI Knowledge Catalog");
    expect(getPollMode("/config/Knowledge")).toBe(POLL_MODES.LIGHT);
    expect(getResourceStoreId("/config/Knowledge")).toBe("knowledge");
    expect(isWorkbenchEligible("/config/Knowledge")).toBe(true);

    expect(getRouteMeta("/config/RuntimeClasses")?.title).toBe("Runtime Classes");
    expect(getPollMode("/config/RuntimeClasses")).toBe(POLL_MODES.LIGHT);
    expect(getResourceStoreId("/config/RuntimeClasses")).toBe("runtimeClasses");
    expect(isWorkbenchEligible("/config/RuntimeClasses")).toBe(true);

    expect(getRouteMeta("/config/MicroserviceTemplates")?.title).toBe(
      "Microservice Templates",
    );
    expect(getPollMode("/config/MicroserviceTemplates")).toBe(POLL_MODES.OFF);
    expect(getResourceStoreId("/config/MicroserviceTemplates")).toBe(
      "microserviceTemplates",
    );
    expect(isWorkbenchEligible("/config/MicroserviceTemplates")).toBe(true);
  });

  it("orders Config sidebar children with Microservice Templates, AI Model Catalog, and Runtime Classes", () => {
    const configGroup = SIDEBAR_NAV_GROUPS.find((group) => group.id === "config");
    expect(configGroup?.childPaths).toEqual([
      "/config/Registries",
      "/config/CatalogMicroservices",
      "/config/Models",
      "/config/Knowledge",
      "/config/AppTemplates",
      "/config/MicroserviceTemplates",
      "/config/ConfigMaps",
      "/config/secret",
      "/config/certificates",
      "/config/VolumeMounts",
      "/config/RuntimeClasses",
    ]);
  });
});
