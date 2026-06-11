import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { LogTailConfig } from "@/components/ui/LogConfigModal";

export type LogSourceType = "node" | "microservice" | "system-microservice";

export interface LogSession {
  id: string;
  title: string;
  socketUrl: string;
  authToken?: string;
  resourceUuid: string;
  resourceName: string;
  sourceType: LogSourceType;
  tailConfig: LogTailConfig;
  logs: string[];
  onClose?: () => void;
  isActive: boolean;
  createdAt: number;
}

interface LogViewerContextType {
  sessions: LogSession[];
  activeSessionId: string | null;
  isDrawerOpen: boolean;
  addLogSession: (
    session: Omit<LogSession, "id" | "isActive" | "createdAt" | "logs">,
  ) => string;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  closeAllSessions: () => void;
  updateLogs: (sessionId: string, logs: string[]) => void;
  appendLog: (sessionId: string, logLine: string) => void;
}

const LogViewerContext = createContext<LogViewerContextType | undefined>(
  undefined,
);

export const useLogViewer = () => {
  const context = useContext(LogViewerContext);
  if (!context) {
    throw new Error("useLogViewer must be used within a LogViewerProvider");
  }
  return context;
};

interface LogViewerProviderProps {
  children: ReactNode;
}

export const LogViewerProvider: React.FC<LogViewerProviderProps> = ({
  children,
}) => {
  const [sessions, setSessions] = useState<LogSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const addLogSession = useCallback(
    (
      sessionData: Omit<LogSession, "id" | "isActive" | "createdAt" | "logs">,
    ) => {
      let sessionId: string = "";

      setSessions((prev) => {
        // Check if a session with the same resourceUuid and sourceType already exists
        const existingIndex = prev.findIndex(
          (s) =>
            s.resourceUuid === sessionData.resourceUuid &&
            s.sourceType === sessionData.sourceType,
        );

        if (existingIndex >= 0) {
          // Session already exists - just switch to it and update config
          const existingSession = prev[existingIndex];
          sessionId = existingSession.id;
          setActiveSessionId(existingSession.id);
          setIsDrawerOpen(true);

          // Update the existing session with new config
          const updated = [...prev];
          updated[existingIndex] = {
            ...existingSession,
            ...sessionData,
            logs: existingSession.logs, // Keep existing logs
          };
          return updated;
        } else {
          // Add new session
          const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newSession: LogSession = {
            ...sessionData,
            id,
            isActive: true,
            createdAt: Date.now(),
            logs: [],
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

  const removeSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        return filtered;
      });

      // If we're removing the active session, switch to another session or close drawer
      if (activeSessionId === sessionId) {
        setSessions((prev) => {
          const remainingSessions = prev.filter((s) => s.id !== sessionId);

          if (remainingSessions.length > 0) {
            setActiveSessionId(remainingSessions[0].id);
          } else {
            setActiveSessionId(null);
            setIsDrawerOpen(false);
          }

          return remainingSessions;
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
    if (sessions.length > 0) {
      setIsDrawerOpen(true);
    }
  }, [sessions.length]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const closeAllSessions = useCallback(() => {
    setSessions([]);
    setActiveSessionId(null);
    setIsDrawerOpen(false);
  }, []);

  const updateLogs = useCallback((sessionId: string, logs: string[]) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, logs } : session,
      ),
    );
  }, []);

  const appendLog = useCallback((sessionId: string, logLine: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, logs: [...session.logs, logLine] }
          : session,
      ),
    );
  }, []);

  const value: LogViewerContextType = {
    sessions,
    activeSessionId,
    isDrawerOpen,
    addLogSession,
    removeSession,
    setActiveSession,
    openDrawer,
    closeDrawer,
    closeAllSessions,
    updateLogs,
    appendLog,
  };

  return (
    <LogViewerContext.Provider value={value}>
      {children}
    </LogViewerContext.Provider>
  );
};
