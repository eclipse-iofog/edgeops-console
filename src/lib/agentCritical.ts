type SystemApplication = {
  microservices?: Array<{
    iofogUuid?: string;
    isController?: boolean;
  }>;
};

type AgentRef = {
  uuid?: string;
  isSystem?: boolean;
  name?: string;
};

export function agentHostsControllerMs(
  agent: AgentRef | null | undefined,
  systemApplications: SystemApplication[] | undefined,
): boolean {
  if (!agent?.uuid) return false;
  return (systemApplications ?? []).some((app) =>
    (app.microservices ?? []).some(
      (ms) => ms.iofogUuid === agent.uuid && ms.isController === true,
    ),
  );
}

export function isCriticalAgent(
  agent: AgentRef | null | undefined,
  systemApplications: SystemApplication[] | undefined,
): boolean {
  return Boolean(agent?.isSystem) || agentHostsControllerMs(agent, systemApplications);
}

export const CRITICAL_AGENT_VERSION_WARNING =
  "This agent hosts system or controller workloads. You may not reach the controller during this operation.";

export const CRITICAL_AGENT_DELETE_WARNING =
  "Warning: This is a system or controller agent. Deleting it will break the entire cluster/system.";

export type VersionCommand = "upgrade" | "rollback";

export type VersionCommandConfig = {
  versionCommand: VersionCommand;
  semver?: string;
};

export function buildVersionCommandConfirmMessage(
  agentName: string,
  config: VersionCommandConfig,
): string {
  const action = config.versionCommand === "upgrade" ? "Upgrade" : "Rollback";
  const target = config.semver?.trim();
  if (target) {
    return `${action} agent "${agentName}" to ${target}?`;
  }
  return `${action} agent "${agentName}"?`;
}
