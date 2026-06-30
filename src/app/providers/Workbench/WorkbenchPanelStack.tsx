import { Routes, useLocation } from "react-router-dom";

import { useWorkbench } from "./useWorkbench";
import { createWorkbenchRouteElements } from "./routeComponentMap";

type WorkbenchPanelStackProps = {
  collapsed: boolean;
};

export default function WorkbenchPanelStack({
  collapsed,
}: WorkbenchPanelStackProps) {
  const { tabs, activeTabId } = useWorkbench();
  const location = useLocation();
  const routeElements = createWorkbenchRouteElements({ collapsed });

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const tabLocation = isActive
          ? location
          : {
              pathname: tab.path,
              search: tab.search,
              hash: "",
              state: null,
              key: tab.id,
            };

        return (
          <div
            key={tab.id}
            className={
              isActive
                ? "flex flex-col flex-1 min-h-0 h-full"
                : "hidden"
            }
            aria-hidden={!isActive}
          >
            <div className="flex flex-col flex-1 min-h-0 h-full overflow-auto">
              <Routes location={tabLocation}>{routeElements}</Routes>
            </div>
          </div>
        );
      })}
    </div>
  );
}
