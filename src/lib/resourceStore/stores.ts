import type { ResourceStoreId } from "@/config/navigation";

import {
  createListFetcher,
  createResourceStore,
} from "./createResourceStore";
import type { ResourceStore, ResourceStoreDeps, StoreDefinition } from "./types";

export const STORE_DEFINITIONS: StoreDefinition[] = [
  { id: "secrets", endpoint: "/api/v3/secrets", jsonPath: "secrets" },
  { id: "registries", endpoint: "/api/v3/registries", jsonPath: "registries" },
  { id: "configMaps", endpoint: "/api/v3/configmaps", jsonPath: "configMaps" },
  {
    id: "certificates",
    endpoint: "/api/v3/certificates",
    jsonPath: "certificates",
  },
  {
    id: "volumeMounts",
    endpoint: "/api/v3/volumeMounts",
    jsonPath: "",
  },
  { id: "services", endpoint: "/api/v3/services", jsonPath: "" },
  {
    id: "applicationTemplates",
    endpoint: "/api/v3/applicationTemplates",
    jsonPath: "applicationTemplates",
  },
  {
    id: "catalogMicroservices",
    endpoint: "/api/v3/catalog/microservices",
    jsonPath: "catalogItems",
  },
  { id: "roles", endpoint: "/api/v3/roles", jsonPath: "roles" },
  {
    id: "roleBindings",
    endpoint: "/api/v3/rolebindings",
    jsonPath: "bindings",
  },
  {
    id: "serviceAccounts",
    endpoint: "/api/v3/serviceaccounts",
    jsonPath: "serviceAccounts",
  },
  {
    id: "natsAccountRules",
    endpoint: "/api/v3/nats/account-rules",
    jsonPath: "rules",
  },
  {
    id: "natsUserRules",
    endpoint: "/api/v3/nats/user-rules",
    jsonPath: "rules",
  },
  { id: "identityUsers", endpoint: "/api/v3/users", jsonPath: "" },
  { id: "identityGroups", endpoint: "/api/v3/groups", jsonPath: "" },
];

export type ResourceStoreMap = Record<ResourceStoreId, ResourceStore>;

export function createResourceStores(deps: ResourceStoreDeps): ResourceStoreMap {
  const { request, pushFeedback, getListPollingInterval } = deps;

  const stores = {} as ResourceStoreMap;

  for (const definition of STORE_DEFINITIONS) {
    const fetchItems = createListFetcher(
      request,
      definition.endpoint,
      definition.jsonPath,
      pushFeedback,
    );

    stores[definition.id] = createResourceStore({
      ...definition,
      fetchItems,
      getListPollingInterval,
    });
  }

  return stores;
}
