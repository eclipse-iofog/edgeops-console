import React, { createContext, useContext } from "react";

const TerminalTabVisibilityContext = createContext<string | null | undefined>(
  undefined,
);

export function TerminalTabVisibilityProvider({
  activeTabId,
  children,
}: {
  activeTabId?: string | null;
  children: React.ReactNode;
}) {
  return (
    <TerminalTabVisibilityContext.Provider value={activeTabId ?? null}>
      {children}
    </TerminalTabVisibilityContext.Provider>
  );
}

/** Shell tabs stay mounted. Only the visible one publishes its grid to the PTY. */
export function useTerminalTabActive(sessionId: string): boolean {
  const activeTabId = useContext(TerminalTabVisibilityContext);
  if (activeTabId === undefined) {
    return true;
  }
  return activeTabId === sessionId;
}
