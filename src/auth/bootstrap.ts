import {
  clearTokens,
  hydrateTokensFromStorage,
  hasSession,
  setTokens,
  type TokenPair,
} from "./tokenStore";
import {
  applyLogoutSentinelIfPresent,
  hasLogoutSentinel,
  redirectToLoginAfterLogout,
} from "./logoutRedirect";

function buildHashUrl(origin: string, route: string): string {
  const path = route.startsWith("#") ? route.slice(1) : route;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}/#${normalized}`;
}

function hasOAuthTokenHash(hash: string): boolean {
  if (!hash || hash.length <= 1) {
    return false;
  }
  const params = new URLSearchParams(hash.slice(1));
  return params.has("accessToken");
}

function parseOAuthTokenHash(hash: string): TokenPair | null {
  if (!hasOAuthTokenHash(hash)) {
    return null;
  }
  const params = new URLSearchParams(hash.slice(1));
  const accessToken = params.get("accessToken");
  const refreshToken = params.get("refreshToken");
  if (!accessToken) {
    return null;
  }
  return {
    accessToken,
    refreshToken: refreshToken ?? undefined,
  };
}

function dispatchHashChange(): void {
  if (typeof HashChangeEvent !== "undefined") {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.dispatchEvent(new Event("hashchange"));
}

/**
 * Same-document navigation — keeps in-memory tokens (no full reload).
 */
function navigateWithoutReload(url: string): void {
  window.history.replaceState(null, "", url);
  dispatchHashChange();
}

function completeOAuthTokenLogin(
  hash: string,
  origin: string,
  search: string,
): boolean {
  const tokens = parseOAuthTokenHash(hash);
  if (!tokens) {
    return false;
  }

  setTokens(tokens);

  const params = new URLSearchParams(hash.slice(1));
  const postLoginRedirect =
    params.get("postLoginRedirect") ||
    new URLSearchParams(search).get("postLoginRedirect");

  const target = postLoginRedirect || "#/dashboard";
  navigateWithoutReload(buildHashUrl(origin, target));
  return true;
}

/**
 * Parse OAuth callback tokens from the current URL (defense-in-depth).
 * Returns true when tokens were consumed and the URL was cleaned up.
 */
export function tryConsumeOAuthCallbackFromLocation(): boolean {
  const { pathname, hash, origin, search } = window.location;

  if (!hash || hash.length <= 1 || !hasOAuthTokenHash(hash)) {
    return false;
  }

  const onLoginPath =
    pathname === "/login" ||
    pathname.endsWith("/login") ||
    pathname === "/";

  if (!onLoginPath) {
    return false;
  }

  return completeOAuthTokenLogin(hash, origin, search);
}

/**
 * OAuth BFF bootstrap (Plan 8.2):
 * - pathname `/login/oauth` → hash SPA route for embedded interaction UI
 * - pathname `/login` with SPA hash (`#/login`, `#/login/oauth`) → normalize to root hash route
 * - pathname `/login` with token hash → memory + sessionStorage store, navigate into app
 */
export function runAuthBootstrap(): void {
  const { pathname, hash, origin, search } = window.location;

  if (pathname === "/login/oauth" || pathname.endsWith("/login/oauth")) {
    navigateWithoutReload(`${origin}/#/login/oauth${search}`);
    return;
  }

  if (pathname === "/login" && hash.startsWith("#/")) {
    navigateWithoutReload(`${origin}${hash}${search}`);
    return;
  }

  tryConsumeOAuthCallbackFromLocation();
}

function clearSessionForBootstrap(): void {
  clearTokens();
}

/**
 * After explicit logout, drop resurrected tokens from bfcache or stale tabs.
 */
export function applyPostLogoutBootstrap(): void {
  applyLogoutSentinelIfPresent(clearSessionForBootstrap);
}

/**
 * bfcache can restore pre-logout in-memory auth; re-validate and hard-nav to login.
 */
export function installBfcacheSessionGuard(): void {
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) {
      return;
    }

    if (hasLogoutSentinel()) {
      applyLogoutSentinelIfPresent(clearSessionForBootstrap);
      redirectToLoginAfterLogout();
      return;
    }

    clearTokens();
    hydrateTokensFromStorage();
    if (!hasSession()) {
      redirectToLoginAfterLogout();
    }
  });
}
