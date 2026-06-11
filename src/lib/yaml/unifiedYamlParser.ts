import yaml from "js-yaml";
import { parseService } from "./parseServiceYaml";
import { parseSecret } from "./parseSecretYaml";
import { parseConfigMap } from "./parseConfigMapYaml";
import {
  parseCertificate,
  parseCertificateAuthority,
} from "./parseCertificateYaml";
import { parseRegistries } from "./parseRegistriesYaml";
import { parseVolumeMount } from "./parseVolumeMountsYaml";
import { parseCatalogMicroservice } from "./parseCatalogMicroservice";
import { parseRole } from "./parseRoleYaml";
import { parseRoleBinding } from "./parseRoleBindingYaml";
import { parseServiceAccount } from "./parseServiceAccountYaml";
import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";
import { parseMicroservice } from "./ApplicationParser";
import { parseAgentYamlDocument } from "./agentYAML";
import { parseNatsAccountRule } from "./parseNatsAccountRuleYaml";
import { parseNatsUserRule } from "./parseNatsUserRuleYaml";

export type ResourceKind =
  | "Service"
  | "Secret"
  | "ConfigMap"
  | "Certificate"
  | "CertificateAuthority"
  | "Registry"
  | "VolumeMount"
  | "CatalogItem"
  | "ApplicationTemplate"
  | "Application"
  | "Microservice"
  | "Agent"
  | "Role"
  | "RoleBinding"
  | "ServiceAccount"
  | "NatsAccountRule"
  | "NatsUserRule";

export interface ParsedResource {
  kind: ResourceKind;
  parsed: any;
  originalDoc: any;
  identifier: string;
  error?: string;
}

export interface ParseResult {
  resources: ParsedResource[];
  errors: string[];
}

/**
 * Extract and validate the resource kind from a YAML document
 */
export function getResourceKind(doc: any): ResourceKind | null {
  if (!doc || typeof doc !== "object") {
    return null;
  }

  const kind = doc.kind;
  if (!kind || typeof kind !== "string") {
    return null;
  }

  const validKinds: ResourceKind[] = [
    "Service",
    "Secret",
    "ConfigMap",
    "Certificate",
    "CertificateAuthority",
    "Registry",
    "VolumeMount",
    "CatalogItem",
    "ApplicationTemplate",
    "Application",
    "Microservice",
    "Agent",
    "Role",
    "RoleBinding",
    "ServiceAccount",
    "NatsAccountRule",
    "NatsUserRule",
  ];

  if (validKinds.includes(kind as ResourceKind)) {
    return kind as ResourceKind;
  }

  return null;
}

/**
 * Extract unique identifier from a parsed resource
 */
export function getResourceIdentifier(
  kind: ResourceKind,
  parsedResource: any,
  originalDoc?: any,
): string | null {
  switch (kind) {
    case "Service":
    case "Secret":
    case "ConfigMap":
    case "Certificate":
    case "CertificateAuthority":
    case "CatalogItem":
    case "ApplicationTemplate":
    case "Application":
    case "Role":
    case "RoleBinding":
    case "ServiceAccount": {
      // Controller uses path /api/v3/serviceaccounts/:appName/:name
      const appName =
        parsedResource?.applicationName ||
        originalDoc?.metadata?.applicationName;
      const saName =
        parsedResource?.name || originalDoc?.metadata?.name || null;
      if (appName && saName) {
        return `${appName}/${saName}`;
      }
      return saName;
    }
    case "NatsAccountRule":
    case "NatsUserRule":
      return parsedResource?.name || originalDoc?.metadata?.name || null;
    case "Registry":
      return parsedResource?.url || originalDoc?.spec?.url || null;
    case "VolumeMount":
      return parsedResource?.name || null;
    case "Microservice":
      return (
        parsedResource?.name ||
        parsedResource?.uuid ||
        originalDoc?.metadata?.name ||
        null
      );
    case "Agent":
      return (
        parsedResource?.name ||
        parsedResource?.uuid ||
        originalDoc?.metadata?.name ||
        null
      );
    default:
      return null;
  }
}

