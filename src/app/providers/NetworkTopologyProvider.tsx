import React, { createContext, useContext, useMemo, type ReactNode } from "react";

import { useController } from "@/app/providers";
import {
  createNetworkTopologyStore,
  type NetworkTopologyStore,
} from "@/lib/networkTopology/store";

type NetworkTopologyContextValue = {
  store: NetworkTopologyStore;
};

const NetworkTopologyContext = createContext<
  NetworkTopologyContextValue | undefined
>(undefined);

export function useNetworkTopologyContext(): NetworkTopologyContextValue {
  const context = useContext(NetworkTopologyContext);
  if (!context) {
    throw new Error(
      "useNetworkTopologyContext must be used within NetworkTopologyProvider",
    );
  }
  return context;
}

type NetworkTopologyProviderProps = {
  children: ReactNode;
};

export function NetworkTopologyProvider({
  children,
}: NetworkTopologyProviderProps) {
  const { request } = useController();

  const store = useMemo(
    () => createNetworkTopologyStore({ request }),
    [request],
  );

  const value = useMemo(() => ({ store }), [store]);

  return (
    <NetworkTopologyContext.Provider value={value}>
      {children}
    </NetworkTopologyContext.Provider>
  );
}

export { NetworkTopologyContext };
