import React, { useMemo, useCallback, useRef } from "react";
import { useLogViewer } from "@/app/providers";
import ResizableBottomDrawer from "./ResizableBottomDrawer";
import LogViewer from "./LogViewer";

type LogViewerDrawerProps = {
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
};

const LogViewerDrawer = ({
  sidebarCollapsed = true,
  sidebarWidth: measuredSidebarWidth,
}: LogViewerDrawerProps) => {
  const {
    sessions,
    activeSessionId,
    isDrawerOpen,
    removeSession,
    setActiveSession,
    closeDrawer,
    updateLogs,
  } = useLogViewer();

  // Use refs to store stable tab components
  const logTabsRef = useRef(new Map());

  // Create stable callback functions
  const handleRemoveSession = useCallback(
    (sessionId: string) => {
      removeSession(sessionId);
    },
    [removeSession],
  );

  // Build tabs with useMemo to avoid unnecessary recreation
  const tabs = useMemo(() => {
    const allTabs: any[] = [];

    // Add log tabs
    sessions.forEach((session) => {
      if (!logTabsRef.current.has(session.id)) {
        const logElement = (
          <LogViewer
            socketUrl={session.socketUrl}
            authToken={session.authToken}
            resourceName={session.resourceName}
            resourceUuid={session.resourceUuid}
            sourceType={session.sourceType}
            onClose={() => {
              handleRemoveSession(session.id);
            }}
            onLogsUpdate={(logs) => {
              updateLogs(session.id, logs);
            }}
          />
        );

        logTabsRef.current.set(session.id, {
          id: session.id,
          title: session.title,
          content: logElement,
        });
      }
      const tab = logTabsRef.current.get(session.id);
      if (tab) {
        allTabs.push(tab);
      }
    });

    // Clean up removed sessions
    const currentSessionIds = new Set(sessions.map((s) => s.id));
    logTabsRef.current.forEach((_, sessionId) => {
      if (!currentSessionIds.has(sessionId)) {
        logTabsRef.current.delete(sessionId);
      }
    });

    return allTabs;
  }, [sessions, handleRemoveSession, updateLogs]);

  const handleTabChange = (tabId: string) => {
    setActiveSession(tabId);
  };

  const handleTabClose = useCallback(
    (tabId: string) => {
      removeSession(tabId);
    },
    [removeSession],
  );

  const handleClose = () => {
    closeDrawer();
  };

  // Get active session content from the stable tabs
  const activeSessionContent = useMemo(() => {
    if (activeSessionId) {
      const logTab = logTabsRef.current.get(activeSessionId);
      if (logTab) {
        return logTab.content;
      }
    }
    return null;
  }, [activeSessionId]);

  if (sessions.length === 0) {
    return null;
  }

  const sidebarWidth = measuredSidebarWidth ?? (sidebarCollapsed ? 80 : 270);

  return (
    <ResizableBottomDrawer
      open={isDrawerOpen}
      isEdit={false}
      onClose={handleClose}
      onSave={() => {}}
      title="Log Viewer"
      tabs={tabs}
      activeTabId={activeSessionId || undefined}
      onTabChange={handleTabChange}
      onTabClose={handleTabClose}
      showUnsavedChangesModal={false}
      leftOffset={sidebarWidth}
    >
      {activeSessionContent}
    </ResizableBottomDrawer>
  );
};

export default LogViewerDrawer;
