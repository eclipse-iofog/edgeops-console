import React, { useRef, useEffect, useState } from "react";
import ExecSessionTerminal from "./ExecSessionTerminal";

interface StableTerminalTabProps {
  sessionId: string;
  socketUrl: string;
  authToken?: string;
  microserviceUuid: string;
  execId?: string;
  nodeUuid?: string;
  waitingForDebugger?: boolean;
  onClose: () => void;
}

const StableTerminalTab: React.FC<StableTerminalTabProps> = ({
  sessionId,
  socketUrl,
  authToken,
  microserviceUuid,
  execId,
  nodeUuid,
  waitingForDebugger,
  onClose,
}) => {
  const [isReady, setIsReady] = useState(false);
  const hasInitializedRef = useRef(false);

  // Initialize only once when component mounts
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        setIsReady(true);
      }, 100);
    } else {
    }
  }, []); // Empty dependency array to ensure this only runs once

  // Add cleanup effect to track unmounting
  useEffect(() => {
    return () => {};
  }, [sessionId]);

  if (!isReady) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d1117",
        }}
      >
        <div className="text-gray-400">Starting terminal session...</div>
      </div>
    );
  }

  return (
    <ExecSessionTerminal
      socketUrl={socketUrl}
      authToken={authToken}
      microserviceUuid={microserviceUuid}
      execId={execId}
      nodeUuid={nodeUuid}
      waitingForDebugger={waitingForDebugger}
      className="h-full w-full"
      onClose={onClose}
    />
  );
};

// Use a more strict memo comparison
export default React.memo(StableTerminalTab, (prevProps, nextProps) => {
  // Only re-render if the session ID changes (which should never happen)
  return prevProps.sessionId === nextProps.sessionId;
});
