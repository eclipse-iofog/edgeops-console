import { useState, useEffect, useRef } from "react";
import { useData } from "@/app/providers";

type DebuggerStatus = "waiting" | "starting" | "running" | "error";

interface UseDebuggerStatusResult {
  debugUuid: string | null;
  status: DebuggerStatus;
}

const findDebugMicroservice = (
  nodeUuid: string,
  systemApplications: any[],
): string | null => {
  const debugName = `debug-${nodeUuid}`;

  // Search in system applications for debug microservice
  for (const app of systemApplications) {
    const microservices = app.microservices || [];
    for (const ms of microservices) {
      if (ms.name === debugName) {
        return ms.uuid;
      }
    }
  }
  return null;
};

export const useDebuggerStatus = (
  nodeUuid: string | undefined,
  enabled: boolean = true,
  maxAttempts: number = 60,
): UseDebuggerStatusResult => {
  const { data } = useData();
  const [debugUuid, setDebugUuid] = useState<string | null>(null);
  const [status, setStatus] = useState<DebuggerStatus>("waiting");
  const attemptsRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef<DebuggerStatus>("waiting");
  // Use a ref to always access the latest data
  const dataRef = useRef(data);

  // Update dataRef whenever data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

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

    // Reset state when starting
    setDebugUuid(null);
    setStatus("waiting");
    statusRef.current = "waiting";
    attemptsRef.current = 0;

    const checkDebugMicroservice = () => {
      attemptsRef.current += 1;

      // Access latest data via ref - always gets the most current value
      const systemApps = dataRef.current?.systemApplications || [];
      const foundUuid = findDebugMicroservice(nodeUuid, systemApps);

      if (foundUuid) {
        // Check if the debug microservice is running
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

        // Found but not running yet
        if (statusRef.current !== "starting") {
          setStatus("starting");
          statusRef.current = "starting";
        }
      }

      // Check if we've exceeded max attempts
      if (attemptsRef.current >= maxAttempts) {
        setStatus("error");
        statusRef.current = "error";
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
    };

    // Initial check
    checkDebugMicroservice();

    // Poll every 2 seconds
    intervalRef.current = setInterval(checkDebugMicroservice, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Remove 'status' and 'data?.systemApplications' from dependencies
    // The interval callback will capture the latest data via closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeUuid, enabled, maxAttempts]);

  return { debugUuid, status };
};
