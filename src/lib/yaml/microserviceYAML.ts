import yaml from "js-yaml";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";
import { appendImageToYamlAcc } from "@/lib/imageArchYAML";
import { isTemplatePlaceholder } from "./yamlTemplatePlaceholders";

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

export interface BuildMicroserviceYamlOptions {
  activeAgents?: Agent[];
  reducedAgents?: ReducedAgents;
  includeName?: boolean;
  includeUuid?: boolean;
  includeApplication?: boolean;
  includeAgent?: boolean;
  templateMode?: boolean;
}

export const MICROSERVICE_CONTAINER_YAML_KEYS = [
  "hostNetworkMode",
  "isPrivileged",
  "runAsUser",
  "runAsGroup",
  "readOnlyRootFilesystem",
  "ipcMode",
  "pidMode",
  "platform",
  "runtime",
  "capAdd",
  "capDrop",
  "annotations",
  "sysctls",
  "ulimits",
  "cpuSetCpus",
  "cpus",
  "memoryLimit",
  "memoryReservation",
  "memorySwap",
  "shmSize",
  "cdiDevices",
  "devices",
  "volumes",
  "tmpfs",
  "extraHosts",
  "env",
  "ports",
  "workingDir",
  "entrypoint",
  "commands",
  "healthCheck",
] as const;

const CONTAINER_NUMBER_COMMENTS: Record<string, string> = {
  cpus: "float number of CPU",
  memoryLimit: "MiB",
  memoryReservation: "MiB",
  memorySwap: "MiB; -1 = unlimited",
  shmSize: "MiB",
};

const YAML_DUMP_OPTIONS: yaml.DumpOptions = {
  noRefs: true,
  indent: 2,
  lineWidth: 0,
  quotingType: '"',
  forceQuotes: false,
};

export const resolveDumpCommands = (ms: any): unknown[] => {
  if (Array.isArray(ms?.commands)) {
    return [...ms.commands];
  }
  if (Array.isArray(ms?.cmd)) {
    return [...ms.cmd];
  }
  return [];
};

const asString = (value: unknown): string => {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
};

const dumpBoolean = (value: unknown, fallback = false): unknown => {
  if (isTemplatePlaceholder(value)) {
    return value;
  }
  if (value === true || value === false) {
    return value;
  }
  return fallback;
};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const asObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const asNumberOrEmpty = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const dumpNumberOrEmpty = (value: unknown): unknown => {
  if (isTemplatePlaceholder(value)) {
    return value;
  }
  return asNumberOrEmpty(value);
};

const dumpString = (value: unknown): unknown => {
  if (isTemplatePlaceholder(value)) {
    return value;
  }
  return asString(value);
};

const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value) {
    try {
      const parsed = JSON.parse(value);
      return asObject(parsed);
    } catch {
      return {};
    }
  }
  return {};
};

const parseConfig = (value: unknown): unknown => {
  if (value && typeof value === "object") {
    return value;
  }
  if (typeof value === "string" && value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.warn("Failed to parse microservice.config:", e);
      return value;
    }
  }
  return {};
};

const dumpModels = (models: unknown): Record<string, unknown> => {
  if (!models || typeof models !== "object" || Array.isArray(models)) {
    return {};
  }
  const catalog = models as Record<string, unknown>;
  const hasItems =
    Array.isArray(catalog.items) && (catalog.items as unknown[]).length > 0;
  if (hasItems || catalog.bindPath || catalog.permissions) {
    return catalog;
  }
  return {};
};

const resolveAgentName = (
  ms: any,
  activeAgents: Agent[],
  reducedAgents: ReducedAgents,
): string =>
  activeAgents.find((a) => a.uuid === ms.iofogUuid)?.name ??
  reducedAgents.byUUID[ms.iofogUuid]?.name ??
  ms.agentName ??
  "__UNKNOWN__";

const buildImagesYaml = (ms: any): Record<string, unknown> => {
  const acc: Record<string, unknown> = {};
  if (ms.registryId != null && ms.registryId !== "") {
    acc.registry = ms.registryId;
  }
  if (ms.catalogItemId != null && ms.catalogItemId !== "") {
    acc.catalogId = ms.catalogItemId;
  }
  return (ms.images || []).reduce(
    (next: Record<string, unknown>, image: any) =>
      appendImageToYamlAcc(next, image),
    acc,
  );
};

const cleanEnv = (env: any) => {
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
};

