export type AuthMode = "embedded" | "external";

function getConfig(): ControllerConfig {
  return (
    window.controllerConfig ?? {
      publicUrl: "",
      auth: {
        mode: "embedded",
      } as ControllerAuthConfig,
    }
  );
}

export function getAuthMode(): AuthMode | undefined {
  return getConfig().auth?.mode;
}

export function isEmbeddedAuthMode(): boolean {
  return getAuthMode() === "embedded";
}

export function isBrowserOAuthLogin(): boolean {
  return true;
}

export function getconsoleUrl(config: ControllerConfig = getConfig()): string {
  const viewer = (config.consoleUrl || config.publicUrl || "").trim();
  if (!viewer) {
    return window.location.origin;
  }
  if (!/^https?:\/\//i.test(viewer)) {
    return `http://${viewer.replace(/\/+$/, "")}`;
  }
  return viewer.replace(/\/+$/, "");
}

export function getApiBase(config: ControllerConfig): string {
  let base = (config.publicUrl || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = `http://${base}`;
  }
  return base;
}

export function getApiV3Base(config: ControllerConfig): string {
  return `${getApiBase(config)}/api/v3`;
}

export function getWsBase(config: ControllerConfig): string {
  const u = new URL(getApiBase(config));
  const protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${u.host}`;
}
