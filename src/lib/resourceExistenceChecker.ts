import { ResourceKind, getResourceIdentifier } from "@/lib/yaml/unifiedYamlParser";

export type ResourceExistenceCache = Map<string, Map<string, boolean>>;

/**
 * Fetch all existing resources for a specific kind
 */
export async function fetchExistingResources(
  kind: ResourceKind,
  request: (path: string, options?: any) => Promise<any>,
): Promise<any[]> {
  try {
    switch (kind) {
      case "Service": {
        const response = await request("/api/v3/services");
        if (response?.ok) {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        }
        return [];
      }
      case "Secret": {
        const response = await request("/api/v3/secrets");
        if (response?.ok) {
          const data = await response.json();
          const secrets = data.secrets || data;
          return Array.isArray(secrets) ? secrets : [];
        }
        return [];
      }
      case "ConfigMap": {
        const response = await request("/api/v3/configmaps");
        if (response?.ok) {
          const data = await response.json();
          const configMaps = data.configMaps || data;
          return Array.isArray(configMaps) ? configMaps : [];
        }
        return [];
      }
      case "Certificate":
      case "CertificateAuthority": {
        const response = await request("/api/v3/certificates");
        if (response?.ok) {
          const data = await response.json();
          const certificates = data.certificates || data;
          return Array.isArray(certificates) ? certificates : [];
        }
        return [];
      }
      case "Registry": {
        const response = await request("/api/v3/registries");
        if (response?.ok) {
          const data = await response.json();
          const registries = data.registries || data;
          return Array.isArray(registries) ? registries : [];
        }
        return [];
      }
      case "VolumeMount": {
        const response = await request("/api/v3/volumeMounts");
        if (response?.ok) {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        }
        return [];
      }
      case "CatalogItem": {
        const response = await request("/api/v3/catalog/microservices");
        if (response?.ok) {
          const data = await response.json();
          const catalogItems = data.catalogItems || data;
          return Array.isArray(catalogItems) ? catalogItems : [];
        }
        return [];
      }
      case "ApplicationTemplate": {
        const response = await request("/api/v3/catalog/templates");
        if (response?.ok) {
          const data = await response.json();
          const templates = data.applicationTemplates || data.templates || data;
          return Array.isArray(templates) ? templates : [];
        }
        return [];
      }
      case "Application": {
        const response = await request("/api/v3/application");
        if (response?.ok) {
          const data = await response.json();
          const applications = data.applications || data;
          return Array.isArray(applications) ? applications : [];
        }
        return [];
      }
      case "Microservice": {
        const response = await request("/api/v3/microservices");
        if (response?.ok) {
          const data = await response.json();
          const microservices = data.microservices || data;
          return Array.isArray(microservices) ? microservices : [];
        }
        return [];
      }
      case "Agent": {
        const response = await request("/api/v3/iofog-list");
        if (response?.ok) {
          const data = await response.json();
          const fogs = data.fogs || data;
          return Array.isArray(fogs) ? fogs : [];
        }
        return [];
      }
      case "Role": {
        const response = await request("/api/v3/roles");
        if (response?.ok) {
          const data = await response.json();
          const roles = data.roles || data;
          return Array.isArray(roles) ? roles : [];
        }
        return [];
      }
      case "RoleBinding": {
        const response = await request("/api/v3/rolebindings");
        if (response?.ok) {
          const data = await response.json();
          const bindings = data.bindings || data;
          return Array.isArray(bindings) ? bindings : [];
        }
        return [];
      }
      case "ServiceAccount": {
        const response = await request("/api/v3/serviceaccounts");
        if (response?.ok) {
          const data = await response.json();
          const serviceAccounts = data.serviceAccounts || data;
          return Array.isArray(serviceAccounts) ? serviceAccounts : [];
        }
        return [];
      }
      case "NatsAccountRule": {
        const response = await request("/api/v3/nats/account-rules");
        if (response?.ok) {
          const data = await response.json();
          const rules = data.rules || data;
          return Array.isArray(rules) ? rules : [];
        }
        return [];
      }
      case "NatsUserRule": {
        const response = await request("/api/v3/nats/user-rules");
        if (response?.ok) {
          const data = await response.json();
          const rules = data.rules || data;
          return Array.isArray(rules) ? rules : [];
        }
        return [];
      }
      default:
        return [];
    }
  } catch (error) {
    console.error(`Error fetching existing ${kind} resources:`, error);
    return [];
  }
}