export const buildMicroserviceContainerYaml = (
  ms: any,
  reducedAgents: ReducedAgents = { byUUID: {} },
): Record<string, unknown> => {
  const container: Record<string, unknown> = {
    hostNetworkMode: dumpBoolean(ms?.hostNetworkMode),
    isPrivileged: dumpBoolean(ms?.isPrivileged),
    runAsUser: dumpString(ms?.runAsUser),
    runAsGroup: dumpString(ms?.runAsGroup),
    readOnlyRootFilesystem: dumpBoolean(ms?.readOnlyRootFilesystem),
    ipcMode: dumpString(ms?.ipcMode),
    pidMode: dumpString(ms?.pidMode),
    platform: dumpString(ms?.platform),
    runtime: dumpString(ms?.runtime),
    capAdd: asArray(ms?.capAdd),
    capDrop: asArray(ms?.capDrop),
    annotations: parseJsonObject(ms?.annotations),
    sysctls: asObject(ms?.sysctls),
    ulimits: asObject(ms?.ulimits),
    cpuSetCpus: dumpString(ms?.cpuSetCpus),
    cpus: dumpNumberOrEmpty(ms?.cpus),
    memoryLimit: dumpNumberOrEmpty(ms?.memoryLimit),
    memoryReservation: dumpNumberOrEmpty(ms?.memoryReservation),
    memorySwap: dumpNumberOrEmpty(ms?.memorySwap),
    shmSize: dumpNumberOrEmpty(ms?.shmSize),
    cdiDevices: asArray(ms?.cdiDevices),
    devices: asArray(ms?.devices),
    volumes: asArray(ms?.volumeMappings).map((vm: any) => {
      const { id, ...rest } = vm;
      return rest;
    }),
    tmpfs: asArray(ms?.tmpfs),
    extraHosts: asArray(ms?.extraHosts).map((eH: any) => {
      const { id, ...rest } = eH;
      return rest;
    }),
    env: asArray(ms?.env).map(cleanEnv),
    ports: asArray(ms?.ports).map((p: any) => {
      const port = { ...p };
      if (port.host) {
        port.host = reducedAgents.byUUID[port.host]?.name || port.host;
      }
      return port;
    }),
    workingDir: dumpString(ms?.workingDir),
    entrypoint: asArray(ms?.entrypoint),
    commands: resolveDumpCommands(ms),
    healthCheck: asObject(ms?.healthCheck),
  };
  return container;
};

export const buildMicroserviceYamlFields = (
  ms: any,
  options: BuildMicroserviceYamlOptions = {},
): Record<string, unknown> => {
  const activeAgents = options.activeAgents ?? [];
  const reducedAgents = options.reducedAgents ?? { byUUID: {} };
  const spec: Record<string, unknown> = {};

  if (options.includeName) {
    spec.name = ms?.name ?? "";
  }
  if (ms?.template) {
    spec.template = ms.template;
  }
  if (options.includeUuid && ms?.uuid) {
    spec.uuid = ms.uuid;
  }
  if (options.includeApplication) {
    spec.application = dumpString(ms?.application);
  } else if (options.templateMode && ms?.application) {
    spec.application = dumpString(ms.application);
  }
  if (options.includeAgent !== false) {
    spec.agent = {
      name: resolveAgentName(ms, activeAgents, reducedAgents),
    };
  } else if (
    options.templateMode &&
    (ms?.agentName || ms?.agent?.name)
  ) {
    spec.agent = {
      name: resolveAgentName(ms, activeAgents, reducedAgents),
    };
  }

  spec.images = buildImagesYaml(ms);
  const natsAccess = ms?.natsConfig?.natsAccess ?? ms?.natsAccess;
  spec.natsConfig = {
    natsAccess: dumpBoolean(natsAccess),
    ...(ms?.natsConfig?.natsRule
      ? { natsRule: ms.natsConfig.natsRule }
      : {}),
  };
  spec.models = dumpModels(ms?.models);
  spec.container = buildMicroserviceContainerYaml(ms, reducedAgents);
  spec.schedule = ms?.schedule ?? 50;
  spec.config = parseConfig(ms?.config);

  if (ms?.serviceAccount?.roleRef) {
    spec.serviceAccount = {
      roleRef: ms.serviceAccount.roleRef,
    };
  }
  if (ms?.rebuild === true) {
    spec.rebuild = true;
  }

  return spec;
};

export const annotateContainerNumberFields = (dumped: string): string => {
  const keys = Object.keys(CONTAINER_NUMBER_COMMENTS).join("|");
  return dumped.replace(
    new RegExp(`^([ \\t]*)(${keys}):(?:[ \\t]+(\\S.*?))?[ \\t]*$`, "gm"),
    (match, indent: string, key: string, value?: string) => {
      const comment = CONTAINER_NUMBER_COMMENTS[key];
      if (!value || value === "null" || value === "~") {
        return `${indent}${key}:  # ${comment}`;
      }
      if (value.includes("#")) {
        return match;
      }
      return `${indent}${key}: ${value}  # ${comment}`;
    },
  );
};

export const dumpAnnotatedYaml = (
  doc: unknown,
  options?: yaml.DumpOptions,
): string =>
  annotateContainerNumberFields(
    yaml.dump(doc, { ...YAML_DUMP_OPTIONS, ...options }),
  );

export const getMicroserviceYAMLFromJSON = ({
  microservice,
  activeAgents = [],
  reducedAgents = { byUUID: {} },
}: GetYAMLParams) => {
  if (!microservice) return {};

  return {
    apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
    kind: "Microservice",
    metadata: {
      name: microservice.name,
    },
    spec: buildMicroserviceYamlFields(microservice, {
      activeAgents,
      reducedAgents,
      includeUuid: true,
      includeApplication: true,
      includeAgent: true,
    }),
  };
};

export const dumpMicroserviceYAML = (params: GetYAMLParams) => {
  return dumpAnnotatedYaml(getMicroserviceYAMLFromJSON(params));
};
