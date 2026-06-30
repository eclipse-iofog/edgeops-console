import React from "react";
import { HashRouter, useLocation } from "react-router-dom";

import {
  useController,
  useTerminal,
  WorkbenchProvider,
} from "@/app/providers";
import RuntimePollingBridge from "@/app/providers/RuntimePollingBridge";
import ResourceStorePollingBridge from "@/app/providers/ResourceStorePollingBridge";
import WorkbenchPanelStack from "@/app/providers/Workbench/WorkbenchPanelStack";
import WorkbenchRouteBridge from "@/app/providers/Workbench/WorkbenchRouteBridge";
import WorkbenchTabBar from "@/app/providers/Workbench/WorkbenchTabBar";
import { getAuthMode, useAuth } from "@/auth";
import PostLoginGate from "@/auth/PostLoginGate";
import AppRoutes from "@/app/routes";
import { isWorkbenchEligible } from "@/config/navigation";
import GlobalTerminalDrawer from "@/components/terminal/GlobalTerminalDrawer";
import AppSidebar from "./AppSidebar";
import IamExternalBanner from "./IamExternalBanner";
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from "./sidebarConstants";

function MainContent({ collapsed }: { collapsed: boolean }) {
  const location = useLocation();
  const workbenchEligible = isWorkbenchEligible(location.pathname);

  if (!workbenchEligible) {
    return (
      <div className="flex flex-col flex-1 min-h-0 h-full overflow-auto">
        <AppRoutes collapsed={collapsed} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <WorkbenchTabBar />
      <WorkbenchPanelStack collapsed={collapsed} />
    </div>
  );
}

export default function AppLayout() {
  const auth = useAuth();
  const returnHomeCbRef = React.useRef<(() => void) | null>(null);
  const { status, request } = useController();
  const authMode = getAuthMode();
  const isEmbeddedAuth = authMode === "embedded";
  const { isDrawerOpen } = useTerminal();
  const [collapsed, setCollapsed] = React.useState(true);
  const [isPinned, setIsPinned] = React.useState(false);
  const [isNatsEnabled, setIsNatsEnabled] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = React.useState(SIDEBAR_WIDTH_COLLAPSED);

  const returnHome = () => {
    if (returnHomeCbRef.current) {
      returnHomeCbRef.current();
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signoutRedirect();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  React.useEffect(() => {
    const measureSidebar = () => {
      if (sidebarRef.current) {
        requestAnimationFrame(() => {
          if (sidebarRef.current) {
            const rect = sidebarRef.current.getBoundingClientRect();
            setSidebarWidth(rect.width);
          }
        });
      }
    };

    const timeoutId = setTimeout(measureSidebar, 100);

    let resizeObserver: ResizeObserver | null = null;
    if (sidebarRef.current) {
      resizeObserver = new ResizeObserver(measureSidebar);
      resizeObserver.observe(sidebarRef.current);
    }

    window.addEventListener("resize", measureSidebar);

    return () => {
      clearTimeout(timeoutId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("resize", measureSidebar);
    };
  }, [collapsed, isPinned]);

  React.useEffect(() => {
    let mounted = true;
    const checkNatsCapability = async () => {
      try {
        const response = await request("/api/v3/capabilities/nats", {
          method: "HEAD",
        });
        if (mounted) {
          setIsNatsEnabled(Boolean(response?.ok));
        }
      } catch (e) {
        if (mounted) {
          setIsNatsEnabled(false);
        }
      }
    };

    if (auth?.isAuthenticated) {
      checkNatsCapability();
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.isAuthenticated, auth?.user?.access_token]);

  if (auth.isLoading) {
    return null;
  }

  const handleTogglePin = () => {
    setIsPinned((pinned) => !pinned);
    setCollapsed(false);
  };

  return (
    <HashRouter>
      <WorkbenchProvider>
        <RuntimePollingBridge />
        <ResourceStorePollingBridge />
        <WorkbenchRouteBridge />
        <div className="min-h-screen flex flex-col text-gray-900 dark:bg-gray-900 dark:text-white">
        <div className="flex">
          <AppSidebar
            sidebarRef={sidebarRef}
            collapsed={collapsed}
            isPinned={isPinned}
            isNatsEnabled={isNatsEnabled}
            isEmbeddedAuth={isEmbeddedAuth}
            onMouseEnter={() => !isPinned && setCollapsed(false)}
            onMouseLeave={() => !isPinned && setCollapsed(true)}
            onTogglePin={handleTogglePin}
            onLogout={handleLogout}
            onReturnHome={returnHome}
            controllerVersion={status?.versions.controller}
            consoleVersion={status?.versions.ecnViewer}
            accessToken={auth?.user?.access_token}
          />

          <div
            className="flex flex-col flex-1 min-h-0 px-5 pt-6 bg-gray-900 overflow-hidden"
            style={{
              height: isDrawerOpen
                ? "calc(100vh - var(--terminal-drawer-height, 40px))"
                : "100vh",
              maxHeight: isDrawerOpen
                ? "calc(100vh - var(--terminal-drawer-height, 40px))"
                : "100vh",
            }}
          >
            <IamExternalBanner />
            <PostLoginGate>
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <MainContent collapsed={collapsed} />
              </div>
            </PostLoginGate>
          </div>
        </div>
        <GlobalTerminalDrawer
          sidebarCollapsed={collapsed}
          sidebarWidth={
            sidebarWidth ||
            (collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED)
          }
        />
        </div>
      </WorkbenchProvider>
    </HashRouter>
  );
}
