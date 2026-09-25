import lget from "lodash/get";
import { mapYamlImagesToArray } from "@/lib/imageArchYAML";
import { resolveRegistryId } from "./resolveRegistryId";
import { isTemplatePlaceholder } from "./yamlTemplatePlaceholders";

const parseMicroserviceImages = async (fileImages, options = {}) => {
  const templateMode = options.templateMode === true;
  if (!fileImages) {
    return {
      registryId: undefined,
      images: undefined,
      catalogItemId: undefined,
    };
  }
  // Support both catalogId and catalogItemId (YAML uses catalogId, but API uses catalogItemId)
  const catalogId = fileImages.catalogId || fileImages.catalogItemId;
  if (catalogId) {
    return {
      registryId: undefined,
      images: undefined,
      catalogItemId: catalogId, // API expects catalogItemId
    };
  }
  const images = mapYamlImagesToArray(fileImages);
  const registryId = resolveRegistryId(
    fileImages.registry,
    templateMode ? undefined : 1,
  );
  return { registryId, catalogItemId: undefined, images };
};

const _deleteEmptyWireFields = (obj) =>
  Object.keys(obj).forEach(
    (key) => (obj[key] === undefined || obj[key] === null) && delete obj[key],
  );

/** Empty YAML number keys (null / "") must not be sent on POST/PATCH. */
const parseOptionalContainerNumber = (value) => {
  if (isTemplatePlaceholder(value)) {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const pickContainerOrTop = (microservice, container, key) => {
  if (microservice[key] !== undefined && microservice[key] !== null) {
    return microservice[key];
  }
  if (container && container[key] !== undefined && container[key] !== null) {
    return container[key];
  }
  return undefined;
};

export const normalizeTemplateVariables = (variables) => {
  if (variables == null) {
    return undefined;
  }
  if (Array.isArray(variables)) {
    const map = {};
    for (const item of variables) {
      if (item && item.key != null) {
        map[item.key] = item.value;
      }
    }
    return map;
  }
  if (typeof variables === "object") {
    return { ...variables };
  }
  return undefined;
};

const parseVolumeMappings = (volumes) => {
  if (!volumes || !Array.isArray(volumes)) {
    return volumes;
  }
  return volumes.map((vm) => {
    if (!vm || typeof vm !== "object") {
      return vm;
    }
    const mapped = { ...vm };
    if (
      mapped.scope == null ||
      (typeof mapped.scope === "string" && mapped.scope.trim() === "")
    ) {
      delete mapped.scope;
    }
    return mapped;
  });
};

const parseKnowledgeCatalog = (knowledge) => {
  if (
    knowledge == null ||
    typeof knowledge !== "object" ||
    Array.isArray(knowledge)
  ) {
    return undefined;
  }
  const catalog = {};
  if (knowledge.bindPath != null) {
    catalog.bindPath = knowledge.bindPath;
  }
  if (knowledge.permissions != null) {
    catalog.permissions = knowledge.permissions;
  }
  if (Array.isArray(knowledge.items)) {
    catalog.items = knowledge.items.flatMap((item) => {
      if (typeof item === "string") {
        return [{ name: item }];
      }
      if (
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        item.name != null
      ) {
        return [{ name: item.name }];
      }
      return [];
    });
  }
  return catalog;
};

const parseTemplateRef = (template) => {
  if (template == null) {
    return undefined;
  }
  if (typeof template !== "object" || Array.isArray(template)) {
    throw new Error("Invalid template format");
  }
  if (!template.name) {
    throw new Error("template.name is required when template is specified");
  }
  const result = { name: template.name };
  const variables = normalizeTemplateVariables(template.variables);
  if (variables !== undefined) {
    result.variables = variables;
  }
  return result;
};

/** Split metadata.name `application/name` into application + name when spec.application is empty. */
export const applyMicroserviceFqName = (parsed) => {
  if (!parsed || typeof parsed !== "object") {
    return parsed;
  }
  const name = parsed.name;
  if (typeof name !== "string") {
    return parsed;
  }
  const parts = name.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return parsed;
  }
  const [applicationFromName, msName] = parts;
  parsed.name = msName;
  if (parsed.application == null || parsed.application === "") {
    parsed.application = applicationFromName;
  }
  return parsed;
};

export const parseMicroservice = async (microservice, options = {}) => {
  const { registryId, catalogItemId, images } = await parseMicroserviceImages(
    microservice.images,
    options,
  );
  // Parse serviceAccount.roleRef if present
  let serviceAccount;
  if (microservice.serviceAccount) {
    const roleRef = microservice.serviceAccount.roleRef;
    if (roleRef) {
      // Validate required fields
      if (!roleRef.kind || !roleRef.name) {
        throw new Error(
          "serviceAccount.roleRef requires both 'kind' and 'name' fields",
        );
      }
      serviceAccount = {
        roleRef: {
          kind: roleRef.kind,
          name: roleRef.name,
          ...(roleRef.apiGroup && { apiGroup: roleRef.apiGroup }),
        },
      };
    } else {
      // If serviceAccount exists but has no roleRef, set to empty object
      serviceAccount = {};
    }
  }

  const resolvedNatsAccess =
    microservice?.natsConfig?.natsAccess ?? microservice?.natsAccess;
  const resolvedNatsRule =
    microservice?.natsConfig?.natsRule ?? microservice?.natsRule;

  const container =
    microservice.container && typeof microservice.container === "object"
      ? microservice.container
      : undefined;
  const hasContainer = container != null;

  const commands = hasContainer
    ? container.commands !== undefined
      ? container.commands
      : container.cmd
    : undefined;

  const parseEnvVariables = (envArray) => {
    if (!envArray || !Array.isArray(envArray)) {
      return [];
    }
    return envArray.map((e) => {
      const envVar = { key: e.key.toString() };

      const hasValueFromSecret =
        Object.prototype.hasOwnProperty.call(e, "valueFromSecret") &&
        e.valueFromSecret !== null;
      const hasValueFromConfigMap =
        Object.prototype.hasOwnProperty.call(e, "valueFromConfigMap") &&
        e.valueFromConfigMap !== null;

      if (
        !hasValueFromSecret &&
        !hasValueFromConfigMap &&
        Object.prototype.hasOwnProperty.call(e, "value") &&
        e.value !== null
      ) {
        envVar.value = e.value.toString();
      }

      if (hasValueFromSecret) {
        envVar.valueFromSecret = e.valueFromSecret;
      }
      if (hasValueFromConfigMap) {
        envVar.valueFromConfigMap = e.valueFromConfigMap;
      }

      return envVar;
    });
  };

  const microserviceData = {
    config: microservice.config
      ? JSON.stringify(microservice.config)
      : undefined,
    name: microservice.name,
    logSize: microservice.logSize,
    catalogItemId,
    agentName: lget(microservice, "agent.name"),
    registryId,
    hostNetworkMode: hasContainer ? container.hostNetworkMode : undefined,
    isPrivileged: hasContainer ? container.isPrivileged : undefined,
    pidMode: hasContainer ? container.pidMode : undefined,
    ipcMode: hasContainer ? container.ipcMode : undefined,
    cpuSetCpus: hasContainer ? container.cpuSetCpus : undefined,
    memoryLimit: hasContainer
      ? parseOptionalContainerNumber(container.memoryLimit)
      : undefined,
    healthCheck: hasContainer ? container.healthCheck : undefined,
    annotations:
      hasContainer && container.annotations
        ? JSON.stringify(container.annotations)
        : undefined,
    capAdd: pickContainerOrTop(microservice, container, "capAdd"),
    capDrop: pickContainerOrTop(microservice, container, "capDrop"),
    ports: hasContainer
      ? lget(microservice, "container.ports", []).map((p) => ({
          ...p,
          publicPort: p.public,
        }))
      : undefined,
    volumeMappings: hasContainer
      ? parseVolumeMappings(lget(microservice, "container.volumes", []))
      : undefined,
    commands,
    env: hasContainer
      ? parseEnvVariables(lget(microservice, "container.env", []))
      : undefined,
    images,
    extraHosts: hasContainer
      ? lget(microservice, "container.extraHosts", [])
      : undefined,
    rebuild: microservice.rebuild,
    application: microservice.application,
    models: microservice.models,
    knowledge: parseKnowledgeCatalog(microservice.knowledge),
    template: parseTemplateRef(microservice.template),
    runAsUser: pickContainerOrTop(microservice, container, "runAsUser"),
    runAsGroup: pickContainerOrTop(microservice, container, "runAsGroup"),
    readOnlyRootFilesystem: pickContainerOrTop(
      microservice,
      container,
      "readOnlyRootFilesystem",
    ),
    platform: pickContainerOrTop(microservice, container, "platform"),
    runtime: pickContainerOrTop(microservice, container, "runtime"),
    cdiDevices: pickContainerOrTop(microservice, container, "cdiDevices"),
    sysctls: hasContainer ? container.sysctls : undefined,
    ulimits: hasContainer ? container.ulimits : undefined,
    cpus: hasContainer ? parseOptionalContainerNumber(container.cpus) : undefined,
    memoryReservation: hasContainer
      ? parseOptionalContainerNumber(container.memoryReservation)
      : undefined,
    memorySwap: hasContainer
      ? parseOptionalContainerNumber(container.memorySwap)
      : undefined,
    shmSize: hasContainer
      ? parseOptionalContainerNumber(container.shmSize)
      : undefined,
    devices: hasContainer ? container.devices : undefined,
    tmpfs: hasContainer ? container.tmpfs : undefined,
    workingDir: hasContainer ? container.workingDir : undefined,
    entrypoint: hasContainer ? container.entrypoint : undefined,
    ...(serviceAccount !== undefined && { serviceAccount }),
    ...(resolvedNatsAccess !== undefined || resolvedNatsRule
      ? {
          natsConfig: {
            ...(resolvedNatsAccess !== undefined && {
              natsAccess: resolvedNatsAccess,
            }),
            ...(resolvedNatsRule && { natsRule: resolvedNatsRule }),
          },
        }
      : {}),
    schedule: microservice.schedule,
  };
  _deleteEmptyWireFields(microserviceData);
  delete microserviceData.cmd;
  delete microserviceData.volumes;
  return microserviceData;
};
