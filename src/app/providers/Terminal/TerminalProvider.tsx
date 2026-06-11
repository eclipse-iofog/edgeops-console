import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type TabType = "terminal" | "yaml-editor" | "deploy";

export interface TerminalSession {
  id: string;
  title: string;
  socketUrl: string;
  authToken?: string;
  microserviceUuid: string;
  execId?: string;
  onClose?: () => void;
  isActive: boolean;
  createdAt: number;
  nodeUuid?: string; // For node exec sessions
  waitingForDebugger?: boolean; // Indicates we're waiting for debug microservice
  debuggerStatus?: "waiting" | "starting" | "running" | "error";
}

export interface YamlEditorSession {
  id: string;
  title: string;
  content: string;
  onSave: (content: string) => Promise<void>;
  onClose?: () => void;
  isActive: boolean;
  createdAt: number;
  isDirty: boolean;
}

export interface DeploySession {
  id: string;
  title: string;
  template: any;
  onClose?: () => void;
  isActive: boolean;
  createdAt: number;
  isDirty: boolean;
}

export type GlobalTab = TerminalSession | YamlEditorSession | DeploySession;

interface TerminalContextType {
  sessions: TerminalSession[];
  yamlSessions: YamlEditorSession[];
  deploySessions: DeploySession[];
  activeSessionId: string | null;
  isDrawerOpen: boolean;
  addTerminalSession: (
    session: Omit<TerminalSession, "id" | "isActive" | "createdAt">,
  ) => string;
  addYamlSession: (
    session: Omit<YamlEditorSession, "id" | "isActive" | "createdAt">,
  ) => string;
  addDeploySession: (
    session: Omit<DeploySession, "id" | "isActive" | "createdAt">,
  ) => string;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  closeAllSessions: () => void;
  updateYamlContent: (
    sessionId: string,
    content: string,
    isDirty: boolean,
  ) => void;
  updateDeploySession: (sessionId: string, isDirty: boolean) => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(
  undefined,
);

export const useTerminal = () => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error("useTerminal must be used within a TerminalProvider");
  }
  return context;
};

interface TerminalProviderProps {
  children: ReactNode;
}

export const TerminalProvider: React.FC<TerminalProviderProps> = ({
  children,
}) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [yamlSessions, setYamlSessions] = useState<YamlEditorSession[]>([]);
  const [deploySessions, setDeploySessions] = useState<DeploySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const addTerminalSession = useCallback(
    (sessionData: Omit<TerminalSession, "id" | "isActive" | "createdAt">) => {
      let sessionId: string = "";

      setSessions((prev) => {
        // Check if a session with the same microserviceUuid already exists
        const existingIndex = prev.findIndex(
          (s) => s.microserviceUuid === sessionData.microserviceUuid,
        );

        if (existingIndex >= 0) {
          // Session already exists - just switch to it without updating
          const existingSession = prev[existingIndex];
          sessionId = existingSession.id;
          setActiveSessionId(existingSession.id);
          setIsDrawerOpen(true);
          return prev; // Return unchanged sessions
        } else {
          // Add new session
          const id = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newSession: TerminalSession = {
            ...sessionData,
            id,
            isActive: true,
            createdAt: Date.now(),
          };

          sessionId = id;
          setActiveSessionId(id);
          setIsDrawerOpen(true);
          return [...prev, newSession];
        }
      });

      return sessionId;
    },
    [],
  );

  const addYamlSession = useCallback(
    (sessionData: Omit<YamlEditorSession, "id" | "isActive" | "createdAt">) => {
      const id = `yaml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newSession: YamlEditorSession = {
        ...sessionData,
        id,
        isActive: true,
        createdAt: Date.now(),
      };

      setYamlSessions((prev) => {
        // Check if a session with the same title already exists
        const existingIndex = prev.findIndex(
          (s) => s.title === sessionData.title,
        );

        if (existingIndex >= 0) {
          // Update existing session
          const updated = [...prev];
          updated[existingIndex] = {
            ...newSession,
          };
          return updated;
        } else {
          // Add new session
          return [...prev, newSession];
        }
      });

      setActiveSessionId(id);
      setIsDrawerOpen(true);
      return id;
    },
    [],
  );

  const addDeploySession = useCallback(
    (sessionData: Omit<DeploySession, "id" | "isActive" | "createdAt">) => {
      const id = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newSession: DeploySession = {
        ...sessionData,
        id,
        isActive: true,
        createdAt: Date.now(),
      };

      setDeploySessions((prev) => {
        // Check if a session with the same title already exists
        const existingIndex = prev.findIndex(
          (s) => s.title === sessionData.title,
        );

        if (existingIndex >= 0) {
          // Update existing session
          const updated = [...prev];
          updated[existingIndex] = {
            ...newSession,
            id: prev[existingIndex].id,
          };
          return updated;
        } else {
          // Add new session
          return [...prev, newSession];
        }
      });

      setActiveSessionId(id);
      setIsDrawerOpen(true);
      return id;
    },
    [],
  );

  const removeSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        return filtered;
      });

      setYamlSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        return filtered;
      });

      setDeploySessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        return filtered;
      });

      // If we're removing the active session, switch to another session or close drawer
      if (activeSessionId === sessionId) {
        setSessions((prev) => {
          const remainingTerminalSessions = prev.filter(
            (s) => s.id !== sessionId,
          );
          setYamlSessions((prevYaml) => {
            const remainingYamlSessions = prevYaml.filter(
              (s) => s.id !== sessionId,
            );
            setDeploySessions((prevDeploy) => {
              const remainingDeploySessions = prevDeploy.filter(
                (s) => s.id !== sessionId,
              );
              const allRemainingSessions = [
                ...remainingTerminalSessions,
                ...remainingYamlSessions,
                ...remainingDeploySessions,
              ];

              if (allRemainingSessions.length > 0) {
                setActiveSessionId(allRemainingSessions[0].id);
              } else {
                setActiveSessionId(null);
                setIsDrawerOpen(false);
              }

              return remainingDeploySessions;
            });
            return remainingYamlSessions;
          });
          return remainingTerminalSessions;
        });
      }
    },
    [activeSessionId],
  );

  const setActiveSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsDrawerOpen(true);
  }, []);

  const openDrawer = useCallback(() => {
    if (sessions.length > 0 || yamlSessions.length > 0) {
      setIsDrawerOpen(true);
    }
  }, [sessions.length, yamlSessions.length]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const closeAllSessions = useCallback(() => {
    setSessions([]);
    setYamlSessions([]);
    setDeploySessions([]);
    setActiveSessionId(null);
    setIsDrawerOpen(false);
  }, []);

  const updateYamlContent = useCallback(
    (sessionId: string, content: string, isDirty: boolean) => {
      setYamlSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, content, isDirty } : session,
        ),
      );
    },
    [],
  );

  const updateDeploySession = useCallback(
    (sessionId: string, isDirty: boolean) => {
      setDeploySessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, isDirty } : session,
        ),
      );
    },
    [],
  );

  const value: TerminalContextType = {
    sessions,
    yamlSessions,
    deploySessions,
    activeSessionId,
    isDrawerOpen,
    addTerminalSession,
    addYamlSession,
    addDeploySession,
    removeSession,
    setActiveSession,
    openDrawer,
    closeDrawer,
    closeAllSessions,
    updateYamlContent,
    updateDeploySession,
  };

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
};
