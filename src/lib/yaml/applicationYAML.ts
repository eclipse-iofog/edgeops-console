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

interface Application {
  name: string;
  microservices: any[];
  natsAccess?: boolean;
  natsRule?: string;
  natsConfig?: {
    natsAccess?: boolean;
    natsRule?: string;
  };
}

interface GetApplicationYAMLParams {
  application: Application;
  activeAgents?: Agent[];
  reducedAgents?: ReducedAgents;
}

export const getApplicationYAMLFromJSON = ({
  application,
  activeAgents = [],
  reducedAgents = { byUUID: {} },
}: GetApplicationYAMLParams): any => {
  if (!application) return {};

  const resolvedApplicationNatsAccess =
    application?.natsConfig?.natsAccess ?? application?.natsAccess;
  const resolvedApplicationNatsRule =
    application?.natsConfig?.natsRule ?? application?.natsRule;

  const microservices = application.microservices?.map((ms: any) => {
    let parsedConfig: any = {};
    try {
      parsedConfig =
        typeof ms?.config === "string"
          ? JSON.parse(ms.config)
          : ms.config || {};
    } catch (e) {
      console.warn(`Failed to parse config for ${ms.name}:`, e);
      parsedConfig = ms.config;
    }

    return {
      name: ms.name,
      agent: {
        name:
          activeAgents.find((a) => a.uuid === ms.iofogUuid)?.name ??
          reducedAgents.byUUID[ms.iofogUuid]?.name ??
          "__UNKNOWN__",
      },
      images: (ms.images || []).reduce(
        (acc: Record<string, unknown>, image: any) =>
          appendImageToYamlAcc(acc, image),
        {
          registry: ms.registryId ?? null,
          catalogId: ms.catalogItemId ?? null,
        },
      ),
      container: {
        annotations: JSON.parse(ms.annotations || "{}"),
        hostNetworkMode: ms.hostNetworkMode ?? false,
        isPrivileged: ms.isPrivileged ?? false,
        runAsUser: ms.runAsUser ?? null,
        ipcMode: ms?.ipcMode ?? "",
        pidMode: ms?.pidMode ?? "",
        platform: ms.platform ?? null,
        runtime: ms.runtime ?? null,
        cdiDevices: ms.cdiDevices ?? [],
        capAdd: ms.capAdd ?? [],
        capDrop: ms.capDrop ?? [],
        volumes: (ms.volumeMappings || []).map((vm: any) => {
          const { id, ...rest } = vm;
          return rest;
        }),
        env: (ms.env || []).map((env: any) => {
          const { id, ...rest } = env;
          const cleanedEnv: any = { ...rest };
          if (
            cleanedEnv.valueFromSecret === null ||
            cleanedEnv.valueFromSecret === undefined
          ) {
            delete cleanedEnv.valueFromSecret;
          }
          if (
            cleanedEnv.valueFromConfigMap === null ||
            cleanedEnv.valueFromConfigMap === undefined
          ) {
            delete cleanedEnv.valueFromConfigMap;
          }
          return cleanedEnv;
        }),
        extraHosts: (ms.extraHosts || []).map((eH: any) => {
          const { id, ...rest } = eH;
          return rest;
        }),
        ports: (ms.ports || []).map((p: any) => {
          if (p.host) {
            p.host = reducedAgents.byUUID[p.host]?.name || p.host;
          }
          return p;
        }),
        commands: Array.isArray(ms.cmd) ? [...ms.cmd] : [],
        cpuSetCpus: ms?.cpuSetCpus ?? "",
        ...(ms?.memoryLimit !== undefined &&
          ms?.memoryLimit !== null && { memoryLimit: ms.memoryLimit }),
        healthCheck: ms?.healthCheck ?? {},
      },
      schedule: ms?.schedule ?? 50,
      natsConfig: {
        natsAccess: ms?.natsConfig?.natsAccess ?? ms?.natsAccess ?? false,
        ...(ms?.natsConfig?.natsRule && { natsRule: ms.natsConfig.natsRule }),
      },
      config: parsedConfig,
    };
  });

  return {
    apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
    kind: "Application",
    metadata: {
      name: application.name,
    },
    spec: {
      ...(resolvedApplicationNatsAccess !== undefined ||
      resolvedApplicationNatsRule
        ? {
            natsConfig: {
              ...(resolvedApplicationNatsAccess !== undefined && {
                natsAccess: Boolean(resolvedApplicationNatsAccess),
              }),
              ...(resolvedApplicationNatsRule && {
                natsRule: resolvedApplicationNatsRule,
              }),
            },
          }
        : {}),
      microservices,
    },
  };
};

export const dumpApplicationYAML = (
  params: GetApplicationYAMLParams,
): string => {
  return yaml.dump(getApplicationYAMLFromJSON(params), {
    noRefs: true,
    lineWidth: 0,
    quotingType: '"',
    forceQuotes: false,
  });
};
