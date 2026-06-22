import type { AuthProfile } from "./AuthContext";

let pendingPostLoginRedirect: string | null = null;

export function getPendingPostLoginRedirect(): string | null {
  return pendingPostLoginRedirect;
}

export function getHashRoute(): string {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const route = raw.split("?")[0];
  return route ? `/${route}` : "/dashboard";
}

export function capturePostLoginRedirect(): void {
  const route = getHashRoute();
  if (
    route !== "/login" &&
    route !== "/login/oauth" &&
    route !== "/"
  ) {
    pendingPostLoginRedirect = route;
  }
}

export function consumePostLoginRedirect(): string | null {
  const target = pendingPostLoginRedirect;
  pendingPostLoginRedirect = null;
  return target;
}

/** Drop any captured deep link so the next login does not inherit it. */
export function clearPostLoginRedirect(): void {
  pendingPostLoginRedirect = null;
}

export function requiresPasswordChange(profile: AuthProfile): boolean {
  return profile.mustChangePassword === true;
}

export function resolvePostLoginGateRoute(profile: AuthProfile): string | null {
  if (requiresPasswordChange(profile)) {
    return "/account/force-password-change";
  }
  return null;
}

export function resolvePostLoginRoute(
  profile: AuthProfile,
  pendingRedirect: string | null,
): string {
  const gate = resolvePostLoginGateRoute(profile);
  if (gate) {
    return gate;
  }
  if (pendingRedirect && pendingRedirect !== "/login") {
    return pendingRedirect;
  }
  return "/dashboard";
}

export function navigateToHashRoute(route: string): void {
  const path = route.startsWith("#") ? route : `#${route}`;
  window.location.replace(
    `${window.location.origin}/#${path.replace(/^#\/?/, "/")}`,
  );
}
