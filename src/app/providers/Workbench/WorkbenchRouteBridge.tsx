import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { isWorkbenchEligible } from "@/config/navigation";

import { useWorkbench } from "./useWorkbench";

const DASHBOARD_PATH = "/dashboard";

/** Syncs hash navigation with workbench tabs (open/focus, active tab URL). */
export default function WorkbenchRouteBridge() {
  const location = useLocation();
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
    if (!isWorkbenchEligible(location.pathname)) {
      return;
    }

    const activeTab = tabs.find((tab) => tab.id === activeTabId);

    if (!activeTab) {
      if (tabs.length === 0) {
        openTab({ path: DASHBOARD_PATH });
      }
      return;
    }

    const target = `${activeTab.path}${activeTab.search}`;
    const current = `${location.pathname}${location.search}`;

    if (target !== current) {
      navigate(target);
    }
  }, [activeTabId, tabs, navigate, openTab, location.pathname, location.search]);

  return null;
}
