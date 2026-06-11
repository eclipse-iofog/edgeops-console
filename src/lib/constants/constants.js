/* eslint-disable import/no-anonymous-default-export */

export const CONTROLLER_API_VERSION_DATASANCE = "datasance.com/v3";
export const CONTROLLER_API_VERSION_IOFOG = "iofog.org/v3";

/** Accept on import / parse (YAML may use either group). */
export const ALLOWED_CONTROLLER_API_VERSIONS = [
  CONTROLLER_API_VERSION_DATASANCE,
  CONTROLLER_API_VERSION_IOFOG,
];

const distribution =
  import.meta.env.VITE_DISTRIBUTION === "iofog" ? "iofog" : "datasance";

/** Always use for display, export, and newly generated YAML (per build flavor). */
export const CANONICAL_DISPLAY_CONTROLLER_API_VERSION =
  distribution === "iofog"
    ? CONTROLLER_API_VERSION_IOFOG
    : CONTROLLER_API_VERSION_DATASANCE;

/** Alias: same as canonical display for the active build flavor. */
export const DEFAULT_CONTROLLER_API_VERSION =
  CANONICAL_DISPLAY_CONTROLLER_API_VERSION;

/** Backward-compatible name used across Workloads and unified parser. */
export const API_VERSIONS = ALLOWED_CONTROLLER_API_VERSIONS;

export function isAllowedControllerApiVersion(v) {
  return ALLOWED_CONTROLLER_API_VERSIONS.includes(v);
}

export function invalidControllerApiVersionMessage(docApiVersion) {
  return `Invalid API Version ${docApiVersion}, expected one of: ${ALLOWED_CONTROLLER_API_VERSIONS.join(", ")}`;
}

export default {
  API_VERSIONS,
  ALLOWED_CONTROLLER_API_VERSIONS,
  CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
  DEFAULT_CONTROLLER_API_VERSION,
  CONTROLLER_API_VERSION_DATASANCE,
  CONTROLLER_API_VERSION_IOFOG,
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
};
