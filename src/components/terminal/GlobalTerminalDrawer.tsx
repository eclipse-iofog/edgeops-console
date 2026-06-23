import React, { useMemo, useCallback, useRef } from "react";
import { useTerminal } from "@/app/providers";
import { useLogViewer } from "@/app/providers";
import ResizableBottomDrawer from "./ResizableBottomDrawer";
import StableTerminalTab from "./StableTerminalTab";
import StableYamlTab from "@/components/yaml/StableYamlTab";
import StableDeployTab from "@/components/yaml/StableDeployTab";
import LogViewer from "./LogViewer";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";

type GlobalTerminalDrawerProps = {
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
};

const GlobalTerminalDrawer = ({
  sidebarCollapsed = true,
  sidebarWidth: measuredSidebarWidth,
}: GlobalTerminalDrawerProps) => {
  const {
    sessions,
    yamlSessions,
    deploySessions,
    activeSessionId,
    isDrawerOpen,
    removeSession,
    setActiveSession,
    closeDrawer,
    updateYamlContent,
    updateDeploySession,
  } = useTerminal();

  const {
    sessions: logSessions,
    activeSessionId: logActiveSessionId,
    isDrawerOpen: isLogDrawerOpen,
    removeSession: removeLogSession,
    setActiveSession: setActiveLogSession,
    closeDrawer: closeLogDrawer,
    updateLogs,
  } = useLogViewer();

  // Combine drawer open state - open if any drawer should be open
  const combinedIsDrawerOpen = isDrawerOpen || isLogDrawerOpen;

  // Track the last clicked tab to ensure correct tab switching
  const [lastClickedTabId, setLastClickedTabId] = React.useState<string | null>(
    null,
  );

  // Combined active session ID - use the one that matches the clicked tab
  const combinedActiveSessionId = React.useMemo(() => {
    // If we have a last clicked tab, use it if it still exists
    if (lastClickedTabId) {
      const exists =
        sessions.some((s) => s.id === lastClickedTabId) ||
        yamlSessions.some((s) => s.id === lastClickedTabId) ||
        deploySessions.some((s) => s.id === lastClickedTabId) ||
        logSessions.some((s) => s.id === lastClickedTabId);
      if (exists) {
        return lastClickedTabId;
      }
    }
    // Fallback to original logic
    return activeSessionId || logActiveSessionId;
  }, [
    lastClickedTabId,
    activeSessionId,
    logActiveSessionId,
    sessions,
    yamlSessions,
    deploySessions,
    logSessions,
  ]);

  const activeYamlSession = yamlSessions.find(
    (s) => s.id === combinedActiveSessionId,
  );
  const activeDeploySession = deploySessions.find(
    (s) => s.id === combinedActiveSessionId,
  );

  // Use refs to store stable tab components
  const terminalTabsRef = useRef(new Map());
  const yamlTabsRef = useRef(new Map());
  const deployTabsRef = useRef(new Map());
  const logTabsRef = useRef(new Map());

  // State to track deploy function for header button
  const [deployFunction, setDeployFunction] = React.useState<any>(null);
  const [showDeployConfirmModal, setShowDeployConfirmModal] =
    React.useState(false);

  // Clear deploy function when switching away from deploy sessions
  React.useEffect(() => {
    if (!activeDeploySession) {
      setDeployFunction(null);
    }
  }, [activeDeploySession]);

  // Handle deploy confirm
  const handleDeployConfirm = useCallback(async () => {
    if (deployFunction?.deployApplication) {
      await deployFunction.deployApplication();
      setShowDeployConfirmModal(false);
      // Mark session as clean after successful deployment
      if (activeDeploySession) {
        updateDeploySession(activeDeploySession.id, false);
      }
    }
  }, [deployFunction, activeDeploySession, updateDeploySession]);

  // Create stable callback functions
  const handleRemoveSession = useCallback(
    (sessionId: string) => {
      // Try removing from terminal sessions first
      const terminalSession = sessions.find((s) => s.id === sessionId);
      const yamlSession = yamlSessions.find((s) => s.id === sessionId);
      const deploySession = deploySessions.find((s) => s.id === sessionId);
      const logSession = logSessions.find((s) => s.id === sessionId);

      if (terminalSession || yamlSession || deploySession) {
        removeSession(sessionId);
      } else if (logSession) {
        removeLogSession(sessionId);
      }
    },
    [
      sessions,
      yamlSessions,
      deploySessions,
      logSessions,
      removeSession,
      removeLogSession,
    ],
  );

  // Build tabs with useMemo to avoid unnecessary recreation
  const tabs = useMemo(() => {
    const allTabs: any[] = [];

    // Add terminal tabs
    sessions.forEach((session) => {
      if (!terminalTabsRef.current.has(session.id)) {
        const terminalElement = (
          <StableTerminalTab
            sessionId={session.id}
            socketUrl={session.socketUrl}
            authToken={session.authToken}
            microserviceUuid={session.microserviceUuid}
            execId={session.execId}
            nodeUuid={session.nodeUuid}
            agentName={session.agentName}
            waitingForDebugger={session.waitingForDebugger}
            onClose={() => {
              handleRemoveSession(session.id);
            }}
          />
        );

        terminalTabsRef.current.set(session.id, {
          id: session.id,
          title: session.title,
          content: terminalElement,
        });
      } else {
      }
      const tab = terminalTabsRef.current.get(session.id);
      if (tab) {
        allTabs.push(tab);
      }
    });

    // Add YAML tabs
    yamlSessions.forEach((session) => {
      if (!yamlTabsRef.current.has(session.id)) {
        const yamlElement = (
          <StableYamlTab
            sessionId={session.id}
            content={session.content}
            onChange={(value) => updateYamlContent(session.id, value, true)}
          />
        );

        yamlTabsRef.current.set(session.id, {
          id: session.id,
          title: session.title + (session.isDirty ? " *" : ""),
          content: yamlElement,
        });
      }
      const tab = yamlTabsRef.current.get(session.id);
      if (tab) {
        allTabs.push(tab);
      }
    });

    // Add deploy tabs
    deploySessions.forEach((session) => {
      if (!deployTabsRef.current.has(session.id)) {
        const deployElement = (
          <StableDeployTab
            sessionId={session.id}
            template={session.template}
            onClose={() => {
              handleRemoveSession(session.id);
            }}
            onDirtyChange={(isDirty) =>
              updateDeploySession(session.id, isDirty)
            }
            onDeployFunctionChange={(deployFunc) => {
              setDeployFunction(deployFunc);
            }}
          />
        );

        deployTabsRef.current.set(session.id, {
          id: session.id,
          title: session.title + (session.isDirty ? " *" : ""),
          content: deployElement,
        });
      }
      const tab = deployTabsRef.current.get(session.id);
      if (tab) {
        allTabs.push(tab);
      }
    });

    // Add log tabs
    logSessions.forEach((session) => {
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
    const currentSessionIds = new Set([
      ...sessions.map((s) => s.id),
      ...yamlSessions.map((s) => s.id),
      ...deploySessions.map((s) => s.id),
      ...logSessions.map((s) => s.id),
    ]);
    terminalTabsRef.current.forEach((_, sessionId) => {
      if (!currentSessionIds.has(sessionId)) {
        terminalTabsRef.current.delete(sessionId);
      }
    });
    yamlTabsRef.current.forEach((_, sessionId) => {
      if (!currentSessionIds.has(sessionId)) {
        yamlTabsRef.current.delete(sessionId);
      }
    });
    deployTabsRef.current.forEach((_, sessionId) => {
      if (!currentSessionIds.has(sessionId)) {
        deployTabsRef.current.delete(sessionId);
      }
    });
    logTabsRef.current.forEach((_, sessionId) => {
      if (!currentSessionIds.has(sessionId)) {
        logTabsRef.current.delete(sessionId);
      }
    });

    return allTabs;
  }, [
    sessions,
    yamlSessions,
    deploySessions,
    logSessions,
    handleRemoveSession,
    updateYamlContent,
    updateDeploySession,
    updateLogs,
  ]);

  const handleTabChange = (tabId: string) => {
    setLastClickedTabId(tabId); // Track which tab was clicked

    // Check which type of session this is
    const terminalSession = sessions.find((s) => s.id === tabId);
    const yamlSession = yamlSessions.find((s) => s.id === tabId);
    const deploySession = deploySessions.find((s) => s.id === tabId);
    const logSession = logSessions.find((s) => s.id === tabId);

    if (terminalSession || yamlSession || deploySession) {
      setActiveSession(tabId);
    } else if (logSession) {
      setActiveLogSession(tabId);
    }
  };

  const handleTabClose = useCallback(
    (tabId: string) => {
      handleRemoveSession(tabId);
    },
    [handleRemoveSession],
  );

  const handleClose = () => {
    closeDrawer();
    if (isLogDrawerOpen) {
      closeLogDrawer();
    }
  };

  const handleSave = async () => {
    if (activeYamlSession) {
      try {
        await activeYamlSession.onSave(activeYamlSession.content);
        updateYamlContent(
          activeYamlSession.id,
          activeYamlSession.content,
          false,
        );
      } catch (error) {
        console.error("Failed to save YAML:", error);
      }
    } else if (activeDeploySession && deployFunction) {
      // Handle deploy action
      if (deployFunction.isValid) {
        setShowDeployConfirmModal(true);
      }
    }
  };

  // Get active session content from the stable tabs - use combinedActiveSessionId instead of objects
  const activeSessionContent = useMemo(() => {
    if (combinedActiveSessionId) {
      // Try terminal tabs first
      const terminalTab = terminalTabsRef.current.get(combinedActiveSessionId);
      if (terminalTab) {
        return terminalTab.content;
      }

      // Try YAML tabs
      const yamlTab = yamlTabsRef.current.get(combinedActiveSessionId);
      if (yamlTab) {
        return yamlTab.content;
      }

      // Try deploy tabs
      const deployTab = deployTabsRef.current.get(combinedActiveSessionId);
      if (deployTab) {
        return deployTab.content;
      }

      // Try log tabs
      const logTab = logTabsRef.current.get(combinedActiveSessionId);
      if (logTab) {
        return logTab.content;
      }
    }
    return null;
  }, [combinedActiveSessionId]); // Only depend on combinedActiveSessionId, not the session objects

  if (
    sessions.length === 0 &&
    yamlSessions.length === 0 &&
    deploySessions.length === 0 &&
    logSessions.length === 0
  ) {
    return null;
  }

  // Determine if the active tab is a YAML or deploy tab with unsaved changes
  const isActiveTabDirty =
    activeYamlSession?.isDirty || activeDeploySession?.isDirty || false;

  // Generate dynamic title based on active session
  const getTitle = () => {
    if (activeDeploySession) {
      return `Editing Deploy an application from ${activeDeploySession.template?.name} Template`;
    }
    if (activeYamlSession) {
      return `Editing ${activeYamlSession.title}`;
    }
    // Check if active session is a log session
    const activeLogSession = logSessions.find(
      (s) => s.id === combinedActiveSessionId,
    );
    if (activeLogSession) {
      return activeLogSession.title;
    }
    return "Sessions";
  };

  const sidebarWidth = measuredSidebarWidth ?? (sidebarCollapsed ? 80 : 270);

  return (
    <>
      <ResizableBottomDrawer
        open={combinedIsDrawerOpen}
        isEdit={isActiveTabDirty}
        onClose={handleClose}
        onSave={handleSave}
        title={getTitle()}
        tabs={tabs}
        activeTabId={combinedActiveSessionId || undefined}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
        showUnsavedChangesModal={isActiveTabDirty}
        leftOffset={sidebarWidth}
      >
        {activeSessionContent}
      </ResizableBottomDrawer>

      <UnsavedChangesModal
        open={showDeployConfirmModal}
        onCancel={() => setShowDeployConfirmModal(false)}
        onConfirm={handleDeployConfirm}
        title={`Deploy ${activeDeploySession?.template?.name}`}
        message={`Are you sure you want to deploy an Application from "${activeDeploySession?.template?.name}" Application Template? This will create a new application instance.`}
        cancelLabel="Cancel"
        confirmLabel="Deploy"
      />
    </>
  );
};

export default GlobalTerminalDrawer;
