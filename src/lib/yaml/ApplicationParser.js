import lget from "lodash/get";
import { mapYamlImagesToArray } from "@/lib/imageArchYAML";

const parseMicroserviceImages = async (fileImages) => {
  // Support both catalogId and catalogItemId (YAML uses catalogId, but API uses catalogItemId)
  const catalogId = fileImages.catalogId || fileImages.catalogItemId;
  if (catalogId) {
    return {
      registryId: undefined,
      images: undefined,
      catalogItemId: catalogId, // API expects catalogItemId
    };
  }
  const registryByName = {
    remote: 1,
    local: 2,
  };
  const images = mapYamlImagesToArray(fileImages);
  const registryId = fileImages.registry
    ? registryByName[fileImages.registry] ||
      window.parseInt(fileImages.registry)
    : 1;
  return { registryId, catalogItemId: undefined, images };
};

const _deleteUndefinedFields = (obj) =>
  Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);

export const parseMicroservice = async (microservice) => {
  const { registryId, catalogItemId, images } = await parseMicroserviceImages(
    microservice.images,
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

  const microserviceData = {
    config: microservice.config
      ? JSON.stringify(microservice.config)
      : undefined,
    name: microservice.name,
    logSize: microservice.logSize,
    catalogItemId,
    agentName: lget(microservice, "agent.name"),
    registryId,
    ...microservice.container,
    annotations: microservice.container.annotations
      ? JSON.stringify(microservice.container.annotations)
      : undefined,
    ports: lget(microservice, "container.ports", []).map((p) => ({
      ...p,
      publicPort: p.public,
    })),
    volumeMappings: lget(microservice, "container.volumes", []),
    cmd: lget(microservice, "container.commands", []),
    env: lget(microservice, "container.env", []).map((e) => {
      const envVar = { key: e.key.toString() };

      // Handle different types of environment variables
      // Check if valueFromSecret or valueFromConfigMap exists first
      const hasValueFromSecret =
        Object.prototype.hasOwnProperty.call(e, "valueFromSecret") &&
        e.valueFromSecret !== null;
      const hasValueFromConfigMap =
        Object.prototype.hasOwnProperty.call(e, "valueFromConfigMap") &&
        e.valueFromConfigMap !== null;

      // Only parse value if neither valueFromSecret nor valueFromConfigMap is present
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
    }),
    images,
    extraHosts: lget(microservice, "container.extraHosts", []),
    rebuild: microservice.rebuild,
    application: microservice.application,
    runAsUser:
      microservice.runAsUser !== null ||
      microservice?.container?.runAsUser !== null
        ? microservice.runAsUser !== undefined
          ? microservice.runAsUser
          : microservice?.container?.runAsUser
        : "",
    platform:
      microservice.platform !== null ||
      microservice?.container?.platform !== null
        ? microservice.platform !== undefined
          ? microservice.platform
          : microservice?.container?.platform
        : "",
    runtime:
      microservice.runtime !== null || microservice?.container?.runtime !== null
        ? microservice.runtime !== undefined
          ? microservice.runtime
          : microservice?.container?.runtime
        : "",
    cdiDevices:
      microservice.cdiDevices !== null ||
      microservice?.container?.cdiDevices !== null
        ? microservice.cdiDevices !== undefined
          ? microservice.cdiDevices
          : microservice?.container?.cdiDevices
        : "",
    capAdd:
      microservice.capAdd !== null || microservice?.container?.capAdd !== null
        ? microservice.capAdd !== undefined
          ? microservice.capAdd
          : microservice?.container?.capAdd
        : "",
    capDrop:
      microservice.capDrop !== null || microservice?.container?.capDrop !== null
        ? microservice.capDrop !== undefined
          ? microservice.capDrop
          : microservice?.container?.capDrop
        : "",
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
  _deleteUndefinedFields(microserviceData);
  return microserviceData;
};