/**
 * Check if a resource exists by comparing identifier with existing resources
 */
function resourceExists(
  kind: ResourceKind,
  identifier: string,
  existingResources: any[],
): boolean {
  if (!identifier) {
    return false;
  }

  switch (kind) {
    case "Service":
    case "Secret":
    case "ConfigMap":
    case "Certificate":
    case "CertificateAuthority":
    case "CatalogItem":
    case "ApplicationTemplate":
    case "Application":
    case "VolumeMount":
    case "Role":
    case "RoleBinding":
    case "ServiceAccount":
      // Identifier is "applicationName/name"
      return existingResources.some(
        (r) =>
          r.name === identifier ||
          (r.applicationName &&
            r.name &&
            `${r.applicationName}/${r.name}` === identifier),
      );
    case "NatsAccountRule":
    case "NatsUserRule":
      return existingResources.some((r) => r.name === identifier);
    case "Registry":
      return existingResources.some(
        (r) => r.url === identifier || r.id?.toString() === identifier,
      );
    case "Microservice":
      return existingResources.some(
        (r) => r.name === identifier || r.uuid === identifier,
      );
    case "Agent":
      return existingResources.some(
        (r) => r.name === identifier || r.uuid === identifier,
      );
    default:
      return false;
  }
}

/**
 * Check if a specific resource exists
 */
export async function checkResourceExists(
  kind: ResourceKind,
  parsedResource: any,
  originalDoc: any,
  request: (path: string, options?: any) => Promise<any>,
  cache?: ResourceExistenceCache,
): Promise<boolean> {
  const identifier = getResourceIdentifier(kind, parsedResource, originalDoc);
  if (!identifier) {
    return false;
  }

  // Check cache first
  if (cache) {
    const kindCache = cache.get(kind);
    if (kindCache && kindCache.has(identifier)) {
      return kindCache.get(identifier) || false;
    }
  }

  // Fetch existing resources if not in cache
  const existingResources = await fetchExistingResources(kind, request);
  const exists = resourceExists(kind, identifier, existingResources);

  // Update cache
  if (cache) {
    if (!cache.has(kind)) {
      cache.set(kind, new Map());
    }
    const kindCache = cache.get(kind);
    if (kindCache) {
      kindCache.set(identifier, exists);
    }
  }

  return exists;
}

/**
 * Get the API endpoint for a resource based on kind, identifier, and existence
 */
