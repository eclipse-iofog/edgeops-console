export const POLL_MODES = {
  FULL: "full",
  LIGHT: "light",
  OFF: "off",
} as const;

export type PollMode = (typeof POLL_MODES)[keyof typeof POLL_MODES];

export type ResourceStoreId =
  | "applicationTemplates"
  | "catalogMicroservices"
  | "registries"
  | "configMaps"
  | "secrets"
  | "volumeMounts"
  | "certificates"
  | "services"
  | "roles"
  | "roleBindings"
  | "serviceAccounts"
  | "natsAccountRules"
  | "natsUserRules"
  | "identityUsers"
  | "identityGroups"
  | "networkTopology";

export type WorkbenchRoute = {
  path: string;
  title: string;
  pollMode: PollMode;
  resourceStoreId?: ResourceStoreId;
  workbenchEligible: boolean;
};

export type SidebarNavGroupDef = {
  id: string;
  label: string;
  childPaths: string[];
  requiresNats?: boolean;
  requiresEmbeddedAuth?: boolean;
};

/** All routable paths — sidebar titles, workbench tabs, and polling metadata. */
export const WORKBENCH_ROUTES: WorkbenchRoute[] = [
  { path: "/dashboard", title: "Overview", pollMode: "full", workbenchEligible: true },
  { path: "/nodes/list", title: "Edgelet List", pollMode: "full", workbenchEligible: true },
  { path: "/nodes/Map", title: "Edgelet Map", pollMode: "full", workbenchEligible: true },
  {
    path: "/nodes/mesh-graph",
    title: "Mesh Graph",
    pollMode: "off",
    resourceStoreId: "networkTopology",
    workbenchEligible: true,
  },
  {
    path: "/Workloads/MicroservicesList",
    title: "Microservices",
    pollMode: "full",
    workbenchEligible: true,
  },
  {
    path: "/Workloads/SystemMicroservicesList",
    title: "System Microservices",
    pollMode: "full",
    workbenchEligible: true,
  },
  {
    path: "/Workloads/ApplicationList",
    title: "Application",
    pollMode: "full",
    workbenchEligible: true,
  },
  {
    path: "/Workloads/SystemApplicationList",
    title: "System Application",
    pollMode: "full",
    workbenchEligible: true,
  },
  {
    path: "/config/AppTemplates",
    title: "App Templates",
    pollMode: "off",
    resourceStoreId: "applicationTemplates",
    workbenchEligible: true,
  },
  {
    path: "/config/CatalogMicroservices",
    title: "Catalog Microservices",
    pollMode: "off",
    resourceStoreId: "catalogMicroservices",
    workbenchEligible: true,
  },
  {
    path: "/config/Registries",
    title: "Registries",
    pollMode: "off",
    resourceStoreId: "registries",
    workbenchEligible: true,
  },
  {
    path: "/config/ConfigMaps",
    title: "Config Maps",
    pollMode: "off",
    resourceStoreId: "configMaps",
    workbenchEligible: true,
  },
  {
    path: "/config/secret",
    title: "Secrets",
    pollMode: "off",
    resourceStoreId: "secrets",
    workbenchEligible: true,
  },
  {
    path: "/config/VolumeMounts",
    title: "Volume Mounts",
    pollMode: "light",
    resourceStoreId: "volumeMounts",
    workbenchEligible: true,
  },
  {
    path: "/config/certificates",
    title: "Certificates",
    pollMode: "off",
    resourceStoreId: "certificates",
    workbenchEligible: true,
  },
  {
    path: "/config/services",
    title: "Services",
    pollMode: "off",
    resourceStoreId: "services",
    workbenchEligible: true,
  },
  {
    path: "/config/pollingSettings",
    title: "Console Config",
    pollMode: "off",
    workbenchEligible: true,
  },
  { path: "/events", title: "Events", pollMode: "off", workbenchEligible: true },
  {
    path: "/access-control/roles",
    title: "Roles",
    pollMode: "off",
    resourceStoreId: "roles",
    workbenchEligible: true,
  },
  {
    path: "/access-control/rolebindings",
    title: "Role Bindings",
    pollMode: "off",
    resourceStoreId: "roleBindings",
    workbenchEligible: true,
  },
  {
    path: "/access-control/serviceaccounts",
    title: "Service Accounts",
    pollMode: "off",
    resourceStoreId: "serviceAccounts",
    workbenchEligible: true,
  },
  {
    path: "/access-control/nats-account-rules",
    title: "NATs Account Rules",
    pollMode: "off",
    resourceStoreId: "natsAccountRules",
    workbenchEligible: true,
  },
  {
    path: "/access-control/nats-user-rules",
    title: "NATs User Rules",
    pollMode: "off",
    resourceStoreId: "natsUserRules",
    workbenchEligible: true,
  },
  {
    path: "/access-control/users",
    title: "Users",
    pollMode: "off",
    resourceStoreId: "identityUsers",
    workbenchEligible: true,
  },
  {
    path: "/access-control/groups",
    title: "Groups",
    pollMode: "off",
    resourceStoreId: "identityGroups",
    workbenchEligible: true,
  },
  {
    path: "/messagebus/operators",
    title: "Operators",
    pollMode: "off",
    workbenchEligible: true,
  },
  {
    path: "/messagebus/accounts",
    title: "Accounts",
    pollMode: "off",
    workbenchEligible: true,
  },
  {
    path: "/messagebus/users",
    title: "Users",
    pollMode: "light",
    workbenchEligible: true,
  },
  { path: "/account", title: "My Account", pollMode: "off", workbenchEligible: true },
  /** Opens in workbench; external swagger link in sidebar footer uses its own hash with auth query. */
  { path: "/api", title: "API", pollMode: "off", workbenchEligible: true },
  {
    path: "/account/force-password-change",
    title: "Change Password",
    pollMode: "off",
    workbenchEligible: false,
  },
  { path: "/login", title: "Login", pollMode: "off", workbenchEligible: false },
  { path: "/login/oauth", title: "Login", pollMode: "off", workbenchEligible: false },
];

