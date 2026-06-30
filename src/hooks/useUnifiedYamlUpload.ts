import { useState, useCallback } from "react";
import {
  parseUnifiedYaml,
  ParsedResource,
  ResourceKind,
} from "@/lib/yaml/unifiedYamlParser";
import {
  checkResourceExists,
  getResourceEndpoint,
  getResourceMethod,
  preloadResourceCache,
  ResourceExistenceCache,
} from "@/lib/resourceExistenceChecker";
import { sanitizeRolePayload } from "@/lib/yaml/parseRoleYaml";
import { normalizeCatalogImages } from "@/lib/catalogImages";

export interface UploadResult {
  success: boolean;
  message: string;
  resourceKind: ResourceKind;
  resourceIdentifier: string;
}

export interface UploadProgress {
  total: number;
  processed: number;
  current?: {
    kind: ResourceKind;
    identifier: string;
  };
}

function getCertificatePatchBlockedMessage(kind: ResourceKind): string {
  if (kind === "CertificateAuthority") {
    return "Certificate Authority patching is not allowed. If you would like to update the certificate authority, delete it first and redeploy.";
  }
  return "Certificate patching is not allowed. If you would like to update the certificate, delete it first and redeploy.";
}

export interface UseUnifiedYamlUploadOptions {
  request: (path: string, options?: any) => Promise<any>;
  pushFeedback: (feedback: {
    message: string;
    type: "success" | "error" | "info" | "warning";
    uuid?: string;
  }) => void;
  onComplete?: (results: UploadResult[]) => void;
  refreshFunctions?: Map<ResourceKind, () => Promise<void>>;
}