/**
 * Route a document to the appropriate parser based on kind
 */
async function routeToParser(
  doc: any,
  kind: ResourceKind,
): Promise<[any, string | null]> {
  try {
    let result: any;

    switch (kind) {
      case "Service":
        result = await parseService(doc);
        break;
      case "Secret":
        result = await parseSecret(doc);
        break;
      case "ConfigMap":
        result = await parseConfigMap(doc);
        break;
      case "Certificate":
        result = await parseCertificate(doc);
        break;
      case "CertificateAuthority":
        result = await parseCertificateAuthority(doc);
        break;
      case "Registry":
        result = await parseRegistries(doc);
        break;
      case "VolumeMount":
        result = await parseVolumeMount(doc);
        break;
      case "CatalogItem":
        result = await parseCatalogMicroservice(doc);
        break;
      case "ApplicationTemplate": {
        // Inline parser from appTemplates/index.tsx
        if (!isAllowedControllerApiVersion(doc.apiVersion)) {
          return [{}, invalidControllerApiVersionMessage(doc.apiVersion)] as [
            any,
            string | null,
          ];
        }
        if (doc.kind !== "ApplicationTemplate") {
          return [{}, `Invalid kind ${doc.kind}`] as [any, string | null];
        }
        if (!doc.metadata || !doc.spec) {
          return [{}, "Invalid YAML format"] as [any, string | null];
        }
        const application = {
          ...lget(doc, "spec.application", {}),
          microservices: await Promise.all(
            (lget(doc, "spec.application.microservices", []) || []).map(
              async (m: any) => parseMicroservice(m),
            ),
          ),
        };
        const applicationTemplate = {
          name: lget(doc, "metadata.name", lget(doc, "spec.name", undefined)),
          description: lget(doc, "spec.description", ""),
          application,
          variables: lget(doc, "spec.variables", []),
        };
        return [applicationTemplate, null] as [any, string | null];
      }
      case "Application": {
        // Inline parser from Applications/index.tsx
        if (!isAllowedControllerApiVersion(doc.apiVersion)) {
          return [{}, invalidControllerApiVersionMessage(doc.apiVersion)] as [
            any,
            string | null,
          ];
        }
        if (doc.kind !== "Application") {
          return [{}, `Invalid kind ${doc.kind}`] as [any, string | null];
        }
        if (!doc.metadata || !doc.spec) {
          return [{}, "Invalid YAML format"] as [any, string | null];
        }
        const application = {
          name: lget(doc, "metadata.name", undefined),
          ...doc.spec,
          isActivated: true,
          microservices: await Promise.all(
            (doc.spec.microservices || []).map(async (m: any) =>
              parseMicroservice(m),
            ),
          ),
        };
        return [application, null] as [any, string | null];
      }
      case "Microservice": {
        // Inline parser from Microservices/index.tsx
        if (!isAllowedControllerApiVersion(doc.apiVersion)) {
          return [{}, invalidControllerApiVersionMessage(doc.apiVersion)] as [
            any,
            string | null,
          ];
        }
        if (doc.kind !== "Microservice") {
          return [{}, `Invalid kind ${doc.kind}`] as [any, string | null];
        }
        if (!doc.metadata || !doc.spec) {
          return [{}, "Invalid YAML format"] as [any, string | null];
        }
        const tempObject = await parseMicroservice(doc.spec);
        const microserviceData = {
          name: lget(doc, "metadata.name", undefined),
          ...tempObject,
        };
        return [microserviceData, null] as [any, string | null];
      }
      case "Agent": {
        return parseAgentYamlDocument(doc);
      }
      case "Role":
        result = await parseRole(doc);
        break;
      case "RoleBinding":
        result = await parseRoleBinding(doc);
        break;
      case "ServiceAccount":
        result = await parseServiceAccount(doc);
        break;
      case "NatsAccountRule":
        result = await parseNatsAccountRule(doc);
        break;
      case "NatsUserRule":
        result = await parseNatsUserRule(doc);
        break;
      default:
        return [null, `Unsupported resource kind: ${kind}`] as [
          any,
          string | null,
        ];
    }

    // Normalize result to tuple format
    if (Array.isArray(result)) {
      if (result.length === 2) {
        return [result[0], result[1]] as [any, string | null];
      } else if (result.length === 1) {
        return [result[0], null] as [any, string | null];
      }
    }
    return [null, "Invalid parser result"] as [any, string | null];
  } catch (error: any) {
    return [null, error.message || "Unknown parsing error"] as [
      any,
      string | null,
    ];
  }
}