export function getResourceEndpoint(
  kind: ResourceKind,
  identifier: string,
  exists: boolean,
): string {
  switch (kind) {
    case "Service":
      return exists ? `/api/v3/services/${identifier}` : `/api/v3/services`;
    case "Secret":
      return exists ? `/api/v3/secrets/${identifier}` : `/api/v3/secrets`;
    case "ConfigMap":
      return exists ? `/api/v3/configmaps/${identifier}` : `/api/v3/configmaps`;
    case "Certificate":
      return exists
        ? `/api/v3/certificates/${identifier}`
        : `/api/v3/certificates`;
    case "CertificateAuthority":
      return exists
        ? `/api/v3/certificates/ca/${identifier}`
        : `/api/v3/certificates/ca`;
    case "Registry": {
      // For Registry, we need the ID, not the URL
      // This will be handled in the upload hook
      return exists ? `/api/v3/registries` : `/api/v3/registries`;
    }
    case "VolumeMount":
      return exists
        ? `/api/v3/volumeMounts/${identifier}`
        : `/api/v3/volumeMounts`;
    case "CatalogItem":
      return `/api/v3/catalog/microservices`;
    case "ApplicationTemplate":
      return `/api/v3/catalog/templates`;
    case "Application":
      return exists
        ? `/api/v3/application/${identifier}`
        : `/api/v3/application`;
    case "Microservice":
      return `/api/v3/microservices`;
    case "Agent":
      return `/api/v3/iofog`;
    case "Role":
      return exists ? `/api/v3/roles/${identifier}` : `/api/v3/roles`;
    case "RoleBinding":
      return exists
        ? `/api/v3/rolebindings/${identifier}`
        : `/api/v3/rolebindings`;
    case "ServiceAccount":
      // identifier is "appName/name" when exists; path is /api/v3/serviceaccounts/:appName/:name
      return exists
        ? `/api/v3/serviceaccounts/${identifier}`
        : `/api/v3/serviceaccounts`;
    case "NatsAccountRule":
      return exists
        ? `/api/v3/nats/account-rules/${identifier}`
        : `/api/v3/nats/account-rules`;
    case "NatsUserRule":
      return exists
        ? `/api/v3/nats/user-rules/${identifier}`
        : `/api/v3/nats/user-rules`;
    default:
      return "";
  }
}

/**
 * Get the HTTP method for a resource based on existence
 */
export function getResourceMethod(
  kind: ResourceKind,
  exists: boolean,
): "POST" | "PATCH" | "PUT" {
  if (!exists) {
    return "POST";
  }

  switch (kind) {
    case "Application":
      return "PUT";
    case "Service":
    case "Secret":
    case "ConfigMap":
    case "Registry":
    case "VolumeMount":
    case "Role":
    case "RoleBinding":
    case "ServiceAccount":
    case "NatsAccountRule":
    case "NatsUserRule":
      return "PATCH";
    case "CatalogItem":
    case "ApplicationTemplate":
    case "Microservice":
    case "Agent":
      // These might need special handling - for now, use POST
      return "POST";
    default:
      return "POST";
  }
}

/**
 * Pre-fetch and cache existing resources for all kinds that appear in the YAML
 */
export async function preloadResourceCache(
  kinds: Set<ResourceKind>,
  request: (path: string, options?: any) => Promise<any>,
): Promise<ResourceExistenceCache> {
  const cache: ResourceExistenceCache = new Map();

  // Fetch resources for each kind in parallel
  const fetchPromises = Array.from(kinds).map(async (kind) => {
    const existingResources = await fetchExistingResources(kind, request);
    const kindCache = new Map<string, boolean>();

    // Ensure existingResources is an array
    if (!Array.isArray(existingResources)) {
      console.warn(
        `Expected array for ${kind} resources, got:`,
        typeof existingResources,
      );
      cache.set(kind, kindCache);
      return;
    }

    // Build cache for this kind
    for (const resource of existingResources) {
      let identifier: string | null = null;

      switch (kind) {
        case "Service":
        case "Secret":
        case "ConfigMap":
        case "Certificate":
        case "CertificateAuthority":
        case "CatalogItem":
        case "ApplicationTemplate":
        case "Application":
        case "VolumeMount":
        case "Role":
        case "RoleBinding":
        case "ServiceAccount":
          identifier =
            resource.applicationName && resource.name
              ? `${resource.applicationName}/${resource.name}`
              : resource.name;
          break;
        case "NatsAccountRule":
        case "NatsUserRule":
          identifier = resource.name;
          break;
        case "Registry":
          identifier = resource.url || resource.id?.toString();
          break;
        case "Microservice":
        case "Agent":
          identifier = resource.name || resource.uuid;
          break;
      }

      if (identifier) {
        kindCache.set(identifier, true);
      }
    }

    cache.set(kind, kindCache);
  });

  await Promise.all(fetchPromises);
  return cache;
}
