import {
  fetchTopologyConnections,
  fetchTopologyNodes,
  fetchTopologySummary,
} from "./api";
import type { ResponseLike } from "@/lib/resourceStore/types";

import type {
  NetworkTopologySnapshot,
  TopologyLayer,
  TopologyLayerSnapshot,
} from "./types";

const emptyLayer = (): TopologyLayerSnapshot => ({
  nodes: [],
  connections: [],
  loading: false,
  refreshing: false,
  error: null,
  loaded: false,
  loadProgress: null,
});

const INITIAL_SNAPSHOT: NetworkTopologySnapshot = {
  summary: null,
  summaryLoading: false,
  summaryError: null,
  router: emptyLayer(),
  nats: emptyLayer(),
};

type StoreDeps = {
  request: (path: string, options?: RequestInit) => Promise<ResponseLike | null>;
};

export type NetworkTopologyStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => NetworkTopologySnapshot;
  acquire: () => void;
  release: () => void;
  setPollingActive: (active: boolean) => void;
  fetchSummary: (options?: { silent?: boolean }) => Promise<void>;
  fetchLayer: (layer: TopologyLayer, options?: { silent?: boolean }) => Promise<void>;
  refreshActiveLayers: () => Promise<void>;
};

export function createNetworkTopologyStore(deps: StoreDeps): NetworkTopologyStore {
  let snapshot = INITIAL_SNAPSHOT;
  const listeners = new Set<() => void>();
  let subscriberCount = 0;
  let pollingActive = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  const loadedLayers = new Set<TopologyLayer>();
  let summaryLoaded = false;
  const layerFetchInFlight: Partial<Record<TopologyLayer, Promise<void>>> = {};

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const setSnapshot = (next: NetworkTopologySnapshot) => {
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
    pollTimer = setTimeout(async () => {
      pollTimer = null;
      if (!pollingActive || subscriberCount === 0 || document.hidden) {
        return;
      }
      await refreshActiveLayers();
      schedulePoll();
    }, 60_000);
  };

  const updatePolling = () => {
    if (pollingActive && subscriberCount > 0 && !document.hidden) {
      schedulePoll();
    } else {
      clearPollTimer();
    }
  };

  const fetchSummary = async (options: { silent?: boolean } = {}) => {
    const silent = options.silent ?? false;
    if (!silent && !summaryLoaded) {
      setSnapshot({ ...snapshot, summaryLoading: true, summaryError: null });
    }

    try {
      const summary = await fetchTopologySummary(deps.request);
      summaryLoaded = true;
      setSnapshot({
        ...snapshot,
        summary,
        summaryLoading: false,
        summaryError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch topology summary";
      setSnapshot({
        ...snapshot,
        summaryLoading: false,
        summaryError: message,
      });
    }
  };

  const fetchLayer = async (
    layer: TopologyLayer,
    options: { silent?: boolean } = {},
  ) => {
    if (layerFetchInFlight[layer]) {
      return layerFetchInFlight[layer];
    }

    const silent = options.silent ?? false;
    const currentLayer = snapshot[layer];

    if (!silent && !currentLayer.loaded) {
      setSnapshot({
        ...snapshot,
        [layer]: {
          ...currentLayer,
          loading: true,
          error: null,
          loadProgress: { nodes: 0, connections: 0, nodesTotal: 0, connectionsTotal: 0 },
        },
      });
    } else if (silent) {
      setSnapshot({
        ...snapshot,
        [layer]: { ...currentLayer, refreshing: true, error: null },
      });
    }

    layerFetchInFlight[layer] = (async () => {
      try {
        let nodesTotal = 0;
        let connectionsTotal = 0;

        const nodes = await fetchTopologyNodes(
          deps.request,
          layer,
          (loaded, total) => {
            nodesTotal = total;
            setSnapshot({
              ...snapshot,
              [layer]: {
                ...snapshot[layer],
                loadProgress: {
                  nodes: loaded,
                  connections: snapshot[layer].loadProgress?.connections ?? 0,
                  nodesTotal: total,
                  connectionsTotal:
                    snapshot[layer].loadProgress?.connectionsTotal ?? 0,
                },
              },
            });
          },
        );

        const connections = await fetchTopologyConnections(
          deps.request,
          layer,
          (loaded, total) => {
            connectionsTotal = total;
            setSnapshot({
              ...snapshot,
              [layer]: {
                ...snapshot[layer],
                loadProgress: {
                  nodes: nodes.length,
                  connections: loaded,
                  nodesTotal: nodesTotal || nodes.length,
                  connectionsTotal: total,
                },
              },
            });
          },
        );

        loadedLayers.add(layer);
        setSnapshot({
          ...snapshot,
          [layer]: {
            nodes,
            connections,
            loading: false,
            refreshing: false,
            error: null,
            loaded: true,
            loadProgress: null,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Failed to fetch ${layer} topology`;
        setSnapshot({
          ...snapshot,
          [layer]: {
            ...snapshot[layer],
            loading: false,
            refreshing: false,
            error: message,
            loadProgress: null,
          },
        });
      } finally {
        delete layerFetchInFlight[layer];
      }
    })();

    return layerFetchInFlight[layer];
  };

  const refreshActiveLayers = async () => {
    const tasks: Promise<void>[] = [];
    if (loadedLayers.has("router")) {
      tasks.push(fetchLayer("router", { silent: true }));
    }
    if (loadedLayers.has("nats")) {
      tasks.push(fetchLayer("nats", { silent: true }));
    }
    if (summaryLoaded) {
      tasks.push(fetchSummary({ silent: true }));
    }
    await Promise.all(tasks);
  };

  const acquire = () => {
    const wasZero = subscriberCount === 0;
    subscriberCount += 1;
    if (wasZero) {
      void fetchSummary({ silent: summaryLoaded });
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
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    acquire,
    release,
    setPollingActive,
    fetchSummary,
    fetchLayer,
    refreshActiveLayers,
  };
}
