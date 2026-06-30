import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useFeedback } from "@/app/providers/feedback";

import {
  closeWorkbenchTab,
  openWorkbenchTab,
  type WorkbenchTabState,
} from "./workbenchTabLogic";
import {
  MAX_WORKBENCH_TABS,
  type OpenTabParams,
  type OpenTabResult,
  type WorkbenchTab,
} from "./workbenchTypes";

export type WorkbenchContextValue = {
  tabs: WorkbenchTab[];
  activeTabId: string | null;
  previewTabId: string | null;
  openTab: (params: OpenTabParams) => OpenTabResult;
  closeTab: (tabId: string) => void;
  focusTab: (tabId: string) => void;
  getActiveTab: () => WorkbenchTab | undefined;
};

const WorkbenchContext = createContext<WorkbenchContextValue | undefined>(
  undefined,
);

function createTabId(): string {
  return `workbench-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type WorkbenchProviderProps = {
  children: ReactNode;
};

export function WorkbenchProvider({ children }: WorkbenchProviderProps) {
  const { pushFeedback } = useFeedback();
  const [state, setState] = useState<WorkbenchTabState>({
    tabs: [],
    activeTabId: null,
    previewTabId: null,
  });

  const openTab = useCallback(
    (params: OpenTabParams): OpenTabResult => {
      let result: OpenTabResult = "focused";

      setState((prev) => {
        const outcome = openWorkbenchTab(prev, params, createTabId);
        result = outcome.result;
        return outcome.state;
      });

      if (result === "blocked") {
        pushFeedback({
          message: `Workbench tab limit reached (${MAX_WORKBENCH_TABS} pinned tabs). Close a tab to open another.`,
          type: "warning",
        });
      }

      return result;
    },
    [pushFeedback],
  );

  const closeTab = useCallback((tabId: string) => {
    setState((prev) => closeWorkbenchTab(prev, tabId));
  }, []);

  const focusTab = useCallback((tabId: string) => {
    setState((prev) => {
      if (!prev.tabs.some((tab) => tab.id === tabId)) {
        return prev;
      }

      return { ...prev, activeTabId: tabId };
    });
  }, []);

  const getActiveTab = useCallback((): WorkbenchTab | undefined => {
    return state.tabs.find((tab) => tab.id === state.activeTabId);
  }, [state.activeTabId, state.tabs]);

  const value = useMemo<WorkbenchContextValue>(
    () => ({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
      previewTabId: state.previewTabId,
      openTab,
      closeTab,
      focusTab,
      getActiveTab,
    }),
    [
      state.tabs,
      state.activeTabId,
      state.previewTabId,
      openTab,
      closeTab,
      focusTab,
      getActiveTab,
    ],
  );

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
}

export { WorkbenchContext };