/**
 * Agent, Secret, CertificateAuthority, Certificate, ConfigMap, VolumeMount,
 * Registry, CatalogItem, Application, Microservice, Service
 */
function sortByDependencies(docs: any[]): any[] {
  // Define the order of resource kinds (matching CLI tool order)
  // RBAC resources should come after VolumeMount, before Registry
  const kindOrder: ResourceKind[] = [
    "Agent",
    "Secret",
    "CertificateAuthority",
    "Certificate",
    "ConfigMap",
    "VolumeMount",
    "Role",
    "RoleBinding",
    "ServiceAccount",
    "NatsAccountRule",
    "NatsUserRule",
    "Registry",
    "CatalogItem",
    "Application",
    "Microservice",
    "Service",
  ];

  // Create a map for quick lookup of order index
  const kindOrderMap = new Map<ResourceKind, number>();
  kindOrder.forEach((kind, index) => {
    kindOrderMap.set(kind, index);
  });

  return docs.sort((a, b) => {
    const kindA = a?.kind as ResourceKind;
    const kindB = b?.kind as ResourceKind;

    const orderA = kindOrderMap.get(kindA);
    const orderB = kindOrderMap.get(kindB);

    // If both kinds are in the order list, sort by their position
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }

    // If only one is in the list, prioritize the one in the list
    if (orderA !== undefined) {
      return -1;
    }
    if (orderB !== undefined) {
      return 1;
    }

    // If neither is in the list, maintain original order
    return 0;
  });
}

/**
 * Main entry point: Parse unified YAML content
 */
export async function parseUnifiedYaml(content: string): Promise<ParseResult> {
  const resources: ParsedResource[] = [];
  const errors: string[] = [];

  try {
    // Parse all documents from YAML content
    const docs = yaml.loadAll(content);

    if (!Array.isArray(docs) && docs) {
      // Single document
      const docsArray = [docs];
      const sortedDocs = sortByDependencies(docsArray);

      for (const doc of sortedDocs) {
        if (!doc) {
          continue;
        }

        const kind = getResourceKind(doc);
        if (!kind) {
          errors.push(
            `Document has invalid or missing kind: ${JSON.stringify(doc.kind)}`,
          );
          continue;
        }

        const [parsed, parseError] = await routeToParser(doc, kind);
        if (parseError) {
          errors.push(`Error parsing ${kind}: ${parseError}`);
          continue;
        }

        const identifier = getResourceIdentifier(kind, parsed, doc);
        resources.push({
          kind,
          parsed,
          originalDoc: doc,
          identifier: identifier || "unknown",
        });
      }
    } else if (Array.isArray(docs)) {
      // Multiple documents
      const sortedDocs = sortByDependencies(docs);

      for (const doc of sortedDocs) {
        if (!doc) {
          continue;
        }

        const kind = getResourceKind(doc);
        if (!kind) {
          errors.push(
            `Document has invalid or missing kind: ${JSON.stringify(doc.kind)}`,
          );
          continue;
        }

        const [parsed, parseError] = await routeToParser(doc, kind);
        if (parseError) {
          errors.push(`Error parsing ${kind}: ${parseError}`);
          continue;
        }

        const identifier = getResourceIdentifier(kind, parsed, doc);
        resources.push({
          kind,
          parsed,
          originalDoc: doc,
          identifier: identifier || "unknown",
        });
      }
    } else {
      errors.push("Could not parse the file: Invalid YAML format");
    }
  } catch (e: any) {
    errors.push(`YAML parsing error: ${e.message || "Unknown error"}`);
  }

  return { resources, errors };
}
