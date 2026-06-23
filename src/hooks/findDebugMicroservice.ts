type SystemApplication = {
  name?: string;
  microservices?: Array<{
    uuid?: string;
    name?: string;
    iofogUuid?: string;
  }>;
};

export const findDebugMicroservice = (
  nodeUuid: string,
  agentName: string | undefined,
  systemApplications: SystemApplication[],
): string | null => {
  if (!agentName) return null;

  const systemApp = systemApplications.find(
    (app) => app.name === `system-${agentName}`,
  );
  if (!systemApp) return null;

  const debugMs = (systemApp.microservices || []).find(
    (ms) =>
      ms.iofogUuid === nodeUuid &&
      (ms.name === "debug" || ms.name === `debug-${nodeUuid}`),
  );

  return debugMs?.uuid ?? null;
};
