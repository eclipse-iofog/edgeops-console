import React, { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { useData } from "@/app/providers";
import { usePollingConfig } from "@/app/providers/PollingConfig/PollingConfigProvider";
import { useWorkbench } from "@/app/providers/Workbench/useWorkbench";
import { useAuth } from "@/auth";
import {
  getPollMode,
  isWorkbenchEligible,
  POLL_MODES,
  type PollMode,
} from "@/config/navigation";
import useRecursiveTimeout from "@/hooks/useInterval";

function resolveActivePath(
  pathname: string,
  getActiveTab: () => { path: string } | undefined,
): string {
  if (isWorkbenchEligible(pathname)) {
    return getActiveTab()?.path ?? pathname;
  }
  return pathname;
}

function runPollForMode(
  mode: PollMode,
  refreshData: () => Promise<void>,
  refreshRuntimeLight: () => Promise<void>,
): void {
  if (mode === POLL_MODES.FULL) {
    void refreshData();
    return;
  }
  if (mode === POLL_MODES.LIGHT) {
    void refreshRuntimeLight();
  }
}

/** Polls runtime data based on the active workbench tab's poll mode. */
export default function RuntimePollingBridge() {
  const { refreshData, refreshRuntimeLight } = useData();
  const { mainPollingInterval } = usePollingConfig();
  const { getActiveTab } = useWorkbench();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = React.useState(() => !document.hidden);
  const previousPathRef = useRef<string | null>(null);

  const getActivePath = useCallback(
    () => resolveActivePath(location.pathname, getActiveTab),
    [location.pathname, getActiveTab],
  );

  const activePath = getActivePath();
  const pollMode = getPollMode(activePath);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const pollCallback = useCallback(async () => {
    if (!isAuthenticated || document.hidden) {
      return;
    }

    const path = resolveActivePath(location.pathname, getActiveTab);
    runPollForMode(getPollMode(path), refreshData, refreshRuntimeLight);
  }, [
    isAuthenticated,
    location.pathname,
    getActiveTab,
    refreshData,
    refreshRuntimeLight,
  ]);

  const pollingDelay =
    isAuthenticated &&
    isVisible &&
    pollMode !== POLL_MODES.OFF
      ? mainPollingInterval
      : null;

  useRecursiveTimeout(pollCallback, pollingDelay);

  useEffect(() => {
    if (!isAuthenticated) {
      previousPathRef.current = null;
      return;
    }

    const mode = getPollMode(activePath);
    if (mode === POLL_MODES.OFF) {
      previousPathRef.current = activePath;
      return;
    }

    if (
      previousPathRef.current !== null &&
      previousPathRef.current !== activePath
    ) {
      runPollForMode(mode, refreshData, refreshRuntimeLight);
    }

    previousPathRef.current = activePath;
  }, [activePath, isAuthenticated, refreshData, refreshRuntimeLight]);

  return null;
}
