import yaml from "js-yaml";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";
import { appendImageToYamlAcc } from "@/lib/imageArchYAML";

interface Agent {
  uuid: string;
  name: string;
}

interface ReducedAgents {
  byUUID: Record<string, { name: string }>;
}

interface GetYAMLParams {
  microservice: any;
  activeAgents?: Agent[];
  reducedAgents?: ReducedAgents;
}

export const getMicroserviceYAMLFromJSON = ({
  microservice,
  activeAgents = [],
  reducedAgents = { byUUID: {} },
}: GetYAMLParams) => {
  if (!microservice) return {};

  let parsedConfig: any = {};

  try {
    parsedConfig =
      typeof microservice?.config === "string"
        ? JSON.parse(microservice.config)
        : microservice.config || {};
  } catch (e) {
    console.warn("Failed to parse microservice.config:", e);
    parsedConfig = microservice.config;
  }

  return {
    apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
    kind: "Microservice",
    metadata: {
      name: microservice.name,
    },
    spec: {
      uuid: microservice.uuid,
      name: microservice.name,
      agent: {
        name:
          activeAgents.find((a) => a.uuid === microservice.iofogUuid)?.name ??
          reducedAgents.byUUID[microservice.iofogUuid]?.name ??
          "__UNKNOWN__",
      },
      images: (microservice.images || []).reduce(
        (acc: Record<string, unknown>, image: any) =>
          appendImageToYamlAcc(acc, image),
        {
          registry: microservice.registryId,
          catalogId: microservice.catalogItemId,
        },
      ),
      container: {
        annotations: JSON.parse(microservice.annotations || "{}"),
        hostNetworkMode: microservice.hostNetworkMode,
        isPrivileged: microservice.isPrivileged,
        runAsUser: microservice?.runAsUser ?? "",
        ipcMode: microservice?.ipcMode ?? "",
        pidMode: microservice?.pidMode ?? "",
        platform: microservice?.platform ?? "",
        runtime: microservice?.runtime ?? "",
        cdiDevices: microservice?.cdiDevices ?? [],
        capAdd: microservice?.capAdd ?? [],
        capDrop: microservice?.capDrop ?? [],
        volumes: (microservice.volumeMappings || []).map((vm: any) => {
          const { id, ...rest } = vm;
          return rest;
        }),
        env: (microservice.env || []).map((env: any) => {
          const { id, ...rest } = env;
          const cleanedEnv: any = { ...rest };
          if (cleanedEnv.valueFromSecret === null) {
            delete cleanedEnv.valueFromSecret;
          }
          if (cleanedEnv.valueFromConfigMap === null) {
            delete cleanedEnv.valueFromConfigMap;
          }
          return cleanedEnv;
        }),
        extraHosts: (microservice.extraHosts || []).map((eH: any) => {
          const { id, ...rest } = eH;
          return rest;
        }),
        ports: (microservice.ports || []).map((p: any) => {
          if (p.host) {
            p.host = reducedAgents.byUUID[p.host]?.name || p.host;
          }
          return p;
        }),
        cpuSetCpus: microservice?.cpuSetCpus ?? "",
        ...(microservice?.memoryLimit !== undefined &&
          microservice?.memoryLimit !== null && {
            memoryLimit: microservice.memoryLimit,
          }),
        commands: Array.isArray(microservice.cmd) ? [...microservice.cmd] : [],
        healthCheck: microservice?.healthCheck ?? {},
      },
      ...(microservice?.serviceAccount?.roleRef && {
        serviceAccount: {
          roleRef: microservice.serviceAccount.roleRef,
        },
      }),
      natsConfig: {
        natsAccess:
          microservice?.natsConfig?.natsAccess ?? microservice?.natsAccess,
        ...(microservice?.natsConfig?.natsRule && {
          natsRule: microservice.natsConfig.natsRule,
        }),
      },
      config: parsedConfig,
      application: microservice?.application,
      rebuild: microservice?.rebuild,
    },
  };
};

export const dumpMicroserviceYAML = (params: GetYAMLParams) => {
  return yaml.dump(getMicroserviceYAMLFromJSON(params));
};
