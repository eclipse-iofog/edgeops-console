import { describe, expect, it } from "vitest";

import {
  closeWorkbenchTab,
  createWorkbenchTab,
  openWorkbenchTab,
  type WorkbenchTabState,
} from "./workbenchTabLogic";
import { MAX_WORKBENCH_TABS } from "./workbenchTypes";

let idCounter = 0;

function nextId() {
  idCounter += 1;
  return `tab-${idCounter}`;
}

function makeState(tabs: WorkbenchTabState["tabs"], overrides?: Partial<WorkbenchTabState>): WorkbenchTabState {
  return {
    tabs,
    activeTabId: tabs[0]?.id ?? null,
    previewTabId: null,
    ...overrides,
  };
}

describe("workbenchTabLogic", () => {
  it("focuses an existing tab", () => {
    const tab = createWorkbenchTab({ path: "/dashboard" }, nextId);
    const state = makeState([tab], { activeTabId: tab.id });

    const outcome = openWorkbenchTab(state, { path: "/dashboard" }, nextId);

    expect(outcome.result).toBe("focused");
    expect(outcome.state.tabs).toHaveLength(1);
    expect(outcome.state.activeTabId).toBe(tab.id);
  });

  it("replaces the preview tab on single-click navigation", () => {
    const preview = createWorkbenchTab({ path: "/dashboard" }, nextId);
    const pinned = createWorkbenchTab(
      { path: "/events", pinned: true },
      nextId,
    );
    pinned.pinned = true;

    const state = makeState([pinned, preview], {
      activeTabId: preview.id,
      previewTabId: preview.id,
    });

    const outcome = openWorkbenchTab(
      state,
      { path: "/config/secret" },
      nextId,
    );

    expect(outcome.result).toBe("replaced");
    expect(outcome.state.tabs).toHaveLength(2);
    expect(outcome.state.tabs[1]?.path).toBe("/config/secret");
    expect(outcome.state.previewTabId).toBe(preview.id);
  });

  it("pins a preview tab on double-click navigation", () => {
    const preview = createWorkbenchTab({ path: "/dashboard" }, nextId);
    const state = makeState([preview], {
      activeTabId: preview.id,
      previewTabId: preview.id,
    });

    const outcome = openWorkbenchTab(
      state,
      { path: "/config/Registries", pinned: true },
      nextId,
    );

    expect(outcome.result).toBe("replaced");
    expect(outcome.state.tabs[0]?.pinned).toBe(true);
    expect(outcome.state.previewTabId).toBeNull();
  });

  it("evicts the oldest unpinned tab when at capacity without a preview slot", () => {
    const pinnedTabs = Array.from({ length: MAX_WORKBENCH_TABS - 1 }, (_, index) => {
      const tab = createWorkbenchTab(
        { path: `/pinned-${index}`, pinned: true },
        nextId,
      );
      tab.pinned = true;
      tab.createdAt = index;
      return tab;
    });

    const orphanPreview = createWorkbenchTab({ path: "/orphan-preview" }, nextId);
    orphanPreview.createdAt = 999;

    const state = makeState([...pinnedTabs, orphanPreview], {
      activeTabId: orphanPreview.id,
      previewTabId: null,
    });

    const outcome = openWorkbenchTab(
      state,
      { path: "/config/secret", pinned: true },
      nextId,
    );

    expect(outcome.result).toBe("opened");
    expect(outcome.state.tabs).toHaveLength(MAX_WORKBENCH_TABS);
    expect(outcome.state.tabs.some((tab) => tab.id === orphanPreview.id)).toBe(false);
    expect(outcome.state.tabs.some((tab) => tab.path === "/config/secret")).toBe(
      true,
    );
  });

  it("blocks opens when all tabs are pinned", () => {
    const pinnedTabs = Array.from({ length: MAX_WORKBENCH_TABS }, (_, index) => {
      const tab = createWorkbenchTab(
        { path: `/pinned-${index}`, pinned: true },
        nextId,
      );
      tab.pinned = true;
      return tab;
    });

    const state = makeState(pinnedTabs, { activeTabId: pinnedTabs[0]?.id ?? null });

    const outcome = openWorkbenchTab(
      state,
      { path: "/config/secret" },
      nextId,
    );

    expect(outcome.result).toBe("blocked");
    expect(outcome.state.tabs).toHaveLength(MAX_WORKBENCH_TABS);
  });

  it("focuses the neighbor tab when closing the active tab", () => {
    const first = createWorkbenchTab({ path: "/dashboard", pinned: true }, nextId);
    first.pinned = true;
    const second = createWorkbenchTab({ path: "/events" }, nextId);

    const state = makeState([first, second], {
      activeTabId: second.id,
      previewTabId: second.id,
    });

    const nextState = closeWorkbenchTab(state, second.id);

    expect(nextState.tabs).toHaveLength(1);
    expect(nextState.activeTabId).toBe(first.id);
    expect(nextState.previewTabId).toBeNull();
  });
});
