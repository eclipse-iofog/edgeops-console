import type {
  FetchOptions,
  ResourceSnapshot,
  ResourceStore,
  ResponseLike,
  StoreDefinition,
} from "./types";

const EMPTY_SNAPSHOT: ResourceSnapshot<unknown> = {
  items: [],
  loading: false,
  refreshing: false,
  error: null,
};

type CreateResourceStoreParams<T> = StoreDefinition & {
  fetchItems: () => Promise<T[]>;
  getListPollingInterval: () => number;
};

function getValueAtPath(data: unknown, path: string): unknown {
  if (!path) {
    return data;
  }
  const parts = path.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function createListFetcher<T>(
  request: (path: string, options?: RequestInit) => Promise<ResponseLike>,
  endpoint: string,
  jsonPath: string,
  pushFeedback: (feedback: { message: string; type: "error" }) => void,
): () => Promise<T[]> {
  return async () => {
    const response = await request(endpoint);
    if (!response || !response.ok) {
      pushFeedback({
        message: response?.message ?? `Failed to fetch ${endpoint}`,
        type: "error",
      });
      throw new Error(response?.message ?? `Failed to fetch ${endpoint}`);
    }
    const data = await response.json();
    const items = getValueAtPath(data, jsonPath);
    if (Array.isArray(items)) {
      return items as T[];
    }
    if (Array.isArray(data)) {
      return data as T[];
    }
    return [];
  };
}

export function createResourceStore<T>(
  params: CreateResourceStoreParams<T>,
): ResourceStore<T> {
  let snapshot: ResourceSnapshot<T> = { ...EMPTY_SNAPSHOT, items: [] as T[] };
  const listeners = new Set<() => void>();
  let subscriberCount = 0;
  let pollingActive = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let fetchInFlight: Promise<void> | null = null;

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const setSnapshot = (next: ResourceSnapshot<T>) => {
    snapshot = next;
    emit();
  };

  const clearPollTimer = () => {
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  };

  const schedulePoll = () => {
    clearPollTimer();
    if (!pollingActive || subscriberCount === 0 || document.hidden) {
      return;
    }

    const interval = params.getListPollingInterval();
    pollTimer = setTimeout(async () => {
      pollTimer = null;
      if (!pollingActive || subscriberCount === 0 || document.hidden) {
        return;
      }
      try {
        await fetch({ silent: true });
      } catch {
        // fetch already reports feedback
      }
      schedulePoll();
    }, interval);
  };

  const updatePolling = () => {
    if (pollingActive && subscriberCount > 0 && !document.hidden) {
      schedulePoll();
    } else {
      clearPollTimer();
    }
  };

  const fetch = async (options: FetchOptions = {}): Promise<void> => {
    const silent = options.silent ?? false;

    if (fetchInFlight) {
      return fetchInFlight;
    }

    fetchInFlight = (async () => {
      if (!silent && snapshot.items.length === 0) {
        setSnapshot({ ...snapshot, loading: true, error: null });
      } else if (silent) {
        setSnapshot({ ...snapshot, refreshing: true, error: null });
      }

      try {
        const items = await params.fetchItems();
        setSnapshot({
          items,
          loading: false,
          refreshing: false,
          error: null,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch resource list";
        setSnapshot({
          ...snapshot,
          loading: false,
          refreshing: false,
          error: message,
        });
      } finally {
        fetchInFlight = null;
      }
    })();

    return fetchInFlight;
  };

  const acquire = () => {
    const wasZero = subscriberCount === 0;
    subscriberCount += 1;

    if (wasZero) {
      void fetch({ silent: snapshot.items.length > 0 });
      updatePolling();
    }
  };

  const release = () => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    updatePolling();
  };

  const setPollingActive = (active: boolean) => {
    if (pollingActive === active) {
      return;
    }
    pollingActive = active;
    updatePolling();
  };

  return {
    id: params.id,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    acquire,
    release,
    fetch,
    setPollingActive,
  };
}
