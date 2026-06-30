import { useEffect, useSyncExternalStore } from "react";

import type { ResourceStoreId } from "@/config/navigation";

import { useResourceStoreContext } from "@/app/providers/ResourceStoreProvider";
import type { ResourceSnapshot } from "./types";

export function useResourceList<T = unknown>(
  storeId: ResourceStoreId,
): ResourceSnapshot<T> {
  const { stores } = useResourceStoreContext();
  const store = stores[storeId];

  useEffect(() => {
    store.acquire();
    return () => store.release();
  }, [store]);

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot as () => ResourceSnapshot<T>,
    store.getSnapshot as () => ResourceSnapshot<T>,
  );
}

export function useResourceStore(storeId: ResourceStoreId) {
  const { stores } = useResourceStoreContext();
  return stores[storeId];
}
