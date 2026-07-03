import { useEffect, useSyncExternalStore } from "react";

import { useNetworkTopologyContext } from "@/app/providers/NetworkTopologyProvider";

export function useNetworkTopology() {
  const { store } = useNetworkTopologyContext();

  useEffect(() => {
    store.acquire();
    return () => store.release();
  }, [store]);

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}

export function useNetworkTopologyStore() {
  return useNetworkTopologyContext().store;
}