const ROUTES_BY_PATH = new Map(
  WORKBENCH_ROUTES.map((route) => [route.path, route]),
);

/** Longest-prefix match (exact match preferred via sort order). */
const ROUTES_BY_PREFIX_LENGTH = [...WORKBENCH_ROUTES].sort(
  (a, b) => b.path.length - a.path.length,
);

export const SIDEBAR_TOP_PATHS = ["/dashboard"] as const;

export const SIDEBAR_NAV_GROUPS: SidebarNavGroupDef[] = [
  {
    id: "nodes",
    label: "Nodes",
    childPaths: ["/nodes/list", "/nodes/Map", "/nodes/mesh-graph"],
  },
  {
    id: "workloads",
    label: "Workloads",
    childPaths: [
      "/Workloads/MicroservicesList",
      "/Workloads/SystemMicroservicesList",
      "/Workloads/ApplicationList",
      "/Workloads/SystemApplicationList",
    ],
  },
  {
    id: "config",
    label: "Config",
    childPaths: [
      "/config/AppTemplates",
      "/config/CatalogMicroservices",
      "/config/Registries",
      "/config/ConfigMaps",
      "/config/secret",
      "/config/VolumeMounts",
      "/config/certificates",
    ],
  },
  {
    id: "network",
    label: "Network",
    childPaths: ["/config/services"],
  },
  {
    id: "messagebus",
    label: "MessageBus",
    childPaths: [
      "/messagebus/operators",
      "/messagebus/accounts",
      "/messagebus/users",
    ],
    requiresNats: true,
  },
  {
    id: "access-control",
    label: "Access Control",
    childPaths: [
      "/access-control/roles",
      "/access-control/rolebindings",
      "/access-control/serviceaccounts",
      "/access-control/nats-account-rules",
      "/access-control/nats-user-rules",
    ],
  },
  {
    id: "iam",
    label: "IAM",
    childPaths: ["/account", "/access-control/users", "/access-control/groups"],
    requiresEmbeddedAuth: true,
  },
];

export const SIDEBAR_BOTTOM_PATHS = ["/events", "/config/pollingSettings"] as const;

export const SIDEBAR_ACCOUNT_STANDALONE_PATH = "/account" as const;

export function getRouteMeta(pathname: string): WorkbenchRoute | undefined {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  for (const route of ROUTES_BY_PREFIX_LENGTH) {
    if (normalized === route.path) {
      return route;
    }
    if (normalized.startsWith(`${route.path}/`)) {
      return route;
    }
  }

  return undefined;
}

export function isWorkbenchEligible(pathname: string): boolean {
  return getRouteMeta(pathname)?.workbenchEligible ?? false;
}

export function getPollMode(pathname: string): PollMode {
  return getRouteMeta(pathname)?.pollMode ?? POLL_MODES.OFF;
}

export function getResourceStoreId(
  pathname: string,
): ResourceStoreId | undefined {
  return getRouteMeta(pathname)?.resourceStoreId;
}

export function getRouteByPath(path: string): WorkbenchRoute | undefined {
  return ROUTES_BY_PATH.get(path);
}

export function getRouteTitle(path: string): string {
  return getRouteByPath(path)?.title ?? path;
}

export function getSidebarGroupPaths(group: SidebarNavGroupDef): string[] {
  return group.childPaths;
}
