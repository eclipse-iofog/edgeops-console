import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { useController } from "@/app/providers";
import { usePollingConfig } from "@/app/providers/PollingConfig/PollingConfigProvider";
import { useFeedback } from "@/app/providers/feedback";
import { createResourceStores, type ResourceStoreMap } from "@/lib/resourceStore/stores";

type ResourceStoreContextValue = {
  stores: ResourceStoreMap;
};

const ResourceStoreContext = createContext<ResourceStoreContextValue | undefined>(
  undefined,
);

export function useResourceStoreContext(): ResourceStoreContextValue {
  const context = useContext(ResourceStoreContext);
  if (!context) {
    throw new Error(
      "useResourceStoreContext must be used within ResourceStoreProvider",
    );
  }
  return context;
}

type ResourceStoreProviderProps = {
  children: ReactNode;
};

export function ResourceStoreProvider({ children }: ResourceStoreProviderProps) {
  const { request } = useController();
  const { pushFeedback } = useFeedback();
  const { getListPollingInterval } = usePollingConfig();
  const getListPollingIntervalRef = useRef(getListPollingInterval);
  getListPollingIntervalRef.current = getListPollingInterval;

  const stores = useMemo(
    () =>
      createResourceStores({
        request,
        pushFeedback,
        getListPollingInterval: () => getListPollingIntervalRef.current(),
      }),
    [request, pushFeedback],
  );

  const value = useMemo(() => ({ stores }), [stores]);

  return (
    <ResourceStoreContext.Provider value={value}>
      {children}
    </ResourceStoreContext.Provider>
  );
}

export { ResourceStoreContext };
