import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { isWorkbenchEligible } from "@/config/navigation";

import { useWorkbench } from "./useWorkbench";
import { getTabNavigateTarget } from "./workbenchRouteSync";

const DASHBOARD_PATH = "/dashboard";

/** Syncs hash navigation with workbench tabs (open/focus, active tab URL). */
export default function WorkbenchRouteBridge() {
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;
  const navigate = useNavigate();
  const { tabs, activeTabId, openTab } = useWorkbench();

  useEffect(() => {
    if (!isWorkbenchEligible(location.pathname)) {
      return;
    }

    openTab({
      path: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search, openTab]);

  useEffect(() => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId);

    if (!activeTab) {
      if (tabs.length === 0) {
        openTab({ path: DASHBOARD_PATH });
      }
      return;
    }

    if (!isWorkbenchEligible(activeTab.path)) {
      return;
    }

    const target = getTabNavigateTarget(activeTab, locationRef.current);
    if (target) {
      navigate(target);
    }
  }, [activeTabId, tabs, navigate, openTab]);

  return null;
}
