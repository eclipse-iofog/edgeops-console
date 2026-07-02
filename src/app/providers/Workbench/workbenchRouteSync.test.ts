import { describe, expect, it } from "vitest";

import { createWorkbenchTab } from "./workbenchTabLogic";
import { getTabNavigateTarget } from "./workbenchRouteSync";

describe("getTabNavigateTarget", () => {
  it("returns null when there is no active tab", () => {
    expect(
      getTabNavigateTarget(undefined, {
        pathname: "/dashboard",
        search: "",
      }),
    ).toBeNull();
  });

  it("returns null when the active tab already matches the location", () => {
    const tab = createWorkbenchTab(
      { path: "/nodes/list", search: "?agentId=abc" },
      () => "tab-1",
    );

    expect(
      getTabNavigateTarget(tab, {
        pathname: "/nodes/list",
        search: "?agentId=abc",
      }),
    ).toBeNull();
  });

  it("returns a target when the active tab differs from the location", () => {
    const tab = createWorkbenchTab(
      { path: "/nodes/list", search: "?agentId=abc" },
      () => "tab-1",
    );

    expect(
      getTabNavigateTarget(tab, {
        pathname: "/Workloads/MicroservicesList",
        search: "?microserviceId=xyz",
      }),
    ).toBe("/nodes/list?agentId=abc");
  });
});
