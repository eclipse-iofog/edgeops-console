import { getApiBase } from "./apiBase";
import {
  getHashRoute,
  getPendingPostLoginRedirect,
} from "./postLoginRedirect";

export function buildOAuthAuthorizeUrl(): string | null {
  const config = window.controllerConfig;
  if (!config?.auth?.oauthAuthorizeUrl) {
    return null;
  }

  const base = getApiBase(config);
  const path = config.auth.oauthAuthorizeUrl.startsWith("/")
    ? config.auth.oauthAuthorizeUrl
    : `/${config.auth.oauthAuthorizeUrl}`;
  const url = new URL(`${base}${path}`);

  const redirect =
    getPendingPostLoginRedirect() ??
    (getHashRoute() !== "/login" && getHashRoute() !== "/login/oauth"
      ? getHashRoute()
      : null);
  if (redirect && redirect !== "/login") {
    const hashTarget = redirect.startsWith("#")
      ? redirect
      : `#${redirect.replace(/^\//, "/")}`;
    url.searchParams.set("postLoginRedirect", hashTarget);
  }

  return url.toString();
}

export function redirectToOAuthSignIn(): void {
  const url = buildOAuthAuthorizeUrl();
  if (url) {
    window.location.href = url;
  }
}
