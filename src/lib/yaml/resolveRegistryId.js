const REGISTRY_ALIASES = {
  remote: 1,
  local: 2,
};

export function resolveRegistryId(registry, defaultId = 1) {
  if (registry === null || registry === undefined || registry === "") {
    return defaultId;
  }

  if (typeof registry === "number") {
    return registry;
  }

  const alias = REGISTRY_ALIASES[registry];
  if (alias !== undefined) {
    return alias;
  }

  const parsed = parseInt(registry, 10);
  return Number.isNaN(parsed) ? defaultId : parsed;
}
