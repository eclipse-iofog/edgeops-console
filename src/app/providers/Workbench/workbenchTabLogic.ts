import { getRouteTitle } from "@/config/navigation";

import {
  MAX_WORKBENCH_TABS,
  type OpenTabParams,
  type WorkbenchTab,
} from "./workbenchTypes";

export type WorkbenchTabState = {
  tabs: WorkbenchTab[];
  activeTabId: string | null;
  previewTabId: string | null;
};

export type OpenTabOutcome =
  | { result: "focused"; state: WorkbenchTabState }
  | { result: "opened" | "replaced"; state: WorkbenchTabState }
  | { result: "blocked"; state: WorkbenchTabState };

function findOldestUnpinnedTab(
  tabs: WorkbenchTab[],
  previewTabId: string | null,
): WorkbenchTab | undefined {
  if (previewTabId) {
    const preview = tabs.find((tab) => tab.id === previewTabId && !tab.pinned);
    if (preview) {
      return preview;
    }
  }

  const unpinned = tabs.filter((tab) => !tab.pinned);
  if (unpinned.length === 0) {
    return undefined;
  }

  return unpinned.reduce((oldest, tab) =>
    tab.createdAt < oldest.createdAt ? tab : oldest,
  );
}

function evictTab(
  tabs: WorkbenchTab[],
  tabId: string,
  previewTabId: string | null,
): { tabs: WorkbenchTab[]; previewTabId: string | null } {
  return {
    tabs: tabs.filter((tab) => tab.id !== tabId),
    previewTabId: previewTabId === tabId ? null : previewTabId,
  };
}

function ensureCapacity(
  tabs: WorkbenchTab[],
  previewTabId: string | null,
): { tabs: WorkbenchTab[]; previewTabId: string | null; blocked: boolean } {
  if (tabs.length < MAX_WORKBENCH_TABS) {
    return { tabs, previewTabId, blocked: false };
  }

  const toEvict = findOldestUnpinnedTab(tabs, previewTabId);
  if (!toEvict) {
    return { tabs, previewTabId, blocked: true };
  }

  const evicted = evictTab(tabs, toEvict.id, previewTabId);
  return { ...evicted, blocked: false };
}

export function createWorkbenchTab(
  params: OpenTabParams,
  createId: () => string,
): WorkbenchTab {
  return {
    id: createId(),
    path: params.path,
    search: params.search ?? "",
    title: params.title ?? getRouteTitle(params.path),
    pinned: params.pinned ?? false,
    createdAt: Date.now(),
  };
}

export function openWorkbenchTab(
  state: WorkbenchTabState,
  params: OpenTabParams,
  createId: () => string,
): OpenTabOutcome {
  const search = params.search ?? "";
  const pinned = params.pinned ?? false;
  const existing = state.tabs.find(
    (tab) => tab.path === params.path && tab.search === search,
  );

  if (existing) {
    let tabs = state.tabs;
    let previewTabId = state.previewTabId;

    if (pinned && !existing.pinned) {
      tabs = tabs.map((tab) =>
        tab.id === existing.id ? { ...tab, pinned: true } : tab,
      );
      if (previewTabId === existing.id) {
        previewTabId = null;
      }
    }

    return {
      result: "focused",
      state: {
        tabs,
        activeTabId: existing.id,
        previewTabId,
      },
    };
  }

  let tabs = [...state.tabs];
  let previewTabId = state.previewTabId;
  const preview = previewTabId
    ? tabs.find((tab) => tab.id === previewTabId && !tab.pinned)
    : undefined;

  if (pinned && preview) {
    const updated: WorkbenchTab = {
      ...preview,
      path: params.path,
      search,
      title: params.title ?? getRouteTitle(params.path),
      pinned: true,
    };

    return {
      result: "replaced",
      state: {
        tabs: tabs.map((tab) => (tab.id === preview.id ? updated : tab)),
        activeTabId: preview.id,
        previewTabId: null,
      },
    };
  }

  if (!pinned && preview) {
    const updated: WorkbenchTab = {
      ...preview,
      path: params.path,
      search,
      title: params.title ?? getRouteTitle(params.path),
    };

    return {
      result: "replaced",
      state: {
        tabs: tabs.map((tab) => (tab.id === preview.id ? updated : tab)),
        activeTabId: preview.id,
        previewTabId: preview.id,
      },
    };
  }

  const capacity = ensureCapacity(tabs, previewTabId);
  if (capacity.blocked) {
    return { result: "blocked", state };
  }

  tabs = capacity.tabs;
  previewTabId = capacity.previewTabId;

  const tab = createWorkbenchTab({ ...params, pinned }, createId);

  return {
    result: "opened",
    state: {
      tabs: [...tabs, tab],
      activeTabId: tab.id,
      previewTabId: pinned ? previewTabId : tab.id,
    },
  };
}

export function closeWorkbenchTab(
  state: WorkbenchTabState,
  tabId: string,
): WorkbenchTabState {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) {
    return state;
  }

  const nextTabs = state.tabs.filter((tab) => tab.id !== tabId);
  let nextActiveId = state.activeTabId;
  let previewTabId = state.previewTabId;

  if (state.activeTabId === tabId) {
    nextActiveId =
      nextTabs[index]?.id ?? nextTabs[index - 1]?.id ?? null;
  }

  if (previewTabId === tabId) {
    previewTabId = null;
  }

  return {
    tabs: nextTabs,
    activeTabId: nextActiveId,
    previewTabId,
  };
}
