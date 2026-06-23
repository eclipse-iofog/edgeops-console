import { useState, useEffect, useRef } from "react";
import { useData } from "@/app/providers";
import { findDebugMicroservice } from "./findDebugMicroservice";

export { findDebugMicroservice };

type DebuggerStatus = "waiting" | "starting" | "running" | "error";

interface UseDebuggerStatusResult {
  debugUuid: string | null;
  status: DebuggerStatus;
}

export const useDebuggerStatus = (
  nodeUuid: string | undefined,
  enabled: boolean = true,
  agentName?: string,
  maxAttempts: number = 60,
): UseDebuggerStatusResult => {
  const { data } = useData();
  const [debugUuid, setDebugUuid] = useState<string | null>(null);
  const [status, setStatus] = useState<DebuggerStatus>("waiting");
  const attemptsRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef<DebuggerStatus>("waiting");
  const dataRef = useRef(data);
  const agentNameRef = useRef(agentName);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    agentNameRef.current = agentName;
  }, [agentName]);

  useEffect(() => {
    if (!enabled || !nodeUuid) {
      setDebugUuid(null);
      setStatus("waiting");
      statusRef.current = "waiting";
      attemptsRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    setDebugUuid(null);
    setStatus("waiting");
    statusRef.current = "waiting";
    attemptsRef.current = 0;

    const resolveAgentName = (): string | undefined =>
      agentNameRef.current ??
      dataRef.current?.reducedAgents?.byUUID?.[nodeUuid]?.name;

    const checkDebugMicroservice = () => {
      attemptsRef.current += 1;

      const systemApps = dataRef.current?.systemApplications || [];
      const resolvedAgentName = resolveAgentName();

      if (!resolvedAgentName) {
        if (attemptsRef.current >= maxAttempts) {
          setStatus("error");
          statusRef.current = "error";
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
        return;
      }

      const foundUuid = findDebugMicroservice(
        nodeUuid,
        resolvedAgentName,
        systemApps,
      );

      if (foundUuid) {
        for (const app of systemApps) {
          const microservices = app.microservices || [];
          for (const ms of microservices) {
            if (
              ms.uuid === foundUuid &&
              ms.status?.status?.toLowerCase() === "running"
            ) {
              setDebugUuid(foundUuid);
              setStatus("running");
              statusRef.current = "running";
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              return;
            }
          }
        }

        if (statusRef.current !== "starting") {
          setStatus("starting");
          statusRef.current = "starting";
        }
      }

      if (attemptsRef.current >= maxAttempts) {
        setStatus("error");
        statusRef.current = "error";
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    checkDebugMicroservice();
    intervalRef.current = setInterval(checkDebugMicroservice, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [nodeUuid, enabled, agentName, maxAttempts]);

  return { debugUuid, status };
};
