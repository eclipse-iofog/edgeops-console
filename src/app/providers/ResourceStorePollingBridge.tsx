import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { useController } from "@/app/providers";
import { useNetworkTopologyContext } from "@/app/providers/NetworkTopologyProvider";
import { useResourceStoreContext } from "@/app/providers/ResourceStoreProvider";
import { useWorkbench } from "@/app/providers/Workbench/useWorkbench";
import {
  getResourceStoreId,
  isWorkbenchEligible,
  type ResourceStoreId,
} from "@/config/navigation";
import { STORE_DEFINITIONS } from "@/lib/resourceStore/stores";

function resolveActiveStoreId(
  pathname: string,
  getActiveTab: () => { path: string } | undefined,
): ResourceStoreId | undefined {
  if (isWorkbenchEligible(pathname)) {
    const activePath = getActiveTab()?.path ?? pathname;
    return getResourceStoreId(activePath);
  }
  return getResourceStoreId(pathname);
}

/** Enables list polling for the resource store tied to the active workbench tab. */
export default function ResourceStorePollingBridge() {
  const { stores } = useResourceStoreContext();
  const { store: topologyStore } = useNetworkTopologyContext();
  const { isControllerHealthy } = useController();
  const { getActiveTab } = useWorkbench();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(() => !document.hidden);
  const wasControllerHealthyRef = useRef(isControllerHealthy);

  const activeStoreId = resolveActiveStoreId(location.pathname, getActiveTab);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const canPoll = isVisible && isControllerHealthy;
    const shouldPollTopology = canPoll && activeStoreId === "networkTopology";

    topologyStore.setPollingActive(shouldPollTopology);

    for (const definition of STORE_DEFINITIONS) {
      const shouldPoll = canPoll && definition.id === activeStoreId;
      stores[definition.id].setPollingActive(shouldPoll);
    }
  }, [activeStoreId, isVisible, isControllerHealthy, stores, topologyStore]);

  useEffect(() => {
    if (
      isControllerHealthy &&
      !wasControllerHealthyRef.current &&
      activeStoreId
    ) {
      if (activeStoreId === "networkTopology") {
        void topologyStore.refreshActiveLayers();
      } else {
        void stores[activeStoreId].fetch({ silent: true });
      }
    }
    wasControllerHealthyRef.current = isControllerHealthy;
  }, [isControllerHealthy, activeStoreId, stores, topologyStore]);

  return null;
}