export function useUnifiedYamlUpload({
  request,
  pushFeedback,
  onComplete,
  refreshFunctions,
}: UseUnifiedYamlUploadOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  /**
   * Deploy a single resource
   */
  const deployResource = async (
    resource: ParsedResource,
    exists: boolean,
    cache?: ResourceExistenceCache,
  ): Promise<UploadResult> => {
    const { kind, parsed, identifier } = resource;
    const endpoint = getResourceEndpoint(kind, identifier, exists);
    const method = getResourceMethod(kind, exists);

    try {
      // Special handling for different resource types
      let finalEndpoint = endpoint;
      let finalBody = parsed;
      let finalMethod = method;

      // Handle Registry - POST when spec.id is empty, PATCH when spec.id is set
      if (kind === "Registry") {
        const registryId = parsed.id;
        const hasId =
          registryId !== null &&
          registryId !== undefined &&
          String(registryId).trim() !== "";

        if (hasId) {
          finalEndpoint = `/api/v3/registries/${registryId}`;
          finalMethod = "PATCH";
        } else {
          finalEndpoint = `/api/v3/registries`;
          finalMethod = "POST";
        }

        const { id: _id, ...registryBody } = parsed;
        finalBody = registryBody;
      }

      // Handle Microservice - needs uuid for PATCH
      if (kind === "Microservice" && exists) {
        const existingMicroservices = await request("/api/v3/microservices");
        if (existingMicroservices?.ok) {
          const data = await existingMicroservices.json();
          const microservices = data.microservices || data;
          if (Array.isArray(microservices)) {
            const existingMs = microservices.find(
              (ms: any) => ms.name === identifier || ms.uuid === identifier,
            );
            if (existingMs?.uuid) {
              finalEndpoint = `/api/v3/microservices/${existingMs.uuid}`;
              finalMethod = "PATCH";
            }
          }
        }
      }

      // Handle Agent - needs uuid for PATCH
      if (kind === "Agent" && exists) {
        const existingAgents = await request("/api/v3/iofog-list");
        if (existingAgents?.ok) {
          const data = await existingAgents.json();
          const agents = data.fogs || data;
          if (Array.isArray(agents)) {
            const existingAgent = agents.find(
              (a: any) => a.name === identifier || a.uuid === identifier,
            );
            if (existingAgent?.uuid) {
              finalEndpoint = `/api/v3/iofog/${existingAgent.uuid}`;
              finalMethod = "PATCH";
            }
          }
        }
      }

      // Handle ApplicationTemplate - uses PUT with name in path
      if (kind === "ApplicationTemplate") {
        finalEndpoint = `/api/v3/applicationTemplate/${identifier}`;
        finalMethod = exists ? "PATCH" : "PUT";
      }

      // Handle CatalogItem - POST when name is new, PATCH when name exists in catalog list
      if (kind === "CatalogItem") {
        let existingId: string | number | null = null;

        const catalogResponse = await request("/api/v3/catalog/microservices");
        if (catalogResponse?.ok) {
          const data = await catalogResponse.json();
          const catalogItems = data.catalogItems || [];
          if (Array.isArray(catalogItems)) {
            const existing = catalogItems.find(
              (item: { name?: string; id?: string | number }) =>
                item.name === parsed.name || item.name === identifier,
            );
            if (existing?.id != null) {
              existingId = existing.id;
            }
          }
        }

        finalBody = {
          ...parsed,
          images: normalizeCatalogImages(parsed.images),
        };

        if (existingId != null) {
          finalEndpoint = `/api/v3/catalog/microservices/${existingId}`;
          finalMethod = "PATCH";
        } else {
          finalEndpoint = `/api/v3/catalog/microservices`;
          finalMethod = "POST";
        }
      }

      // Handle VolumeMount - clean null values
      if (kind === "VolumeMount") {
        const cleanedPayload: any = { ...parsed };
        if (
          cleanedPayload.secretName === null ||
          cleanedPayload.secretName === undefined
        ) {
          delete cleanedPayload.secretName;
        }
        if (
          cleanedPayload.configMapName === null ||
          cleanedPayload.configMapName === undefined
        ) {
          delete cleanedPayload.configMapName;
        }
        finalBody = cleanedPayload;
      }

      // Handle ConfigMap - needs special structure
      if (kind === "ConfigMap") {
        finalBody = {
          name: parsed.name,
          immutable: parsed.spec?.immutable ?? false,
          useVault: parsed.spec?.useVault ?? false,
          data: parsed.data || {},
        };
      }

      // Handle Certificate - needs special handling for CA vs Certificate
      if (kind === "Certificate" || kind === "CertificateAuthority") {
        // Body is already correctly formatted by parser
        finalBody = parsed;
      }

      // Handle RBAC resources - use JSON endpoints (not YAML multipart endpoints)
      if (kind === "Role") {
        finalBody = sanitizeRolePayload(parsed);
      } else if (kind === "RoleBinding" || kind === "ServiceAccount") {
        finalBody = parsed;
      }

      // Handle NATS Account/User Rules - clean null values
      if (kind === "NatsAccountRule" || kind === "NatsUserRule") {
        const cleanedPayload: any = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (value !== null && value !== undefined) {
            cleanedPayload[key] = value;
          }
        }
        finalBody = cleanedPayload;
      }

      const response = await request(finalEndpoint, {
        method: finalMethod as "POST" | "PATCH" | "PUT",
        headers: {
          "content-type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(finalBody),
      });

      if (!response?.ok) {
        const errorMessage =
          response?.message || response?.statusText || "Unknown error";
        return {
          success: false,
          message: errorMessage,
          resourceKind: kind,
          resourceIdentifier: identifier,
        };
      }

      const action =
        kind === "Registry" || kind === "CatalogItem"
          ? finalMethod === "PATCH"
            ? "updated"
            : "created"
          : exists
            ? "updated"
            : "created";
      return {
        success: true,
        message: `${kind} ${identifier} ${action} successfully`,
        resourceKind: kind,
        resourceIdentifier: identifier,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Unknown error",
        resourceKind: kind,
        resourceIdentifier: identifier,
      };
    }
  };

  /**
   * Process a YAML file
   */
  const processYamlFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setProgress(null);

      try {
        // Read file content
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target?.result as string);
          };
          reader.onerror = reject;
          reader.readAsText(file, "UTF-8");
        });

        // Parse YAML
        const parseResult = await parseUnifiedYaml(content);

        // Report parsing errors
        if (parseResult.errors.length > 0) {
          parseResult.errors.forEach((error) => {
            pushFeedback({
              message: error,
              type: "error",
            });
          });
        }

        if (parseResult.resources.length === 0) {
          pushFeedback({
            message: "No valid resources found in YAML file",
            type: "error",
          });
          setIsProcessing(false);
          return;
        }

        // Collect unique resource kinds
        const kinds = new Set<ResourceKind>(
          parseResult.resources.map((r) => r.kind),
        );

        // Pre-load resource cache
        const cache = await preloadResourceCache(kinds, request);

        // Set up progress tracking
        const total = parseResult.resources.length;
        setProgress({ total, processed: 0 });

        const results: UploadResult[] = [];

        // Process resources sequentially (to respect dependencies)
        for (let i = 0; i < parseResult.resources.length; i++) {
          const resource = parseResult.resources[i];

          setProgress({
            total,
            processed: i,
            current: {
              kind: resource.kind,
              identifier: resource.identifier,
            },
          });

          // Check if resource exists
          const exists = await checkResourceExists(
            resource.kind,
            resource.parsed,
            resource.originalDoc,
            request,
            cache,
          );

          if (
            (resource.kind === "Certificate" ||
              resource.kind === "CertificateAuthority") &&
            exists
          ) {
            const message = getCertificatePatchBlockedMessage(resource.kind);
            results.push({
              success: false,
              message,
              resourceKind: resource.kind,
              resourceIdentifier: resource.identifier,
            });

            setProgress({
              total,
              processed: i + 1,
              current: {
                kind: resource.kind,
                identifier: resource.identifier,
              },
            });

            pushFeedback({
              message: `${resource.kind} ${resource.identifier}: ${message}`,
              type: "warning",
            });
            continue;
          }

          // Deploy resource
          const result = await deployResource(resource, exists, cache);
          results.push(result);

          // Update progress
          setProgress({
            total,
            processed: i + 1,
            current: {
              kind: resource.kind,
              identifier: resource.identifier,
            },
          });

          // Provide feedback
          if (result.success) {
            pushFeedback({
              message: result.message,
              type: "success",
            });
          } else {
            pushFeedback({
              message: `Failed to deploy ${resource.kind} ${resource.identifier}: ${result.message}`,
              type: "error",
            });
          }

          // Refresh the appropriate list if refresh function is provided
          if (result.success && refreshFunctions?.has(resource.kind)) {
            const refreshFn = refreshFunctions.get(resource.kind);
            if (refreshFn) {
              try {
                await refreshFn();
              } catch (e) {
                console.error(`Error refreshing ${resource.kind}:`, e);
              }
            }
          }
        }

        // Summary feedback
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        if (failureCount === 0) {
          pushFeedback({
            message: `Successfully deployed ${successCount} resource(s)`,
            type: "success",
          });
        } else {
          pushFeedback({
            message: `Deployed ${successCount} resource(s), ${failureCount} failed`,
            type: "warning",
          });
        }

        // Call completion callback
        if (onComplete) {
          onComplete(results);
        }

        setProgress(null);
      } catch (error: any) {
        pushFeedback({
          message: `Error processing YAML file: ${error.message || "Unknown error"}`,
          type: "error",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    // deployResource is stable in practice (defined in same scope); listing it would change deps every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request, pushFeedback, onComplete, refreshFunctions],
  );

  return {
    processYamlFile,
    isProcessing,
    progress,
  };
}
