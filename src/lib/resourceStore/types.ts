import type { ResourceStoreId } from "@/config/navigation";

export type ResourceSnapshot<T = unknown> = {
  items: T[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export type FetchOptions = {
  silent?: boolean;
};

export type ResourceStore<T = unknown> = {
  id: ResourceStoreId;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ResourceSnapshot<T>;
  acquire: () => void;
  release: () => void;
  fetch: (options?: FetchOptions) => Promise<void>;
  setPollingActive: (active: boolean) => void;
};

export type ResourceStoreDeps = {
  request: (path: string, options?: RequestInit) => Promise<ResponseLike>;
  pushFeedback: (feedback: {
    message: string;
    type: "success" | "error" | "info" | "warning";
  }) => void;
  getListPollingInterval: () => number;
};

export type ResponseLike = {
  ok: boolean;
  message?: string;
  json: () => Promise<unknown>;
};

export type StoreDefinition = {
  id: ResourceStoreId;
  endpoint: string;
  jsonPath: string;
};
