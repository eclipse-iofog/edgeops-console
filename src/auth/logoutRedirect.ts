const LOGOUT_SENTINEL_KEY = "edgeops-console.auth.logout-at";

export function buildLogoutRedirectUrl(origin = window.location.origin): string {
  return `${origin}/login`;
}

export function redirectToLoginAfterLogout(origin = window.location.origin): void {
  window.location.replace(buildLogoutRedirectUrl(origin));
}

/** Survives bfcache and signals other tabs that the session was torn down. */
export function markLogoutSentinel(): void {
  try {
    localStorage.setItem(LOGOUT_SENTINEL_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable
  }
}

export function hasLogoutSentinel(): boolean {
  try {
    return localStorage.getItem(LOGOUT_SENTINEL_KEY) !== null;
  } catch {
    return false;
  }
}

export function consumeLogoutSentinel(): boolean {
  try {
    const value = localStorage.getItem(LOGOUT_SENTINEL_KEY);
    if (!value) {
      return false;
    }
    localStorage.removeItem(LOGOUT_SENTINEL_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Drop resurrected tokens after an explicit logout (hard nav or bfcache restore).
 */
export function applyLogoutSentinelIfPresent(clearSession: () => void): boolean {
  if (!hasLogoutSentinel()) {
    return false;
  }
  clearSession();
  consumeLogoutSentinel();
  return true;
}
