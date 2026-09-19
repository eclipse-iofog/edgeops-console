export const MICROSERVICE_DELETE_MESSAGE =
  "This action will remove the microservice from the system. Volume data on the node is not deleted. This is not reversible.";

export const VOLUME_MAPPING_DELETE_MESSAGE =
  "This action will remove the volume mapping from the microservice. Volume data on the node is not deleted. This is not reversible.";

export const displayVolumeMappingScope = (scope: unknown): string => {
  if (typeof scope === "string" && scope.trim()) {
    return scope.trim().toLowerCase();
  }
  return "private";
};

export const canDeleteVolumeMapping = (type: unknown): boolean =>
  type !== "serviceAccount";

export const toVolumeMappingRow = (volume: any, index: number) => ({
  id: volume?.id,
  host: volume?.hostDestination,
  container: volume?.containerDestination,
  accessMode: volume?.accessMode,
  type: volume?.type || "-",
  scope: displayVolumeMappingScope(volume?.scope),
  key: `${volume?.hostDestination}-${volume?.containerDestination}-${index}`,
});
