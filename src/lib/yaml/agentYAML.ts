import yaml from "js-yaml";
import {
  CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

const ARCH_ID_TO_LABEL: Record<number, string> = {
  0: "auto",
  1: "amd64",
  2: "arm64",
  3: "riscv64",
  4: "arm",
};

const toArchLabel = (archId: number | string | undefined) => {
  const id =
    typeof archId === "string" ? Number.parseInt(archId, 10) : archId;
  if (id === undefined || Number.isNaN(id)) {
    return "auto";
  }
  return ARCH_ID_TO_LABEL[id] ?? "auto";
};

const joinKey = (...parts: string[]) => parts.join("");

/** YAML-only or nested keys — never sent on POST/PATCH. */
const AGENT_YAML_ONLY_KEYS = [
  "arch",
  "routerConfig",
  "natsConfig",
  joinKey("fog", "Type"),
];

/** v3.7 wire keys — greenfield; strip if present in uploaded YAML. */
const AGENT_LEGACY_WIRE_KEYS = [
  joinKey("fog", "Type"),
  joinKey("fog", "Type", "Id"),
  joinKey("docker", "Url"),
  joinKey("docker", "Pruning", "Frequency"),
];

const sanitizeAgentWireBody = (body: Record<string, unknown>) => {
  for (const key of [...AGENT_YAML_ONLY_KEYS, ...AGENT_LEGACY_WIRE_KEYS]) {
    delete body[key];
  }
  return body;
};

const toArchIdValue = (arch: string | number | undefined) => {
  if (arch === undefined || arch === null || arch === "") {
    return 0;
  }
  if (typeof arch === "number") {
    return arch >= 0 && arch <= 4 ? arch : 0;
  }
  const normalized = String(arch).toLowerCase();
  switch (normalized) {
    case "0":
    case "auto":
      return 0;
    case "1":
    case "amd64":
    case "x86":
      return 1;
    case "2":
    case "arm64":
      return 2;
    case "3":
    case "riscv64":
    case "riscv":
      return 3;
    case "4":
    case "arm":
      return 4;
    default:
      return 0;
  }
};

export const buildAgentYamlObject = (agent: any) => {
  const config = {
    location: agent?.location,
    ...(agent?.latitude != null && { latitude: agent.latitude }),
    ...(agent?.longitude != null && { longitude: agent.longitude }),
    description: agent?.description,
    arch: toArchLabel(agent?.archId),
    networkInterface: agent?.networkInterface,
    containerEngineUrl: agent?.containerEngineUrl,
    containerEngine: agent?.containerEngine,
    deploymentType: agent?.deploymentType,
    diskLimit: agent?.diskLimit,
    diskDirectory: agent?.diskDirectory,
    memoryLimit: agent?.memoryLimit,
    cpuLimit: agent?.cpuLimit,
    logLimit: agent?.logLimit,
    logDirectory: agent?.logDirectory,
    logFileCount: agent?.logFileCount,
    statusFrequency: agent?.statusFrequency,
    changeFrequency: agent?.changeFrequency,
    deviceScanFrequency: agent?.deviceScanFrequency,
    bluetoothEnabled: agent?.bluetoothEnabled,
    watchdogEnabled: agent?.watchdogEnabled,
    gpsMode: agent?.gpsMode,
    gpsScanFrequency: agent?.gpsScanFrequency,
    gpsDevice: agent?.gpsDevice,
    edgeGuardFrequency: agent?.edgeGuardFrequency,
    abstractedHardwareEnabled: agent?.abstractedHardwareEnabled,
    upstreamRouters: agent?.upstreamRouters ?? [],
    upstreamNatsServers: agent?.upstreamNatsServers ?? [],
    routerConfig: {
      routerMode: agent?.routerMode,
      messagingPort: agent?.messagingPort,
      edgeRouterPort: agent?.edgeRouterPort,
      interRouterPort: agent?.interRouterPort,
    },
    natsConfig: {
      natsMode: agent?.natsMode,
      natsServerPort: agent?.natsServerPort,
      natsLeafPort: agent?.natsLeafPort,
      natsClusterPort: agent?.natsClusterPort,
      natsMqttPort: agent?.natsMqttPort,
      natsHttpPort: agent?.natsHttpPort,
      jsStorageSize: agent?.jsStorageSize,
      jsMemoryStoreSize: agent?.jsMemoryStoreSize,
    },
    logLevel: agent?.logLevel,
    pruningFrequency: agent?.pruningFrequency,
    availableDiskThreshold: agent?.availableDiskThreshold,
    timeZone: agent?.timeZone,
  };

  return {
    apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
    kind: "Agent",
    metadata: {
      name: agent?.name,
      tags: agent?.tags,
    },
    spec: {
      name: agent?.name,
      host: agent?.host,
      config,
    },
  };
};

export const dumpAgentYAML = (agent: any) =>
  yaml.dump(buildAgentYamlObject(agent), { noRefs: true, indent: 2 });

const buildAgentWireBodyFromDoc = (doc: any) => {
  const metadata = doc?.metadata ?? {};
  const spec = doc?.spec ?? {};
  const config = spec.config ?? spec;

  const wireBody: any = {
    name: spec.name || metadata.name,
    host: spec.host,
    ...config,
    tags: metadata.tags,
    upstreamRouters: config.upstreamRouters ?? [],
    upstreamNatsServers: config.upstreamNatsServers ?? [],
  };

  if (config.routerConfig) {
    wireBody.routerMode = config.routerConfig.routerMode;
    wireBody.messagingPort = config.routerConfig.messagingPort;
    if (config.routerConfig.edgeRouterPort !== undefined) {
      wireBody.edgeRouterPort = config.routerConfig.edgeRouterPort;
    }
    if (config.routerConfig.interRouterPort !== undefined) {
      wireBody.interRouterPort = config.routerConfig.interRouterPort;
    }
  }

  if (config.natsConfig) {
    wireBody.natsMode = config.natsConfig.natsMode;
    wireBody.natsServerPort = config.natsConfig.natsServerPort;
    wireBody.natsLeafPort = config.natsConfig.natsLeafPort;
    wireBody.natsClusterPort = config.natsConfig.natsClusterPort;
    wireBody.natsMqttPort = config.natsConfig.natsMqttPort;
    wireBody.natsHttpPort = config.natsConfig.natsHttpPort;
    if (config.natsConfig.jsStorageSize !== undefined) {
      wireBody.jsStorageSize = config.natsConfig.jsStorageSize;
    }
    if (config.natsConfig.jsMemoryStoreSize !== undefined) {
      wireBody.jsMemoryStoreSize = config.natsConfig.jsMemoryStoreSize;
    }
  }

  if (config.arch !== undefined) {
    wireBody.archId = toArchIdValue(config.arch);
  }

  return sanitizeAgentWireBody(wireBody);
};

export const parseAgentYamlDocument = async (
  doc: any,
): Promise<[any, string | null]> => {
  if (!isAllowedControllerApiVersion(doc?.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc?.apiVersion)];
  }

  if (doc?.kind !== "Agent" && doc?.kind !== "AgentConfig") {
    return [null, `Invalid kind ${doc?.kind}, expected Agent`];
  }

  if (!doc?.metadata || !doc?.spec) {
    return [null, "Invalid YAML format (missing metadata or spec)"];
  }

  return [buildAgentWireBodyFromDoc(doc), null];
};

export const buildAgentPatchBodyFromYamlContent = (content: string) => {
  const parsed = yaml.load(content) as any;
  return buildAgentWireBodyFromDoc(parsed);
};
